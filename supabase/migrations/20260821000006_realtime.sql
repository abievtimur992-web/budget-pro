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
