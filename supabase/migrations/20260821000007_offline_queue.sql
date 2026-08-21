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
