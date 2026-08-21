-- =======================================================================================
-- PHASE 6.1: SUPABASE PROJECT FOUNDATION & DATABASE SCHEMA
-- =======================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CORE TABLES (Soft Delete on Families)
-- ==========================================

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    default_currency TEXT DEFAULT 'UZS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'adult', 'child')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
    -- Child Spending Policy
    allowed_accounts UUID[] DEFAULT '{}',
    allowed_categories TEXT[] DEFAULT '{}',
    monthly_limit NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. FINANCIAL TABLES (Source of Truth)
-- ==========================================

CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT DEFAULT 'UZS',
    balance NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    total_income NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, month)
);

CREATE TABLE public.budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    limit_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(budget_id, category_id)
);

CREATE TABLE public.funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    monthly_contribution NUMERIC DEFAULT 0,
    priority INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC DEFAULT 0,
    minimum_payment NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_transaction_id UUID UNIQUE NOT NULL, -- Duplicate protection / Idempotency
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category_id TEXT, -- SET NULL effectively in app logic if categories are dynamic
    comment TEXT,
    date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. BRIDGE TABLES (Strict Integrity)
-- ==========================================

CREATE TABLE public.fund_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE RESTRICT,
    transaction_id UUID UNIQUE NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE RESTRICT,
    transaction_id UUID UNIQUE NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL,
    principal_portion NUMERIC DEFAULT 0,
    interest_portion NUMERIC DEFAULT 0,
    payment_date TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. CROSS-FAMILY INTEGRITY TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION check_cross_family_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- For debt_payments
    IF TG_TABLE_NAME = 'debt_payments' THEN
        IF (SELECT family_id FROM public.debts WHERE id = NEW.debt_id) != NEW.family_id THEN
            RAISE EXCEPTION 'Cross-family reference detected for debt_id';
        END IF;
        IF (SELECT family_id FROM public.transactions WHERE id = NEW.transaction_id) != NEW.family_id THEN
            RAISE EXCEPTION 'Cross-family reference detected for transaction_id';
        END IF;
    END IF;

    -- For fund_transactions
    IF TG_TABLE_NAME = 'fund_transactions' THEN
        IF (SELECT family_id FROM public.funds WHERE id = NEW.fund_id) != NEW.family_id THEN
            RAISE EXCEPTION 'Cross-family reference detected for fund_id';
        END IF;
        IF (SELECT family_id FROM public.transactions WHERE id = NEW.transaction_id) != NEW.family_id THEN
            RAISE EXCEPTION 'Cross-family reference detected for transaction_id';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_debt_payment_integrity
BEFORE INSERT OR UPDATE ON public.debt_payments
FOR EACH ROW EXECUTE FUNCTION check_cross_family_integrity();

CREATE TRIGGER check_fund_transaction_integrity
BEFORE INSERT OR UPDATE ON public.fund_transactions
FOR EACH ROW EXECUTE FUNCTION check_cross_family_integrity();


-- ==========================================
-- 5. ACCOUNT BALANCE ATOMIC LOGIC
-- ==========================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Re-calculate balance on INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'income' OR NEW.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
        ELSIF NEW.type = 'expense' OR NEW.type = 'fund_contribution' OR NEW.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
            UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.to_account_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Re-calculate balance on DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.type = 'income' OR OLD.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
        ELSIF OLD.type = 'expense' OR OLD.type = 'fund_contribution' OR OLD.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
            UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.to_account_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Re-calculate balance on UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Revert OLD
        IF OLD.type = 'income' OR OLD.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'expense' OR OLD.type = 'fund_contribution' OR OLD.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;

        -- Apply NEW
        IF NEW.type = 'income' OR NEW.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'expense' OR NEW.type = 'fund_contribution' OR NEW.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atomic_balance_update
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();


