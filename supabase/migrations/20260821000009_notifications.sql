-- =======================================================================================
-- PHASE 7.2: NOTIFICATIONS
-- =======================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'transaction_added', 'budget_limit', 'system'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their family notifications" ON public.notifications
    FOR SELECT USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can update their family notifications" ON public.notifications
    FOR UPDATE USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can insert their family notifications" ON public.notifications
    FOR INSERT WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger for New Transactions
CREATE OR REPLACE FUNCTION public.notify_on_new_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    creator_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Don't notify for opening balances
        IF NEW.comment = 'Басланғыш баланс түзетуі (Миграция)' THEN
            RETURN NEW;
        END IF;

        SELECT display_name INTO creator_name 
        FROM public.user_profiles 
        WHERE id = NEW.created_by;

        IF creator_name IS NULL THEN
            creator_name := 'Биреў';
        END IF;

        INSERT INTO public.notifications (family_id, type, message)
        VALUES (
            NEW.family_id, 
            'transaction_added',
            creator_name || ' жаңа операция қосты: ' || NEW.amount::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_transaction ON public.transactions;
CREATE TRIGGER trg_notify_new_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_transaction();

COMMIT;
