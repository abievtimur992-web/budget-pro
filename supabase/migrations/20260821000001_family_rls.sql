-- =======================================================================================
-- PHASE 6.3: FAMILY RLS, ROLES & CHILD PERMISSIONS
-- =======================================================================================

-- 1. Enable RLS on core tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions (Avoid Recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID, p_family_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role 
    FROM public.family_members 
    WHERE user_id = p_user_id AND family_id = p_family_id AND status = 'active'
    LIMIT 1;
    RETURN v_role;
END;
$$;
REVOKE ALL ON FUNCTION public.get_user_role(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO authenticated;

-- 3. Families Policy
CREATE POLICY "Users can view own family" ON public.families
FOR SELECT USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can create family" ON public.families
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin can update family
CREATE POLICY "Admins can update family" ON public.families
FOR UPDATE USING (id = public.get_user_family_id(auth.uid()) AND public.get_user_role(auth.uid(), id) = 'admin');

-- 4. Family Members Policy
CREATE POLICY "Users can view family members" ON public.family_members
FOR SELECT USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Admins can insert members" ON public.family_members
FOR INSERT WITH CHECK (family_id = public.get_user_family_id(auth.uid()) AND public.get_user_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Admins can update members" ON public.family_members
FOR UPDATE USING (family_id = public.get_user_family_id(auth.uid()) AND public.get_user_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Users can insert themselves on creation/accept" ON public.family_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. Child Transactions Restriction (RLS)
CREATE POLICY "View transactions (Child sees only own, Adult/Admin sees all)" ON public.transactions
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND
    (
        public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult') 
        OR 
        (public.get_user_role(auth.uid(), family_id) = 'child' AND created_by = auth.uid())
    )
);

CREATE POLICY "Insert transactions (Child limits applied)" ON public.transactions
FOR INSERT WITH CHECK (
    family_id = public.get_user_family_id(auth.uid()) AND
    created_by = auth.uid() AND
    (
        public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult') 
        OR 
        (
            public.get_user_role(auth.uid(), family_id) = 'child' AND
            account_id IN (SELECT unnest(allowed_accounts) FROM public.family_members WHERE user_id = auth.uid() AND family_id = public.get_user_family_id(auth.uid())) AND
            category_id IN (SELECT unnest(allowed_categories) FROM public.family_members WHERE user_id = auth.uid() AND family_id = public.get_user_family_id(auth.uid()))
        )
    )
);

-- 6. Child Monthly Limit Check (Trigger)
CREATE OR REPLACE FUNCTION check_child_monthly_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_role TEXT;
    v_limit NUMERIC;
    v_spent NUMERIC;
BEGIN
    SELECT role, monthly_limit INTO v_role, v_limit 
    FROM public.family_members 
    WHERE user_id = NEW.created_by AND family_id = NEW.family_id;
    
    IF v_role = 'child' THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_spent 
        FROM public.transactions 
        WHERE created_by = NEW.created_by AND family_id = NEW.family_id AND type = 'expense' AND date_trunc('month', date) = date_trunc('month', NEW.date);
        
        IF (v_spent + NEW.amount) > v_limit THEN
            RAISE EXCEPTION 'Child monthly limit exceeded';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_child_monthly_limit() FROM PUBLIC;

CREATE TRIGGER enforce_child_monthly_limit
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION check_child_monthly_limit();
