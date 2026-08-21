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
