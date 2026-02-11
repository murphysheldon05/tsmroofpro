export interface TutorialStep {
  target: string; // data-tutorial attribute value
  title: string;
  description: string;
}

export const commandCenterSteps: TutorialStep[] = [
  {
    target: "sales-leaderboard",
    title: "Sales Leaderboard",
    description: "See how your team ranks. Toggle between Sales, Profit, and Commissions views. Use Week/Month/YTD to change the time range.",
  },
  {
    target: "commission-summary",
    title: "Commission Summary Cards",
    description: "Your commission snapshot at a glance. Pending, Approved, Paid this month, and any outstanding Draw balance.",
  },
  {
    target: "quick-links",
    title: "Quick Links",
    description: "Jump directly to Build Schedule, Delivery Schedule, Submit Warranty, or Submit Commission.",
  },
  {
    target: "quick-stats",
    title: "Today's Stats",
    description: "Click any of these boxes to see details — today's builds, deliveries, open warranties, or pending approvals.",
  },
  {
    target: "weather-widget",
    title: "Weather Widget",
    description: "Live weather for Phoenix to help plan outdoor work. Shows 5-day forecast.",
  },
  {
    target: "notification-bell",
    title: "Notification Bell",
    description: "Check your notifications here. New commissions, approvals, and compliance alerts all show up in real-time.",
  },
];

export const commissionsSteps: TutorialStep[] = [
  {
    target: "submit-commission",
    title: "Submit Commission",
    description: "Click here to submit a new commission after a job is completed and paid.",
  },
  {
    target: "request-draw",
    title: "Request Draw",
    description: "Need an advance? Request a draw against a future job's commission.",
  },
  {
    target: "commission-pipeline",
    title: "Commission Pipeline",
    description: "Filter your commissions by status: Pending, Revision, Approved, Denied, or Paid.",
  },
  {
    target: "commission-search",
    title: "Search",
    description: "Search by job number, rep name, or customer to find specific commissions.",
  },
  {
    target: "draw-balance",
    title: "Draw Balance Card",
    description: "See your active draws and remaining balances here.",
  },
];

export const buildScheduleSteps: TutorialStep[] = [
  {
    target: "calendar-views",
    title: "Calendar Views",
    description: "Switch between Day, Week, and Month views to see your production schedule.",
  },
  {
    target: "crew-filters",
    title: "Crew Filters",
    description: "Filter the calendar by specific crews or reps to see their schedules.",
  },
  {
    target: "add-build",
    title: "Add Build",
    description: "Click to schedule a new build. Assign a crew, date, and job details.",
  },
  {
    target: "todays-builds",
    title: "Today's Builds",
    description: "See all builds happening today at a glance, right above the calendar.",
  },
];

export const deliveryScheduleSteps: TutorialStep[] = [
  {
    target: "calendar-view",
    title: "Calendar View",
    description: "See all upcoming material deliveries by day, week, or month.",
  },
  {
    target: "add-delivery",
    title: "Add Delivery",
    description: "Schedule a new delivery with supplier, material, and job details.",
  },
  {
    target: "todays-deliveries",
    title: "Today's Deliveries",
    description: "Today's scheduled deliveries appear here with status tracking.",
  },
];

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

export const opsComplianceSteps: TutorialStep[] = [
  {
    target: "compliance-summary",
    title: "Dashboard Cards",
    description: "Quick summary of active holds, violations, escalations, and pending items.",
  },
  {
    target: "violations-tab",
    title: "Violations Tab",
    description: "View and create violations. Classify as MINOR, MAJOR, or SEVERE with documentation.",
  },
  {
    target: "holds-tab",
    title: "Holds Tab",
    description: "Place access holds or commission holds on users who have compliance issues.",
  },
  {
    target: "escalations-tab",
    title: "Escalations Tab",
    description: "Create and manage escalations that need executive review.",
  },
  {
    target: "audit-log-tab",
    title: "Audit Log",
    description: "Complete history of every compliance action taken in the system. Filter by user, date, or action type.",
  },
];

export const playbookSteps: TutorialStep[] = [
  {
    target: "playbook-progress",
    title: "Master Playbook",
    description: "The 10 core SOPs every team member must acknowledge. Click to read and review.",
  },
  {
    target: "playbook-search",
    title: "Search",
    description: "Browse playbooks by name or phase to find specific SOPs.",
  },
  {
    target: "playbook-cards",
    title: "Playbook Cards",
    description: "Access detailed guides, flowcharts, and reference materials for each SOP.",
  },
];

export const trainingSteps: TutorialStep[] = [
  {
    target: "training-header",
    title: "Training Resources",
    description: "Upload and browse company documents: sales scripts, email templates, manufacturer specs, and more.",
  },
  {
    target: "training-search",
    title: "Search",
    description: "Find specific training materials by keyword.",
  },
  {
    target: "training-content",
    title: "Content Library",
    description: "Watch training videos and browse documents organized by category. Managers and Admins can upload new content.",
  },
];

export const adminSteps: TutorialStep[] = [
  {
    target: "admin-users-tab",
    title: "User Management",
    description: "View all users, edit roles and departments, approve or reject accounts.",
  },
  {
    target: "admin-pending",
    title: "Pending Approvals",
    description: "New users waiting for your review. Assign their role, department, and commission tier.",
  },
  {
    target: "admin-tiers-tab",
    title: "Commission Management",
    description: "Manage commission tiers and formulas for accurate YTD data.",
  },
  {
    target: "admin-draws-tab",
    title: "Draw Management",
    description: "Configure draw settings, view all active draws company-wide.",
  },
  {
    target: "admin-leaderboard-tab",
    title: "Integrations",
    description: "Configure leaderboard settings and AccuLynx API for live production and sales data.",
  },
];
