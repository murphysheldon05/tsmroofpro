-- BUG 4: Add Sales Rep onboarding SOP
INSERT INTO public.role_onboarding_sops (id, role, version, title, description, is_active)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'sales_rep',
  '2026-03-v1',
  'Sales Rep Onboarding',
  'Complete onboarding guide for the Sales Rep role at TSM Roofing LLC.',
  true
);

INSERT INTO public.role_onboarding_sections (sop_id, section_number, title, content, section_type, is_acknowledgment_required) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 1, 'Welcome & Role Overview', E'Welcome to TSM Roofing LLC. As a Sales Rep, you are responsible for generating leads, managing customer relationships, submitting accurate commission documents, and following all company SOPs. You report to your assigned Sales Manager.', 'reading', true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2, 'Phase 1: Account Setup', E'Complete the following within your first day:\n\n• Accept your invite email and create your account\n• Wait for Admin approval (role and department assignment)\n• Complete the Master Playbook (acknowledge all 10 SOPs)\n• Review your commission tier assignment', 'checklist', true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 3, 'Phase 2: Platform Training', E'Complete the following within Days 2-3:\n\n• Command Center tour — understand dashboard widgets and quick stats\n• Commission Documents — learn how to create, submit, and track commission documents\n• My Tracker — view your commission history and documents\n• Training section — review Documents library and Video Library\n• Tools & Systems — familiarize yourself with available tools', 'checklist', true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 4, 'Commission Submission Process', E'As a Sales Rep, you submit commissions following this workflow:\n\n1. Navigate to Commission Documents → New\n2. Fill in all required fields (Job Name, Date, Contract Total, Expenses)\n3. Review the calculated commission amounts\n4. Submit for manager approval\n5. Track status: Submitted → Manager Approved → Accounting Approved → Paid\n\nEnsure all data is accurate before submitting. Incorrect submissions may result in delays.', 'reading', true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 5, 'Role Guidelines & Expectations', E'Key expectations for Sales Reps:\n\n• Follow all 10 Master Playbook SOPs at all times\n• Submit commission documents promptly and accurately\n• Do not contact insurance carriers without authorization\n• Report scheduling issues to your Sales Manager immediately\n• Maintain professional communication with all team members and customers', 'reading', true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 6, 'Electronic Sign-Off', 'By acknowledging this section, I confirm that I have read and understand this onboarding SOP, my role responsibilities, the commission submission process, and company guidelines. I commit to following all Master Playbook SOPs.', 'sign_off', true);

-- BUG 7: Fix "Deas 51-100" typo in commission_tiers table
UPDATE public.commission_tiers
SET name = REPLACE(name, 'Deas ', 'Deals ')
WHERE name LIKE '%Deas %';

-- BUG 8: Fix "Durartion" typo in production_calendar_events
UPDATE public.production_calendar_events
SET title = REPLACE(title, 'Durartion', 'Duration')
WHERE title LIKE '%Durartion%';

UPDATE public.production_calendar_events
SET description = REPLACE(description, 'Durartion', 'Duration')
WHERE description LIKE '%Durartion%';

-- BUG 9: Fix "shelon murphy" display name in profiles
UPDATE public.profiles
SET full_name = 'Sheldon Murphy'
WHERE email = 'sheldonmurphy@tsmroofs.com'
  AND (full_name ILIKE '%shelon%' OR full_name ILIKE '%sheldon%');