-- ==========================================
-- 6. INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_transactions_family_id ON public.transactions(family_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_client_tx_id ON public.transactions(client_transaction_id);

CREATE INDEX idx_accounts_family_id ON public.accounts(family_id);
CREATE INDEX idx_budgets_family_id_month ON public.budgets(family_id, month);
CREATE INDEX idx_funds_family_id ON public.funds(family_id);
CREATE INDEX idx_debts_family_id ON public.debts(family_id);


-- ==========================================
-- 7. SECURITY DEFINER HARDENING
-- ==========================================

-- Function to safely resolve family_id for current user (avoiding infinite RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_family_id(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_family_id UUID;
BEGIN
    SELECT family_id INTO v_family_id 
    FROM public.family_members 
    WHERE user_id = p_user_id AND status = 'active'
    LIMIT 1;
    
    RETURN v_family_id;
END;
$$;

-- Secure execution privileges
REVOKE ALL ON FUNCTION public.get_user_family_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_family_id(UUID) TO authenticated;
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
-- =======================================================================================
-- PHASE 6.5: TRANSACTIONS CLOUD, ATOMIC TRIGGERS & IDEMPOTENCY
-- =======================================================================================

-- 1. Idempotency Column
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_transaction_id UUID UNIQUE;

-- 2. Foreign Key constraints and Indexes (Ensuring Data Integrity)
-- Ensure debt_id and fund_id columns exist (from Phase 6.1)
-- Create debt_payments and fund_transactions if they do not exist
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    principal_portion NUMERIC NOT NULL,
    interest_portion NUMERIC NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Atomic Financial Balances Trigger
CREATE OR REPLACE FUNCTION public.maintain_financial_balances()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- REVERT OLD EFFECTS (For UPDATE and DELETE)
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        -- Accounts
        IF OLD.type = 'income' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'expense' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.target_account_id;
        ELSIF OLD.type = 'fund_contribution' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE public.funds SET current_amount = current_amount - OLD.amount WHERE id = OLD.fund_id;
        ELSIF OLD.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
            UPDATE public.funds SET current_amount = current_amount + OLD.amount WHERE id = OLD.fund_id;
        ELSIF OLD.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE public.debts SET remaining_amount = remaining_amount + OLD.principal_portion WHERE id = OLD.debt_id;
        END IF;
    END IF;

    -- APPLY NEW EFFECTS (For INSERT and UPDATE)
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Validation: Cross-family checks
        IF NEW.account_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND family_id = NEW.family_id) THEN
                RAISE EXCEPTION 'Cross-family account access denied';
            END IF;
        END IF;
        
        -- Accounts
        IF NEW.type = 'income' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'expense' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.target_account_id AND family_id = NEW.family_id) THEN
                RAISE EXCEPTION 'Cross-family target account access denied';
            END IF;
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.target_account_id;
        ELSIF NEW.type = 'fund_contribution' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE public.funds SET current_amount = current_amount + NEW.amount WHERE id = NEW.fund_id;
            
            -- Upsert to fund_transactions
            INSERT INTO public.fund_transactions (family_id, fund_id, transaction_id, type, amount, created_by)
            VALUES (NEW.family_id, NEW.fund_id, NEW.id, 'contribution', NEW.amount, NEW.created_by)
            ON CONFLICT (transaction_id) DO UPDATE SET amount = EXCLUDED.amount;
            
        ELSIF NEW.type = 'fund_withdrawal' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
            UPDATE public.funds SET current_amount = current_amount - NEW.amount WHERE id = NEW.fund_id;
            
            INSERT INTO public.fund_transactions (family_id, fund_id, transaction_id, type, amount, created_by)
            VALUES (NEW.family_id, NEW.fund_id, NEW.id, 'withdrawal', NEW.amount, NEW.created_by)
            ON CONFLICT (transaction_id) DO UPDATE SET amount = EXCLUDED.amount;

        ELSIF NEW.type = 'debt_payment' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE public.debts SET remaining_amount = remaining_amount - NEW.principal_portion WHERE id = NEW.debt_id;
            
            INSERT INTO public.debt_payments (family_id, debt_id, transaction_id, amount, principal_portion, interest_portion, payment_date, created_by)
            VALUES (NEW.family_id, NEW.debt_id, NEW.id, NEW.amount, NEW.principal_portion, NEW.interest_portion, NEW.date, NEW.created_by)
            ON CONFLICT (transaction_id) DO UPDATE SET 
                amount = EXCLUDED.amount, 
                principal_portion = EXCLUDED.principal_portion, 
                interest_portion = EXCLUDED.interest_portion;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop old trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS trg_maintain_financial_balances ON public.transactions;
CREATE TRIGGER trg_maintain_financial_balances
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.maintain_financial_balances();
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
-- =======================================================================================
-- PHASE 6.8: REALTIME SYNC
-- =======================================================================================

-- Enable logical replication for realtime on all relevant tables
-- Supabase uses the 'supabase_realtime' publication to determine what is broadcasted.

BEGIN;

-- Drop from publication if exists to avoid errors, then add
-- Note: PostgreSQL requires specific syntax. We use IF NOT EXISTS logic via PL/pgSQL for safety or just standard ALTER PUBLICATION.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fund_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;

COMMIT;
-- =======================================================================================
-- PHASE 6.9: OFFLINE QUEUE CONFLICT RESOLUTION
-- =======================================================================================

BEGIN;

-- Add updated_at and version to transactions table if not exists
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Function to auto increment version and update updated_at
CREATE OR REPLACE FUNCTION increment_transaction_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if it's a real update, avoiding infinite trigger loops
    IF OLD IS DISTINCT FROM NEW THEN
        NEW.version = OLD.version + 1;
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment version
DROP TRIGGER IF EXISTS transactions_version_trigger ON public.transactions;
CREATE TRIGGER transactions_version_trigger
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION increment_transaction_version();

COMMIT;
-- =======================================================================================
-- PHASE 6.10: MIGRATION LOCK & STATUS
-- =======================================================================================

BEGIN;

ALTER TABLE public.families ADD COLUMN IF NOT EXISTS migration_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'migrating', 'completed'
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS migration_device_id VARCHAR(255);
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS migration_updated_at TIMESTAMP WITH TIME ZONE;

-- Ensure Admins can update migration status
CREATE POLICY "Admins can update migration status" ON public.families
FOR UPDATE USING (
    id = public.get_user_family_id(auth.uid()) AND 
    public.get_user_role(auth.uid(), id) = 'admin'
);

COMMIT;
