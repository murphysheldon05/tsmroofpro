// Master SOP Version - Update this when SOPs change to require re-acknowledgment
export const SOPMASTER_VERSION = "2025-01-30-v1";

// Master SOP content summary for acknowledgment gate
export const SOPMASTER_SUMMARY = [
  {
    id: "SOP-01",
    title: "Lead-to-Contract Process",
    summary: "All sales reps must follow the standardized lead intake, qualification, and contract execution workflow. Contracts must be signed before any work commences.",
  },
  {
    id: "SOP-02",
    title: "Material Ordering & Delivery",
    summary: "Materials must be ordered within 24 hours of contract signing. All deliveries must be confirmed and documented with photos.",
  },
  {
    id: "SOP-03",
    title: "Production Scheduling",
    summary: "Jobs must be scheduled in AccuLynx within 48 hours of material delivery. Crews must be assigned based on skill level and availability.",
  },
  {
    id: "SOP-04",
    title: "Job Site Safety & Compliance",
    summary: "All crew members must follow OSHA safety standards. PPE is required on all job sites. Safety violations result in immediate work stoppage.",
  },
  {
    id: "SOP-05",
    title: "Quality Control & Inspections",
    summary: "All completed work must pass internal QC inspection before customer walkthrough. Photo documentation is required at each stage.",
  },
  {
    id: "SOP-06",
    title: "Supplement Processing",
    summary: "Supplements must be submitted within 5 business days of discovery. All supplement documentation must include itemized scope and photos.",
  },
  {
    id: "SOP-07",
    title: "Invoice & Collections",
    summary: "Invoices must be issued within 24 hours of job completion. Payment follow-up schedule must be adhered to strictly.",
  },
  {
    id: "SOP-08",
    title: "Commission Submission",
    summary: "Commission requests must be submitted with complete documentation. All advances must be accurately reported. False submissions result in denial.",
  },
  {
    id: "SOP-09",
    title: "Warranty Handling",
    summary: "Warranty claims must be responded to within 24 hours. All warranty work must be documented and tracked to completion.",
  },
  {
    id: "SOP-10",
    title: "Customer Communication",
    summary: "Customers must be updated at each project milestone. All communication must be professional and documented in AccuLynx.",
  },
];

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
