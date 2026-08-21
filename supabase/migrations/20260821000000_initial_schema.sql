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
