-- =======================================================================================
-- PHASE 6.6: BUDGETS CLOUD RLS & CONSTRAINTS
-- =======================================================================================

-- 1. Ensure Constraints
-- Ensure unique (family_id, month) to prevent duplicate budgets for the same month
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_family_id_month_key;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_family_id_month_key UNIQUE (family_id, month);

-- Ensure unique (budget_id, category_id) on budget_categories
ALTER TABLE public.budget_categories DROP CONSTRAINT IF EXISTS budget_categories_budget_id_category_id_key;
ALTER TABLE public.budget_categories ADD CONSTRAINT budget_categories_budget_id_category_id_key UNIQUE (budget_id, category_id);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for Budgets
-- SELECT: Admins and Adults can view. Children cannot view the overall family budget.
CREATE POLICY "Admins/Adults can view budgets" ON public.budgets
FOR SELECT USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- INSERT/UPDATE/DELETE: Admins and Adults can modify
CREATE POLICY "Admins/Adults can insert budgets" ON public.budgets
FOR INSERT WITH CHECK (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admins/Adults can update budgets" ON public.budgets
FOR UPDATE USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

CREATE POLICY "Admins/Adults can delete budgets" ON public.budgets
FOR DELETE USING (
    family_id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
);

-- 3. RLS Policies for Budget Categories
CREATE POLICY "Admins/Adults can view budget categories" ON public.budget_categories
FOR SELECT USING (
    budget_id IN (
        SELECT id FROM public.budgets 
        WHERE family_id = public.get_user_family_id(auth.uid()) 
        AND public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
    )
);

CREATE POLICY "Admins/Adults can insert budget categories" ON public.budget_categories
FOR INSERT WITH CHECK (
    budget_id IN (
        SELECT id FROM public.budgets 
        WHERE family_id = public.get_user_family_id(auth.uid()) 
        AND public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
    )
);

CREATE POLICY "Admins/Adults can update budget categories" ON public.budget_categories
FOR UPDATE USING (
    budget_id IN (
        SELECT id FROM public.budgets 
        WHERE family_id = public.get_user_family_id(auth.uid()) 
        AND public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
    )
);

CREATE POLICY "Admins/Adults can delete budget categories" ON public.budget_categories
FOR DELETE USING (
    budget_id IN (
        SELECT id FROM public.budgets 
        WHERE family_id = public.get_user_family_id(auth.uid()) 
        AND public.get_user_role(auth.uid(), family_id) IN ('admin', 'adult')
    )
);
