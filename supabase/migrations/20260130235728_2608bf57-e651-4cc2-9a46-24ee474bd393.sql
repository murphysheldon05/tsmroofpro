-- 1. sop_acknowledgments table
CREATE TABLE public.sop_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sop_key text NOT NULL,
  version text NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  method text DEFAULT 'checkbox',
  ip_address text,
  device_info text
);

-- 2. compliance_violations table
CREATE TABLE public.compliance_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id),
  sop_key text NOT NULL,
  job_id text,
  department text,
  violation_type text NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  assigned_to_user_id uuid REFERENCES auth.users(id),
  escalation_required boolean DEFAULT false,
  escalated_to_user_id uuid REFERENCES auth.users(id),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id)
);

-- 3. compliance_holds table
CREATE TABLE public.compliance_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id),
  hold_type text NOT NULL,
  job_id text,
  user_id uuid REFERENCES auth.users(id),
  related_entity_type text,
  related_entity_id text,
  reason text NOT NULL,
  status text DEFAULT 'active',
  released_at timestamptz,
  released_by_user_id uuid REFERENCES auth.users(id)
);

-- 4. compliance_escalations table
CREATE TABLE public.compliance_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  violation_id uuid REFERENCES public.compliance_violations(id) ON DELETE CASCADE NOT NULL,
  escalated_by_user_id uuid REFERENCES auth.users(id),
  escalated_to_user_id uuid REFERENCES auth.users(id),
  reason text,
  status text DEFAULT 'pending',
  final_decision_notes text,
  decided_at timestamptz,
  decided_by_user_id uuid REFERENCES auth.users(id)
);

-- 5. compliance_audit_log table
CREATE TABLE public.compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.sop_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sop_acknowledgments
CREATE POLICY "Admins and ops_compliance can manage all acknowledgments"
ON public.sop_acknowledgments FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Users can view own acknowledgments"
ON public.sop_acknowledgments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acknowledgments"
ON public.sop_acknowledgments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for compliance_violations
CREATE POLICY "Admins and ops_compliance can manage violations"
ON public.compliance_violations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops_compliance'));

-- RLS Policies for compliance_holds
CREATE POLICY "Admins and ops_compliance can manage holds"
ON public.compliance_holds FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops_compliance'));

-- RLS Policies for compliance_escalations
CREATE POLICY "Admins and ops_compliance can manage escalations"
ON public.compliance_escalations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops_compliance'));

-- RLS Policies for compliance_audit_log
CREATE POLICY "Admins and ops_compliance can manage audit log"
ON public.compliance_audit_log FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops_compliance'));