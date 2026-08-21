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
