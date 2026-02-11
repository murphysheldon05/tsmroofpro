export interface TutorialStep {
  target: string; // data-tutorial attribute value
  title: string;
  description: string;
  roles?: string[]; // optional role filter — if set, only these roles see this step
}

// ─── COMMAND CENTER ───
export const commandCenterSteps: TutorialStep[] = [
  {
    target: "command-center-header",
    title: "Welcome to Your Dashboard",
    description: "This is your Command Center — your daily HQ. Everything you need is right here.",
  },
  {
    target: "sales-leaderboard",
    title: "Sales Leaderboard",
    description: "See how the team ranks. Toggle between Sales, Profit, and Commissions tabs. Use the time range buttons to view different periods.",
  },
  {
    target: "commission-summary",
    title: "Commission Summary",
    description: "Your commission snapshot: Pending, Approved, Paid this month, and any Draw balance.",
    roles: ["sales_rep", "sales_manager", "admin"],
  },
  {
    target: "quick-links",
    title: "Quick Links",
    description: "Jump to common actions: Build Schedule, Delivery Schedule, Submit Warranty, or Submit Commission.",
  },
  {
    target: "quick-stats",
    title: "Today's Stats",
    description: "Click any stat box to see details — builds, deliveries, warranties, or pending approvals.",
  },
  {
    target: "cc-settings-gear",
    title: "Customize Your Dashboard",
    description: "Click the gear icon to rearrange widgets. Drag items to reorder, toggle sections on or off, and put what matters most to you at the top.",
  },
  {
    target: "notification-bell",
    title: "Notification Bell",
    description: "Your notifications live here. Commission updates, approvals, compliance alerts — all in real-time.",
  },
  {
    target: "pending-review-widget",
    title: "Pending Review",
    description: "Commission submissions from your reps appear here. Review and approve them promptly.",
    roles: ["sales_manager", "admin"],
  },
];

// ─── COMMISSIONS ───
export const commissionsSteps: TutorialStep[] = [
  {
    target: "commissions-header",
    title: "Commissions Overview",
    description: "This is where you manage all commission activity.",
  },
  {
    target: "submit-commission",
    title: "Submit Commission",
    description: "Click here after a job is completed AND paid in AccuLynx. Fill in the job details and the system calculates your commission at your assigned tier.",
    roles: ["sales_rep", "sales_manager", "admin"],
  },
  {
    target: "request-draw",
    title: "Request Draw",
    description: "Request a draw against a future job's commission. Maximum is 50% of that job's commission, capped at $1,500 without manager approval.",
    roles: ["sales_rep", "sales_manager"],
  },
  {
    target: "commission-pipeline",
    title: "Commission Pipeline",
    description: "Filter by status: Pending (awaiting manager review), Revision (needs corrections), Approved (going to Accounting), Paid.",
  },
  {
    target: "approval-chain",
    title: "Approval Chain Reminder",
    description: "Remember: You submit → Your Sales Manager reviews → Accounting processes payment. No steps can be skipped.",
    roles: ["sales_rep"],
  },
  {
    target: "pending-review-queue",
    title: "Pending Review Queue",
    description: "Commissions from your reps land here. Review each one carefully — verify job completion and payment before approving.",
    roles: ["sales_manager", "admin"],
  },
];

// ─── PRODUCTION / BUILD SCHEDULE ───
export const buildScheduleSteps: TutorialStep[] = [
  {
    target: "calendar-views",
    title: "Build Schedule",
    description: "View all upcoming production builds by Day, Week, or Month.",
  },
  {
    target: "todays-builds",
    title: "Today's Builds",
    description: "See all builds happening today right above the calendar.",
  },
  {
    target: "crew-filters",
    title: "Crew Filters",
    description: "Filter the calendar by specific crews or reps to see their schedules.",
  },
  {
    target: "add-build",
    title: "Add/Edit Builds",
    description: "Click to schedule or modify builds. Assign crews, dates, and job details.",
    roles: ["manager", "admin"],
  },
];

