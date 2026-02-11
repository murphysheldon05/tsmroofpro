
-- Role Onboarding SOPs
CREATE TABLE public.role_onboarding_sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_onboarding_sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role onboarding sops" ON public.role_onboarding_sops FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view active sops" ON public.role_onboarding_sops FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE TRIGGER update_role_onboarding_sops_updated_at BEFORE UPDATE ON public.role_onboarding_sops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Role Onboarding Sections
CREATE TABLE public.role_onboarding_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.role_onboarding_sops(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'reading',
  is_acknowledgment_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_onboarding_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sections" ON public.role_onboarding_sections FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view sections" ON public.role_onboarding_sections FOR SELECT USING (auth.uid() IS NOT NULL);

-- Role Onboarding Acknowledgments
CREATE TABLE public.role_onboarding_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  sop_id UUID NOT NULL REFERENCES public.role_onboarding_sops(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.role_onboarding_sections(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  UNIQUE(user_id, section_id)
);

ALTER TABLE public.role_onboarding_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acknowledgments" ON public.role_onboarding_acknowledgments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own acknowledgments" ON public.role_onboarding_acknowledgments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all acknowledgments" ON public.role_onboarding_acknowledgments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Role Onboarding Completions
CREATE TABLE public.role_onboarding_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  sop_id UUID NOT NULL REFERENCES public.role_onboarding_sops(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  electronic_signature TEXT NOT NULL,
  signature_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sop_id)
);

ALTER TABLE public.role_onboarding_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.role_onboarding_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.role_onboarding_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all completions" ON public.role_onboarding_completions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed: Ops Compliance Officer Onboarding SOP
INSERT INTO public.role_onboarding_sops (id, role, version, title, description, is_active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  '2026-02-v1',
  'Ops Compliance Officer Onboarding',
  'Complete onboarding guide for the Ops Compliance Officer role at TSM Roofing LLC.',
  true
);

INSERT INTO public.role_onboarding_sections (sop_id, section_number, title, content, section_type, is_acknowledgment_required) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 'Welcome & Role Overview', 'Welcome to TSM Roofing LLC. As the Ops Compliance Officer, you are responsible for enforcing all 10 Master Playbooks, managing violations and holds, tracking escalations, and ensuring every team member operates within established procedures. You report directly to Sheldon Murphy (Admin).', 'reading', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 'Phase 1: Account Setup', E'Complete the following within your first day:\n\n• Receive and accept your invite email\n• Create your account with a secure password\n• Wait for Admin approval (role and department assignment)\n• Complete the Master Playbook (acknowledge all 10 SOPs)', 'checklist', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, 'Phase 2: Platform Training', E'Complete the following within Days 2-3:\n\n• Command Center tour — understand dashboard widgets, leaderboard, quick stats\n• Commission system walkthrough — learn the submission chain: Sales Rep → Sales Manager → Accounting\n• Production module — Build Schedule, Delivery Schedule, AccuLynx integration\n• Ops Compliance dashboard — violations, holds, escalations, audit log\n• Admin Panel orientation — user management, imports, integrations\n• Training section — Documents library, Video Library', 'checklist', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, 'Role Authority: What You CAN Do', E'As Ops Compliance Officer, you have authority to:\n\n• Create, classify, and manage violations (MINOR, MAJOR, SEVERE)\n• Place and remove access holds and commission holds\n• Create escalations for executive review\n• View the full compliance audit log\n• Monitor Master Playbook acknowledgment status\n• Force re-acknowledgment on playbook version updates\n• Generate compliance reports and export data\n• Access all pages in the hub', 'reading', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 'Role Authority: What You CANNOT Do', E'The following actions are outside your authority:\n\n• Approve or deny commissions (Sales Manager/Admin only)\n• Modify commission formulas or tier assignments\n• Override a Sales Manager''s commission decision\n• Delete user accounts\n• Modify AccuLynx integration settings\n• Change another user''s role or department', 'reading', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 'Daily Responsibilities', E'Your daily checklist:\n\n• Check Ops Compliance dashboard for new violations or escalations\n• Review audit log for unusual activity\n• Verify commission submissions follow the chain: Rep → Manager → Accounting\n• Monitor notification system for delivery issues\n• Address any active holds with documented resolution plans', 'checklist', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 'Weekly Responsibilities', E'Your weekly tasks:\n\n• Generate weekly compliance summary for Admin\n• Review Master Playbook acknowledgment status (especially new hires)\n• Audit draw balances outstanding beyond 4 weeks\n• Verify all user accounts have correct role/department\n• Close resolved escalations', 'checklist', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 'Escalation Matrix', E'MINOR: Warning + retraining. Example: scheduling without 100% readiness. You document and notify user + manager.\n\nMAJOR: Commission hold + investigation. Example: Sales contacting carrier without authorization. You place hold and escalate to Sheldon.\n\nSEVERE: Immediate suspension + termination review. Example: tier gaming, proxy ownership, backdating. Auto-escalates to Sheldon. You document all evidence.', 'reading', true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9, 'Electronic Sign-Off', 'By acknowledging this section, I confirm that I have read and understand this onboarding SOP, my role responsibilities, authority boundaries, and the escalation matrix. I commit to enforcing all 10 Master Playbooks fairly and consistently.', 'sign_off', true);
