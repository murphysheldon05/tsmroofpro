-- =====================================================
-- SECURITY FIX: Restrict sensitive tables to ACTIVE employees only
-- This prevents pending/rejected/inactive users from viewing:
-- 1. Job site addresses and customer names (today_labor)
-- 2. Delivery schedules and addresses (today_deliveries)
-- 3. Company commission structure (commission_tiers)
-- =====================================================

-- =========================
-- 1. FIX today_labor TABLE
-- =========================

-- Drop the overly permissive policy that allowed ANY authenticated user
DROP POLICY IF EXISTS "Authenticated users can view today labor" ON public.today_labor;

-- Create new restrictive policy: only ACTIVE employees can view
CREATE POLICY "Active employees can view today labor"
ON public.today_labor
FOR SELECT
USING (is_active_employee(auth.uid()));

-- =========================
-- 2. FIX today_deliveries TABLE
-- =========================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view today deliveries" ON public.today_deliveries;

-- Create new restrictive policy: only ACTIVE employees can view
CREATE POLICY "Active employees can view today deliveries"
ON public.today_deliveries
FOR SELECT
USING (is_active_employee(auth.uid()));

-- =========================
-- 3. FIX commission_tiers TABLE
-- =========================

-- Drop the completely public policy (security risk!)
DROP POLICY IF EXISTS "Anyone can view active commission tiers" ON public.commission_tiers;

-- Create new restrictive policy: only ACTIVE employees can view
CREATE POLICY "Active employees can view commission tiers"
ON public.commission_tiers
FOR SELECT
USING (is_active_employee(auth.uid()) AND is_active = true);