// ─── DELIVERY SCHEDULE ───
export const deliveryScheduleSteps: TutorialStep[] = [
  {
    target: "calendar-view",
    title: "Delivery Schedule",
    description: "Track material deliveries. Switch views to see supplier schedules.",
  },
  {
    target: "todays-deliveries",
    title: "Today's Deliveries",
    description: "Today's scheduled deliveries appear here with status tracking.",
  },
  {
    target: "add-delivery",
    title: "Add Delivery",
    description: "Schedule a new delivery with supplier, material, and job details.",
    roles: ["manager", "admin"],
  },
];

// ─── PLAYBOOK LIBRARY ───
export const playbookSteps: TutorialStep[] = [
  {
    target: "playbook-progress",
    title: "Master Playbook",
    description: "This is the core. All 10 Standard Operating Procedures must be read and acknowledged before you can access the full hub. If you haven't completed them yet, start here.",
  },
  {
    target: "playbook-search",
    title: "Browse Playbooks",
    description: "After completing the Master Playbook, you can browse all company playbooks by category.",
  },
  {
    target: "playbook-cards",
    title: "Your Acknowledgment Status",
    description: "Green checkmarks show which SOPs you've acknowledged. You can re-read any of them anytime.",
  },
];

// ─── TRAINING ───
export const trainingSteps: TutorialStep[] = [
  {
    target: "training-header",
    title: "Documents",
    description: "Browse company documents organized by category: Sales Scripts, Email Templates, Manufacturer Specs, Product Knowledge, and more. Download anything you need.",
  },
  {
    target: "training-content",
    title: "Video Library",
    description: "Watch training videos and Loom recordings. Organized by category: Onboarding, Sales Training, Product Training, and more.",
  },
  {
    target: "training-search",
    title: "My Onboarding",
    description: "Your role-specific onboarding SOP lives here. Complete all sections and sign electronically.",
  },
  {
    target: "training-new-hires",
    title: "New Hires",
    description: "Manage new hire onboarding materials and track progress.",
    roles: ["admin"],
  },
];

// ─── WARRANTY ───
export const warrantySteps: TutorialStep[] = [
  {
    target: "kanban-board",
    title: "Kanban Board",
    description: "Drag warranty claims between columns to update their status: New, In Progress, Scheduled, Completed.",
  },
  {
    target: "submit-warranty",
    title: "Submit Warranty",
    description: "Click to create a new warranty claim with customer details, issue, and photos.",
  },
  {
    target: "aging-tab",
    title: "Aging Indicators",
    description: "Red badges show warranties that have been open too long and need attention.",
  },
  {
    target: "warranty-search",
    title: "Search & Filter",
    description: "Search by customer name or filter by status and priority.",
  },
];

// ─── WHO TO CONTACT ───
export const directorySteps: TutorialStep[] = [
  {
    target: "assigned-manager",
    title: "Your Assigned Manager",
    description: "Your #1 point of contact. For commission questions, deal strategy, draw requests, and day-to-day support — always start with your manager.",
    roles: ["sales_rep", "user"],
  },
  {
    target: "other-managers",
    title: "Other Sales Managers",
    description: "If your manager is unavailable, you can reach out to another Sales Manager as your backup contact.",
    roles: ["sales_rep", "user"],
  },
  {
    target: "compliance-officer",
    title: "Compliance Officer",
    description: "For compliance questions, playbook clarifications, or violation inquiries, contact the Ops Compliance team.",
  },
  {
    target: "department-contacts",
    title: "Department Contacts",
    description: "Browse contacts by department. You'll find Production, Supplements, and other key team members here.",
  },
  {
    target: "accounting-owner",
    title: "Accounting & Owner",
    description: "To reach Accounting or the Owner, please submit a meeting request via Forms & Requests or email. A formal request ensures your question gets proper attention.",
    roles: ["sales_rep", "user"],
  },
];

