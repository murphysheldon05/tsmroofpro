// Master SOP Version - Update this when SOPs change to require re-acknowledgment
export const SOPMASTER_VERSION = "2025-01-30-v1";

// Neon Green Color tokens
export const SOP_COLORS = {
  neonGreen: '#00D26A',
  neonGreenLight: '#00FF85',
  neonGreenDark: '#00B85C',
};

export interface SOPFlowStep {
  label: string;
  type: 'start' | 'process' | 'decision' | 'end';
  owner: string;
  note?: string;
  branches?: string[];
}

export interface ZeroToleranceItem {
  violation: string;
  severity: 'MINOR' | 'MAJOR' | 'SEVERE';
  consequence: string;
}

export interface MasterSOPContent {
  id: string;
  number: string;
  title: string;
  phase: string;
  icon: string;
  description: string;
  entryCriteria: string[];
  exitCriteria: string[];
  flowSteps: SOPFlowStep[];
  rules: string[];
  zeroTolerance: ZeroToleranceItem[];
  systemEnforcement: string[];
}

// Full Master SOP content for individual acknowledgment
export const SOPMASTER_CONTENT: MasterSOPContent[] = [
  {
    id: 'sop-01',
    number: '01',
    title: 'Commission Submission & Approval',
    phase: 'Revenue Validation & Rep Compensation',
    icon: 'DollarSign',
    description: 'Tier-based calculation with margin as validation gate. Ensures proper routing and prevents unauthorized commission processing.',
    entryCriteria: [
      'Job status = Completed',
      '100% closeout checklist verified',
      'No punch list items remaining',
      'No materials left on site',
      'AccuLynx Payments tab contains payment record'
    ],
    exitCriteria: [
      'Commission approved by Sales Manager',
      'Accounting has executed payment',
      'Audit log entry created'
    ],
    flowSteps: [
      { label: 'Sales Rep Submits Commission', type: 'start', owner: 'Sales Rep', note: 'At assigned tier' },
      { label: 'Margin Validation Gate', type: 'decision', owner: 'System', branches: ['Meets Minimum → Continue', 'Below Minimum → Auto Tier Drop'] },
      { label: 'Sales Manager Review', type: 'decision', owner: 'Sales Manager', branches: ['Reject → Back to Rep', 'Approve → Continue', 'Override (Deals 1–10 Only)'] },
      { label: 'Accounting Executes', type: 'process', owner: 'Accounting' },
      { label: 'Commission Processed', type: 'end', owner: 'System' }
    ],
    rules: [
      'Commission paid at assigned tier — margin is a gate, not the calculator',
      'Tier drop: every 5% below minimum = drop one full tier (automatic)',
      'Overrides allowed ONLY on deals 1–10; beyond requires executive approval',
      'Routing MUST go: Sales Rep → Sales Manager → Accounting (never direct)',
      'Accounting executes only — cannot approve or modify'
    ],
    zeroTolerance: [
      { violation: 'Tier gaming', severity: 'SEVERE', consequence: 'Termination escalation' },
      { violation: 'Proxy ownership', severity: 'SEVERE', consequence: 'Termination escalation' },
      { violation: 'Manager-generated commissions', severity: 'SEVERE', consequence: 'Termination escalation' }
    ],
    systemEnforcement: [
      'Auto-calculate tier drop when margin below minimum',
      'Block submission if routing bypasses Sales Manager',
      'Create MAJOR violation if insurance margin < 40%',
      'Auto-hold commission pending approval for margin exceptions'
    ]
  },
  {
    id: 'sop-02',
    number: '02',
    title: 'Job Closeout & Final Invoice',
    phase: 'Completion → Billing Control',
    icon: 'ClipboardCheck',
    description: 'Ensures all exit criteria are met before billing. Separates retail and insurance invoice ownership.',
    entryCriteria: [
      'Production marked complete in system',
      'All work physically finished on site'
    ],
    exitCriteria: [
      'CompanyCam checklist at 100%',
      'No punch list items remaining',
      'No materials left on site',
      'Invoice issued by correct role',
      'Payment collected in full',
      'Job marked Closed by Accounting'
    ],
    flowSteps: [
      { label: 'Production Complete', type: 'start', owner: 'Production' },
      { label: 'Exit Criteria Validation', type: 'decision', owner: 'System', branches: ['CompanyCam 100%', 'No Punch Items', 'No Materials On Site'] },
      { label: 'Job Type Check', type: 'decision', owner: 'System', branches: ['Retail → Sales Issues Invoice', 'Insurance → Supplements Issues Invoice'] },
      { label: 'Payment Collection', type: 'process', owner: 'Sales/Supplements' },
      { label: 'Job Closed', type: 'end', owner: 'Accounting' }
    ],
    rules: [
      'Retail invoice → Sales Owner ONLY',
      'Insurance invoice → Supplements ONLY',
      'ONLY Supplements can move insurance job to "Invoiced" status',
      'Accounting closes ONLY when paid in full — no exceptions',
      'No punch list / no materials is mandatory before any invoice'
    ],
    zeroTolerance: [],
    systemEnforcement: [
      'Block status change if exit criteria not met',
      'Block non-Supplements from invoicing insurance jobs',
      'Block close if payment not collected in full',
      'Log all blocked attempts to audit'
    ]
  },
  {
    id: 'sop-03',
    number: '03',
    title: 'Supplement Identification & Submission',
    phase: 'Insurance Margin Protection',
    icon: 'FileText',
    description: 'Protects insurance job margins through proper supplement identification, documentation, and carrier communication.',
    entryCriteria: [
      'Job is insurance claim type',
      'Missed item identified during production',
      'Evidence available for documentation'
    ],
    exitCriteria: [
      'Supplement validated by Supplements team',
      'Xactimate estimate built and submitted',
      'Carrier response received',
      'Invoice issued by Supplements'
    ],
    flowSteps: [
      { label: 'Missed Item Identified', type: 'start', owner: 'Sales/Production', note: 'Document immediately' },
      { label: 'CompanyCam Evidence Capture', type: 'process', owner: 'Sales/Production', note: 'Photos + notes required' },
      { label: 'Supplement Validation', type: 'decision', owner: 'Supplements', branches: ['Invalid → Rejected', 'Valid → Continue'] },
      { label: 'Xactimate Build', type: 'process', owner: 'Supplements' },
      { label: 'Carrier Submission', type: 'process', owner: 'Supplements' },
      { label: 'Supplements Issues Invoice', type: 'end', owner: 'Supplements' }
    ],
    rules: [
      'Sales & Production: IDENTIFY and DOCUMENT only — no carrier contact',
      'Supplements: validate, build, submit, communicate, invoice',
      'Sales contacts carrier ONLY if specifically requested by Supplements',
      'All carrier communication ownership stays with Supplements'
    ],
    zeroTolerance: [
      { violation: 'Sales contacting carrier without authorization', severity: 'MAJOR', consequence: 'Escalation + retraining' }
    ],
    systemEnforcement: [
      'Track supplement status through pipeline',
      'Log all carrier communication attempts',
      'Validate invoice issued by Supplements role only'
    ]
  },
  {
    id: 'sop-04',
    number: '04',
    title: 'SOP Acknowledgment & Enforcement',
    phase: 'Control & Accountability',
    icon: 'Shield',
    description: 'Ensures all users have acknowledged current SOPs before accessing governed functionality.',
    entryCriteria: [
      'SOP published or updated',
      'User assigned to relevant role',
      'User has system access'
    ],
    exitCriteria: [
      'User has acknowledged current SOP version',
      'Acknowledgment logged with timestamp and IP'
    ],
    flowSteps: [
      { label: 'SOP Published/Updated', type: 'start', owner: 'Ops Compliance' },
      { label: 'User Notification Sent', type: 'process', owner: 'System' },
      { label: 'Acknowledgment Check', type: 'decision', owner: 'System', branches: ['Not Acknowledged → Block', 'Acknowledged → Grant Access'] },
      { label: 'User Executes Actions', type: 'process', owner: 'User' },
      { label: 'Enforcement Action', type: 'end', owner: 'Ops Compliance' }
    ],
    rules: [
      'No acknowledgment = no governed actions (blocked at system level)',
      'Severe violations auto-escalate to executive review',
      'No manager can override Ops Compliance classification',
      'Acknowledgment required on every SOP version update'
    ],
    zeroTolerance: [],
    systemEnforcement: [
      'Block commission submission without acknowledgment',
      'Block job status changes without acknowledgment',
      'Block scheduling without acknowledgment',
      'Auto-escalate SEVERE violations'
    ]
  },
  {
    id: 'sop-05',
    number: '05',
    title: 'Roles & Authority Boundaries',
    phase: 'Permission Control',
    icon: 'Users',
    description: 'Defines clear authority boundaries for each role. Authority comes from role assignment, not title.',
    entryCriteria: [
      'User account created',
      'Role assignment requested and approved'
    ],
    exitCriteria: [
      'User assigned single, appropriate role',
      'Permissions loaded correctly',
      'User acknowledged role responsibilities'
    ],
    flowSteps: [
      { label: 'User Account Created', type: 'start', owner: 'HR' },
      { label: 'Role Assigned', type: 'process', owner: 'HR/Admin' },
      { label: 'Action Attempted', type: 'decision', owner: 'User', branches: ['Within Authority → Allowed', 'Outside Authority → Blocked'] },
      { label: 'Violation Logged', type: 'end', owner: 'System', note: 'If blocked' }
    ],
    rules: [
      'Authority comes from ROLE, not title or tenure',
      'No role stacking — one user, one role',
      'No temporary permissions — if needed, formal role change required',
      'Attempting unauthorized action = automatic violation log'
    ],
    zeroTolerance: [
      { violation: 'Role stacking', severity: 'MAJOR', consequence: 'Access review + correction' },
      { violation: 'Unauthorized elevation', severity: 'SEVERE', consequence: 'Immediate suspension' }
    ],
    systemEnforcement: [
      'Enforce role-based action permissions',
      'Block and log all unauthorized attempts',
      'Prevent assignment of multiple roles'
    ]
  },
  {
    id: 'sop-06',
    number: '06',
    title: 'User Onboarding & Offboarding',
    phase: 'Access Lifecycle',
    icon: 'UserPlus',
    description: 'HR-owned process for secure user access management. Same-day offboarding with no grace period.',
    entryCriteria: [
      'New hire: documentation complete',
      'Offboarding: termination initiated'
    ],
    exitCriteria: [
      'Onboarding: Access activated after SOP acknowledgment',
      'Offboarding: All access removed same-day'
    ],
    flowSteps: [
      { label: 'Access Request Submitted', type: 'start', owner: 'HR' },
      { label: 'Role Assigned', type: 'process', owner: 'HR' },
      { label: 'SOP Acknowledgment Required', type: 'decision', owner: 'System', branches: ['Not Complete → Blocked', 'Complete → Continue'] },
      { label: 'Access Activated', type: 'process', owner: 'System' },
      { label: 'Compliance Audit', type: 'end', owner: 'Ops Compliance' }
    ],
    rules: [
      'HR owns all onboarding/offboarding',
      'No role = no access (strictly enforced)',
      'SOP acknowledgment required BEFORE any system access',
      'Offboarding is SAME-DAY — no grace period',
      'No shared logins under any circumstances'
    ],
    zeroTolerance: [
      { violation: 'Shared login credentials', severity: 'SEVERE', consequence: 'Immediate access revocation' },
      { violation: 'Delayed offboarding', severity: 'MAJOR', consequence: 'Escalation + security review' }
    ],
    systemEnforcement: [
      'Block access until SOP acknowledgment complete',
      'Force logout on offboarding trigger',
      'Audit trail for all access changes'
    ]
  },
  {
    id: 'sop-07',
    number: '07',
    title: 'Communication & Approvals',
    phase: 'Decision Documentation',
    icon: 'MessageSquare',
    description: 'Flexible communication methods allowed, but all approvals MUST be documented in AccuLynx.',
    entryCriteria: [
      'Business communication occurred',
      'Decision or change discussed'
    ],
    exitCriteria: [
      'If approval/change: documented in AccuLynx',
      'Documentation includes date, parties, decision'
    ],
    flowSteps: [
      { label: 'Conversation Occurs', type: 'start', owner: 'Any', note: 'Call / Text / In-Person OK' },
      { label: 'Approval or Change Discussed?', type: 'decision', owner: 'Participant', branches: ['No → Done', 'Yes → Document required'] },
      { label: 'Document in AccuLynx', type: 'process', owner: 'Initiator' },
      { label: 'Approval Recognized', type: 'end', owner: 'System' }
    ],
    rules: [
      'Communication method is FLEXIBLE — calls, texts, personal phones all OK',
      'APPROVALS must be written in AccuLynx — text/verbal alone is INVALID',
      'If it changes scope, contract, pricing, or materials — it MUST be in AccuLynx'
    ],
    zeroTolerance: [],
    systemEnforcement: [
      'Require AccuLynx note for change order processing',
      'Block scope changes without documentation'
    ]
  },
  {
    id: 'sop-08',
    number: '08',
    title: 'Data Integrity & Status Control',
    phase: 'System Truth Protection',
    icon: 'Database',
    description: 'Status must reflect reality. No backdating, no timing manipulation, no fraudulent documentation.',
    entryCriteria: [
      'Status or data change requested',
      'User has appropriate role permissions'
    ],
    exitCriteria: [
      'Change logged with timestamp',
      'Change reflects actual reality'
    ],
    flowSteps: [
      { label: 'Status/Data Change Requested', type: 'start', owner: 'User' },
      { label: 'Role Authorization Check', type: 'decision', owner: 'System', branches: ['Not Authorized → Blocked', 'Authorized → Continue'] },
      { label: 'Documentation Verification', type: 'decision', owner: 'System', branches: ['No Doc → Blocked', 'Documented → Continue'] },
      { label: 'Change Applied & Logged', type: 'end', owner: 'System' }
    ],
    rules: [
      'Status = REALITY — what the system shows must match what actually happened',
      'No backdating of any status change',
      'No timing manipulation to game cutoffs',
      'CompanyCam photos: no reuse from other jobs, no stock photos'
    ],
    zeroTolerance: [
      { violation: 'Backdating', severity: 'SEVERE', consequence: 'Immediate escalation' },
      { violation: 'Photo reuse/fraud', severity: 'SEVERE', consequence: 'Job audit + escalation' },
      { violation: 'Timing manipulation', severity: 'MAJOR', consequence: 'Commission hold + investigation' }
    ],
    systemEnforcement: [
      'Immutable timestamps on all status changes',
      'Block changes without supporting documentation'
    ]
  },
  {
    id: 'sop-09',
    number: '09',
    title: 'Commission Payroll Sync',
    phase: 'Payroll Execution',
    icon: 'Calendar',
    description: 'Links commission approval to payroll processing with strict cutoff enforcement.',
    entryCriteria: [
      'Commission submitted and approved (SOP-01)',
      'Job fully closed out (SOP-02)',
      'Payment collected in AccuLynx Payments tab'
    ],
    exitCriteria: [
      'Commission included in appropriate payroll cycle',
      'Payment executed on scheduled date'
    ],
    flowSteps: [
      { label: 'Commission Approved', type: 'start', owner: 'Sales Manager' },
      { label: 'Cutoff Check: Before Wed 4PM?', type: 'decision', owner: 'System', branches: ['No → Next Week', 'Yes → This Week'] },
      { label: '100% Closeout Verified?', type: 'decision', owner: 'System', branches: ['No → Blocked', 'Yes → Continue'] },
      { label: 'Added to Friday Payroll', type: 'end', owner: 'Accounting' }
    ],
    rules: [
      'AccuLynx Payments tab is the ONLY source of truth',
      'No estimates or orders count — actual payment only',
      'Wednesday 4:00 PM is a HARD cutoff — no exceptions',
      'Departing reps: $200 flat per reassigned job'
    ],
    zeroTolerance: [],
    systemEnforcement: [
      'Automatic cutoff enforcement at Wed 4PM',
      'Block payroll addition without payment verification'
    ]
  },
  {
    id: 'sop-10',
    number: '10',
    title: 'Production Scheduling & Readiness',
    phase: 'Execution Gate',
    icon: 'Truck',
    description: '100% readiness required before scheduling. No soft scheduling, no bypasses.',
    entryCriteria: [
      'Job approved for production',
      'Readiness checklist initiated'
    ],
    exitCriteria: [
      'All readiness criteria met at 100%',
      'Job scheduled with confirmed date',
      'Build executed and completed'
    ],
    flowSteps: [
      { label: 'Job Approved for Production', type: 'start', owner: 'Sales/Manager' },
      { label: 'Readiness Checklist', type: 'decision', owner: 'System', branches: ['Not 100% → Blocked', '100% → Continue'] },
      { label: 'Schedule Production Date', type: 'process', owner: 'Production Manager' },
      { label: 'Build Executed', type: 'process', owner: 'Production Crew' },
      { label: 'Job Completed', type: 'end', owner: 'Production' }
    ],
    rules: [
      'ALL readiness criteria must be 100% before scheduling',
      'No "soft scheduling" — either ready or not',
      'Bypass attempts are automatic violations',
      'Pre-build confirmation required 24-48 hours before start'
    ],
    zeroTolerance: [
      { violation: 'Scheduling without 100% readiness', severity: 'MINOR', consequence: 'Warning + reschedule' },
      { violation: 'Repeated scheduling violations', severity: 'MAJOR', consequence: 'Escalation' }
    ],
    systemEnforcement: [
      'Block scheduling if readiness < 100%',
      'Display readiness badge on all job cards',
      'Create violation on bypass attempt'
    ]
  }
];

// Legacy summary format for compatibility
export const SOPMASTER_SUMMARY = SOPMASTER_CONTENT.map(sop => ({
  id: sop.id,
  title: sop.title,
  summary: sop.description,
}));

// Governed actions that require SOP acknowledgment
export const GOVERNED_ACTIONS = [
  "commission_submission",
  "commission_approval",
  "production_scheduling",
  "supplement_submission",
  "invoice_issuance",
  "job_status_change",
] as const;

export type GovernedAction = (typeof GOVERNED_ACTIONS)[number];
