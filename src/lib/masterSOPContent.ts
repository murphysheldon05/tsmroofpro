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
  flowchart?: string;
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
    flowchart: `graph TD
    A[Job Completed] --> B{Entry Criteria Met?}
    B -->|No| C[BLOCKED - Fix Issues]
    B -->|Yes| D[Submit Commission]
    D --> E{Margin Check}
    E -->|Below Min| F[Auto Tier Drop]
    E -->|At/Above Min| G[Keep Current Tier]
    F --> H[Sales Manager Review]
    G --> H
    H -->|Approve| I[Accounting Verification]
    H -->|Reject| J[Return to Rep]
    I --> K[Queue for Payroll]
    K --> L[Payment Applied]
    
    style C fill:#ef4444,color:#fff
    style F fill:#f59e0b,color:#fff
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Build Complete] --> B{CompanyCam 100%?}
    B -->|No| C[Complete Checklist]
    B -->|Yes| D{Job Type?}
    D -->|Retail| E[Sales Issues Invoice]
    D -->|Insurance| F[Supplements Finalizes Scope]
    F --> G[Supplements Issues Carrier Invoice]
    E --> H[Customer Payment]
    G --> H
    H --> I{Paid in Full?}
    I -->|No| J[Collections Follow-up]
    J --> H
    I -->|Yes| K[Accounting Closes Job]
    
    style C fill:#f59e0b,color:#fff
    style K fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Materials Delivered] --> B[Confirm Delivery in AccuLynx]
    B --> C{Within 48hrs?}
    C -->|Yes| D[Schedule Job in AccuLynx]
    C -->|No| E[VIOLATION - Escalate]
    D --> F[Assign Crew]
    F --> G{Crew Certified?}
    G -->|No| H[Reassign Crew]
    G -->|Yes| I[Document Weather Plan]
    I --> J[Notify Customer 48hrs Prior]
    J --> K[Email Labor Order]
    K --> L[CC billing@tsmroofs.com]
    
    style E fill:#ef4444,color:#fff
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Crew Arrives On-Site] --> B[Daily Safety Briefing]
    B --> C{All PPE Present?}
    C -->|No| D[STOP - Get PPE]
    C -->|Yes| E{Fall Protection Ready?}
    E -->|No| F[STOP - Setup Protection]
    E -->|Yes| G[Verify First Aid Kit]
    G --> H[Confirm Emergency Contacts]
    H --> I[Begin Work]
    I --> J{Violation Observed?}
    J -->|Yes| K[IMMEDIATE WORK STOP]
    J -->|No| L[Continue Work Safely]
    
    style D fill:#ef4444,color:#fff
    style F fill:#ef4444,color:#fff
    style K fill:#ef4444,color:#fff
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Work Complete] --> B[Upload Before/During/After Photos]
    B --> C[Crew Lead Completes QC Checklist]
    C --> D[Internal QC Inspection]
    D --> E{Pass Inspection?}
    E -->|No| F[Correct Deficiencies]
    F --> D
    E -->|Yes| G[Schedule Customer Walkthrough]
    G --> H[Customer Inspection]
    H --> I{Customer Approves?}
    I -->|No| J[Address Concerns]
    J --> H
    I -->|Yes| K[Customer Signs Off]
    K --> L[Proceed to Closeout]
    
    style F fill:#f59e0b,color:#fff
    style J fill:#f59e0b,color:#fff
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Additional Damage Discovered] --> B{Within 5 Days?}
    B -->|No| C[Manager Escalation Required]
    B -->|Yes| D[Document in CompanyCam]
    C --> D
    D --> E[Prepare Itemized Scope]
    E --> F[Reference Claim Number]
    F --> G[Submit Supplement]
    G --> H[Log Adjuster Communication]
    H --> I{Approved?}
    I -->|No| J[Negotiate/Resubmit]
    J --> I
    I -->|Yes| K[Document Approval in AccuLynx]
    K --> L[Proceed with Work]
    
    style C fill:#f59e0b,color:#fff
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Job Complete] --> B[Issue Invoice Day 1]
    B --> C{Payment Received?}
    C -->|Yes| D[Apply Payment - Close Job]
    C -->|No| E[Day 7 Reminder]
    E --> F{Payment Received?}
    F -->|Yes| D
    F -->|No| G[Day 14 Final Notice]
    G --> H{Payment Received?}
    H -->|Yes| D
    H -->|No| I[Day 21 Escalation]
    I --> J{Payment Plan?}
    J -->|Yes| K[Manager Approval Required]
    J -->|No| L[Day 30 Legal Review]
    K --> M[Document Agreement]
    
    style D fill:#22c55e,color:#fff
    style L fill:#ef4444,color:#fff`,
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
    flowchart: `graph TD
    A[Lead Received] --> B[Enter in AccuLynx within 24hrs]
    B --> C[Initial Contact & Qualification]
    C --> D[Complete Qualification Checklist]
    D --> E[Site Inspection]
    E --> F[Prepare Proposal]
    F --> G[Present Pricing]
    G --> H{Customer Agrees?}
    H -->|No| I[Negotiate/Follow-up]
    I --> H
    H -->|Yes| J[Draft Contract]
    J --> K[Include Scope, Materials, Timeline]
    K --> L[Customer Signs Contract]
    L --> M[Schedule Job]
    
    style L fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Warranty Claim Received] --> B{Within 24hrs?}
    B -->|No| C[VIOLATION - Escalate]
    B -->|Yes| D[Acknowledge & Set Timeline]
    C --> D
    D --> E[Schedule Inspection within 5 Days]
    E --> F[Perform Inspection]
    F --> G{Valid Claim?}
    G -->|No| H[Manager Review Required]
    G -->|Yes| I[Approve Warranty Work]
    H --> J{Deny or Approve?}
    J -->|Deny| K[Document Denial Reason]
    J -->|Approve| I
    I --> L[Schedule Repair]
    L --> M[Complete Work]
    M --> N[Document Resolution]
    N --> O[Customer Confirmation]
    
    style C fill:#ef4444,color:#fff
    style O fill:#22c55e,color:#fff`,
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
    flowchart: `graph TD
    A[Contract Signed] --> B[Confirm in AccuLynx]
    B --> C[Schedule Notification]
    C --> D[Day Before Reminder]
    D --> E[Work Begins]
    E --> F{Complaint Received?}
    F -->|Yes| G[Escalate within 4hrs]
    G --> H[Manager Response]
    F -->|No| I[Completion Notification]
    H --> I
    I --> J[Send Satisfaction Survey 48hrs]
    J --> K[Follow-up Communication]
    K --> L[Document All in AccuLynx]
    
    style G fill:#f59e0b,color:#fff
    style L fill:#22c55e,color:#fff`,
  },
];
