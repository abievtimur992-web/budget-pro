-- =======================================================================================
-- PHASE 6.4: ACCOUNTS CLOUD RLS
-- =======================================================================================

-- 1. Accounts Policy
CREATE POLICY "Users can view accounts" ON public.accounts
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND
    (
        public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult') 
        OR 
        (
            public.get_user_role(auth.uid(), family_id) = 'child' AND 
            id IN (SELECT unnest(allowed_accounts) FROM public.family_members WHERE user_id = auth.uid() AND family_id = public.get_user_family_id(auth.uid()))
        )
    )
);

CREATE POLICY "Admin/Adult can insert accounts" ON public.accounts
FOR INSERT WITH CHECK (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admin/Adult can update accounts" ON public.accounts
FOR UPDATE USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admin/Adult can delete accounts" ON public.accounts
FOR DELETE USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);
