export const TRADE_TYPES = [
  { value: "roofing", label: "Roofing" },
  { value: "tile", label: "Tile" },
  { value: "shingle", label: "Shingle" },
  { value: "foam", label: "Foam" },
  { value: "coatings", label: "Coatings" },
  { value: "metal", label: "Metal" },
  { value: "gutters", label: "Gutters" },
  { value: "drywall", label: "Drywall" },
  { value: "paint", label: "Paint" },
  { value: "other", label: "Other" },
];

export const SERVICE_AREAS = [
  { value: "phoenix_metro", label: "Phoenix Metro" },
  { value: "west_valley", label: "West Valley" },
  { value: "east_valley", label: "East Valley" },
  { value: "north_valley", label: "North Valley" },
  { value: "prescott", label: "Prescott" },
  { value: "other", label: "Other" },
];

export const ENTITY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "do_not_use", label: "Do Not Use" },
];

export const DOC_STATUSES = [
  { value: "received", label: "Received" },
  { value: "missing", label: "Missing" },
];

export const VENDOR_TYPES = [
  { value: "supplier", label: "Supplier" },
  { value: "dump", label: "Dump" },
  { value: "equipment_rental", label: "Equipment Rental" },
  { value: "safety", label: "Safety" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

export const CONTACT_METHODS = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
];

export const PROSPECT_TYPES = [
  { value: "subcontractor", label: "Subcontractor" },
  { value: "vendor", label: "Vendor" },
];

export const PROSPECT_SOURCES = [
  { value: "inbound_call", label: "Inbound Call" },
  { value: "referral", label: "Referral" },
  { value: "jobsite_meet", label: "Jobsite Meet" },
  { value: "other", label: "Other" },
];

export const PROSPECT_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "waiting_docs", label: "Waiting Docs" },
  { value: "trial_job", label: "Trial Job" },
  { value: "approved", label: "Approved" },
  { value: "not_a_fit", label: "Not a Fit" },
];

export const ASSIGNED_OWNERS = [
  { value: "Courtney Murphy", label: "Courtney Murphy" },
  { value: "Jayden Abramsen", label: "Jayden Abramsen" },
  { value: "Paul Santiano", label: "Paul Santiano" },
  { value: "David", label: "David" },
  { value: "Other", label: "Other" },
];

export const COMPLIANCE_DOCS = [
  { value: "COI", label: "COI (Certificate of Insurance)" },
  { value: "W-9", label: "W-9" },
  { value: "IC Agreement", label: "Independent Contractor Agreement" },
  { value: "Other", label: "Other" },
];

export function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "on_hold":
      return "bg-yellow-100 text-yellow-800";
    case "do_not_use":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getDocStatusColor(status: string) {
  switch (status) {
    case "received":
      return "bg-green-100 text-green-800";
    case "missing":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getStageColor(stage: string) {
  switch (stage) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "contacted":
      return "bg-purple-100 text-purple-800";
    case "waiting_docs":
      return "bg-yellow-100 text-yellow-800";
    case "trial_job":
      return "bg-orange-100 text-orange-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "not_a_fit":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