// ─── OPS COMPLIANCE ───
export const opsComplianceSteps: TutorialStep[] = [
  {
    target: "compliance-summary",
    title: "Dashboard Overview",
    description: "Quick summary of active holds, violations, escalations, and pending items.",
    roles: ["admin"],
  },
  {
    target: "violations-tab",
    title: "Violations",
    description: "View and create violations. Classify as MINOR, MAJOR, or SEVERE with documentation.",
    roles: ["admin"],
  },
  {
    target: "holds-tab",
    title: "Holds",
    description: "Place access or commission holds on users with compliance issues.",
    roles: ["admin"],
  },
  {
    target: "escalations-tab",
    title: "Escalations",
    description: "Create and manage escalations that need executive review.",
    roles: ["admin"],
  },
  {
    target: "audit-log-tab",
    title: "Audit Log",
    description: "Complete history of every compliance action. Filter by user, date, or action type.",
    roles: ["admin"],
  },
];

// ─── ADMIN PANEL ───
export const adminSteps: TutorialStep[] = [
  {
    target: "admin-users-tab",
    title: "User Management",
    description: "View all users, edit roles and departments, approve or reject new signups.",
    roles: ["admin"],
  },
  {
    target: "admin-pending",
    title: "Pending Approvals",
    description: "New users waiting for your review. Assign their role, department, and commission tier.",
    roles: ["admin"],
  },
  {
    target: "admin-tiers-tab",
    title: "Commission Management",
    description: "Import historical commissions or manually add records.",
    roles: ["admin"],
  },
  {
    target: "admin-draws-tab",
    title: "Draw Management",
    description: "Import draws, add manually, view all active draws company-wide.",
    roles: ["admin"],
  },
  {
    target: "admin-leaderboard-tab",
    title: "Integrations",
    description: "Connect AccuLynx API for live production and sales data.",
    roles: ["admin"],
  },
];

// ─── ROLE ONBOARDING ───
export const roleOnboardingSteps: TutorialStep[] = [
  {
    target: "onboarding-header",
    title: "Your Onboarding SOP",
    description: "This is your role-specific onboarding document. Complete each section in order to get fully onboarded.",
  },
  {
    target: "onboarding-progress",
    title: "Progress Tracker",
    description: "See how far along you are. Each acknowledged section fills the progress bar.",
  },
  {
    target: "onboarding-sections",
    title: "Sections",
    description: "Read each section and click 'I Acknowledge' to confirm. Sections unlock sequentially — complete the current one to unlock the next.",
  },
  {
    target: "onboarding-signature",
    title: "Electronic Signature",
    description: "After all sections are acknowledged, type your full legal name to sign and complete the onboarding.",
  },
];

// ─── COMMISSION DOCUMENTS ───
export const commissionDocumentsSteps: TutorialStep[] = [
  {
    target: "cd-new-document",
    title: "New Commission Document",
    description: "Click here to create a new commission worksheet with detailed profit calculations.",
  },
  {
    target: "cd-status-filter",
    title: "Status Filter",
    description: "Filter documents by status: Draft, Submitted, Approved, Rejected, or Paid.",
  },
  {
    target: "cd-search",
    title: "Search",
    description: "Search by job name/ID or sales rep name to find specific commission documents.",
  },
  {
    target: "cd-documents-table",
    title: "Documents Table",
    description: "View all commission documents with key details. Click any row to open the full worksheet.",
  },
  {
    target: "cd-export",
    title: "Export",
    description: "Download your commission data as CSV or PDF for record-keeping and reporting.",
  },
];

// ─── COMMISSION DOCUMENT FORM ───
export const commissionFormSteps: TutorialStep[] = [
  {
    target: "job-info",
    title: "Job Information",
    description: "Enter the job number from AccuLynx. This must match the exact job you're submitting the commission for.",
  },
  {
    target: "gross-contract",
    title: "Gross Contract Value",
    description: "Enter the total contract value. Pull this from the Payments tab in the job's AccuLynx profile.",
  },
  {
    target: "expenses",
    title: "Expenses",
    description: "Enter material and labor costs. Pull these numbers from the Payments tab in the job's AccuLynx profile — check the line items for exact amounts.",
  },
  {
    target: "commission-calc",
    title: "Commission Calculation",
    description: "The system automatically calculates your commission based on your assigned tier. Verify the numbers look correct before submitting.",
  },
  {
    target: "submit-btn",
    title: "Submit",
    description: "Once everything looks right, click Submit. This sends the commission to your Sales Manager for review. You'll get an email when it's approved or if revisions are needed.",
  },
];
