-- =======================================================================================
-- PHASE 6.7: FUNDS + DEBTS CLOUD RLS
-- =======================================================================================

-- 1. Enable RLS
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- 2. Funds RLS
-- SELECT: Admins and Adults can view.
CREATE POLICY "Admins/Adults can view funds" ON public.funds
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- INSERT/UPDATE/DELETE: Admins and Adults can modify
CREATE POLICY "Admins/Adults can manage funds" ON public.funds
FOR ALL USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- 3. Debts RLS
CREATE POLICY "Admins/Adults can view debts" ON public.debts
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admins/Adults can manage debts" ON public.debts
FOR ALL USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- 4. Fund Transactions & Debt Payments RLS
-- Read access to admins and adults
CREATE POLICY "Admins/Adults can view fund transactions" ON public.fund_transactions
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admins/Adults can view debt payments" ON public.debt_payments
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- Modifications happen via Triggers (from transactions), but allow direct inserts for DB integrity if needed by admins
CREATE POLICY "Admins/Adults can manage fund transactions" ON public.fund_transactions
FOR ALL USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admins/Adults can manage debt payments" ON public.debt_payments
FOR ALL USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);
