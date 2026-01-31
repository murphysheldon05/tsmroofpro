/**
 * Master SOP Content for acknowledgment and display
 * This is the canonical source for all SOP summaries used in:
 * - SOP Library Master SOPs section
 * - SOP Acknowledgment Gate
 * - PDF generation
 */

export interface MasterSOP {
  id: string;
  title: string;
  summary: string[];
  hardStops?: string[];
}

export const MASTER_SOP_CONTENT: MasterSOP[] = [
  {
    id: "SOP-01",
    title: "Commission Submission & Approval",
    summary: [
      "Commission is calculated on the rep's ASSIGNED TIER — gross margin is a validation gate, not the calculator.",
      "Minimum margins: Retail Shingle 30%, Retail Tile 35%, Insurance 40% minimum / 45% target / 50% stretch.",
      "Tier Drop Rule: For every 5% below minimum margin, drop ONE FULL TIER. Automatic. No discretion. No manager override.",
      "Entry criteria: Job Completed, closeout 100%, no punch list, no materials on site, final contract locked, payment data in AccuLynx.",
      "Sales Manager may approve, reject, or override (deals 1-10 only). May NOT override tier drops or approve own commissions.",
      "Accounting executes only: verify math, queue for payroll, apply payment. May NOT change tier or grant exceptions.",
    ],
    hardStops: [
      "BLOCK submission if any entry criteria is false.",
      "No tier gaming — automatic tier drop enforced by system.",
      "No proxy deal ownership — IMMEDIATE TERMINATION.",
      "No timing manipulation — IMMEDIATE TERMINATION.",
      "Sales Manager cannot approve own commissions.",
    ],
  },
  {
    id: "SOP-02",
    title: "Job Closeout & Final Invoice",
    summary: [
      "Jobs enter closeout only when build is complete, CompanyCam checklist is 100%, all photos uploaded, no punch list, no materials on site.",
      "RETAIL: Sales issues homeowner invoice after Production confirms completion. Sales may NOT modify scope or invoice insurance carriers.",
      "INSURANCE: Supplements finalize scope and issue carrier invoice. ONLY Supplements may move insurance job to \"Invoiced\".",
      "Accounting applies payment and closes job ONLY when paid in full.",
      "Accounting does NOT issue invoices, track depreciation, modify scope, or grant exceptions.",
      "Job is CLOSED only when all invoices issued, all funds collected, and Accounting moves job to \"Closed\".",
    ],
    hardStops: [
      "BLOCK invoicing if any entry criteria fails.",
      "Sales cannot invoice insurance carriers.",
      "Only Supplements may move insurance job to Invoiced.",
      "Job cannot close until fully paid.",
      "Accounting cannot issue invoices or modify scope.",
    ],
  },
  {
    id: "SOP-03",
    title: "Production Scheduling",
    summary: [
      "Jobs must be scheduled in AccuLynx within 48 hours of material delivery confirmation.",
      "Crews must be assigned based on skill level, availability, and job requirements.",
      "Customer must be notified of scheduled date minimum 48 hours in advance.",
      "Weather contingency plan must be documented for each scheduled job.",
      "Build week runs Sunday–Saturday for labor billing purposes.",
      "All labor orders must be emailed with billing@tsmroofs.com CC'd.",
    ],
    hardStops: [
      "No scheduling without confirmed materials on-site.",
      "No crew assignment without verified certifications for job type.",
      "No same-day scheduling changes without manager approval.",
    ],
  },
  {
    id: "SOP-04",
    title: "Job Site Safety & Compliance",
    summary: [
      "All crew members must follow OSHA safety standards at all times.",
      "PPE (Personal Protective Equipment) is required on all job sites — no exceptions.",
      "Safety violations result in immediate work stoppage.",
      "Daily safety briefing required before work begins.",
      "Ladder and fall protection requirements per OSHA guidelines.",
      "First aid kit and emergency contact information must be on-site.",
    ],
    hardStops: [
      "Immediate work stoppage for any safety violation.",
      "No crew member on roof without proper fall protection.",
      "No power tools without proper safety certification.",
    ],
  },
  {
    id: "SOP-05",
    title: "Quality Control & Inspections",
    summary: [
      "All completed work must pass internal QC inspection before customer walkthrough.",
      "Photo documentation is required at each project stage in CompanyCam.",
      "Required photos: before, during (key milestones), after completion.",
      "QC checklist must be completed and signed by crew lead.",
      "Any deficiencies must be corrected before customer final inspection.",
      "Customer walkthrough and sign-off required before job close.",
    ],
    hardStops: [
      "No customer walkthrough without completed QC checklist.",
      "No job close without customer sign-off.",
      "No final invoice without QC approval.",
    ],
  },
  {
    id: "SOP-06",
    title: "Supplement Processing",
    summary: [
      "Supplements must be submitted within 5 business days of discovery.",
      "All supplement documentation must include itemized scope and supporting photos.",
      "Supplement must reference original claim number and policy details.",
      "Photo evidence from CompanyCam required for all supplement items.",
      "Insurance adjuster communication must be documented in AccuLynx.",
      "Supplement approval must be obtained before additional work begins.",
    ],
    hardStops: [
      "No supplement work without written approval from insurance.",
      "No scope changes without documented supplement approval.",
      "5-day submission deadline is firm — missed deadlines require manager escalation.",
    ],
  },
  {
    id: "SOP-07",
    title: "Invoice & Collections",
    summary: [
      "Invoices must be issued within 24 hours of job completion.",
      "Payment follow-up schedule must be adhered to strictly.",
      "Follow-up schedule: Day 1 (invoice), Day 7 (reminder), Day 14 (final notice), Day 21 (escalation).",
      "All payment communications documented in AccuLynx.",
      "Payment plans require manager approval and documented agreement.",
      "Collections escalation follows defined process with legal review at Day 30.",
    ],
    hardStops: [
      "No job close without invoice issued.",
      "No write-offs without executive approval.",
      "No deviation from collection timeline without documented approval.",
    ],
  },
  {
    id: "SOP-08",
    title: "Lead-to-Contract Process",
    summary: [
      "All sales reps must follow the standardized lead intake, qualification, and contract execution workflow.",
      "Contracts MUST be signed before any work commences — no exceptions.",
      "All leads must be entered into AccuLynx within 24 hours of initial contact.",
      "Customer qualification checklist must be completed before presenting pricing.",
      "Contract must include complete scope of work, materials, timeline, and payment terms.",
      "Customer signature required on all contracts before scheduling.",
    ],
    hardStops: [
      "No verbal agreements — all terms must be documented.",
      "No work before signed contract.",
      "No scope changes without written change order.",
    ],
  },
  {
    id: "SOP-09",
    title: "Warranty Handling",
    summary: [
      "Warranty claims must be responded to within 24 hours of receipt.",
      "All warranty work must be documented and tracked to completion.",
      "Initial response must include acknowledgment and timeline for inspection.",
      "Warranty inspection must occur within 5 business days.",
      "Resolution timeline: inspection → approval → scheduling → completion → documentation.",
      "Customer communication required at each stage.",
    ],
    hardStops: [
      "24-hour response requirement is non-negotiable.",
      "No warranty claim closed without documented resolution.",
      "No warranty denial without manager review.",
    ],
  },
  {
    id: "SOP-10",
    title: "Customer Communication",
    summary: [
      "Customers must be updated at each project milestone.",
      "All communication must be professional and documented in AccuLynx.",
      "Required touchpoints: contract signing, scheduling, day before, completion, follow-up.",
      "Complaints must be escalated within 4 hours to manager.",
      "No social media responses without marketing approval.",
      "Customer satisfaction survey sent within 48 hours of completion.",
    ],
    hardStops: [
      "No missed milestone communications.",
      "All complaints escalated same-day.",
      "No unauthorized external communications.",
    ],
  },
];
