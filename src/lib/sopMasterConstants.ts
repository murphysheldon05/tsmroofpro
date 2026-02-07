// Master SOP Version - Update this when SOPs change to require re-acknowledgment
export const SOPMASTER_VERSION = "2025-01-30-v1";

// Full Master SOP content for individual acknowledgment
export const SOPMASTER_CONTENT = [
  {
    number: 1,
    id: "SOP-01",
    title: "Lead-to-Contract Process",
    summary: "All sales reps must follow the standardized lead intake, qualification, and contract execution workflow. Contracts must be signed before any work commences.",
    fullContent: `
## Purpose
Establish a consistent, compliant process for converting leads into signed contracts.

## When to Use
Every new lead from any source (referral, door knock, storm chase, marketing).

## Quick Steps (Field Summary)
1. Qualify the lead within 24 hours
2. Complete roof inspection with photos
3. Create estimate in AccuLynx
4. Present contract and secure signature
5. Collect down payment (if applicable)

## Step-by-Step Procedure
1. **Lead Intake**: Log lead in AccuLynx with complete contact information and source
2. **Initial Contact**: Call within 2 hours during business hours, 24 hours max
3. **Qualification**: Confirm property ownership, insurance status, and decision-maker availability
4. **Inspection**: Complete full roof inspection with CompanyCam documentation
5. **Estimate Creation**: Build detailed estimate in AccuLynx using current pricing
6. **Contract Presentation**: Review scope, timeline, and payment terms with homeowner
7. **Signature Collection**: Obtain wet signature or digital signature via DocuSign
8. **Down Payment**: Collect any required upfront payment
9. **Handoff**: Submit to Production within 24 hours of signing

## Hard Stops
- NO work begins without a signed contract
- NO verbal agreements without written follow-up
- STOP if property ownership cannot be verified

## Common Mistakes
- Rushing inspection to close faster
- Not documenting all damage areas
- Skipping insurance verification

## Deliverables
- Signed contract in AccuLynx
- Complete photo set in CompanyCam
- Down payment receipt (if applicable)
    `,
  },
  {
    number: 2,
    id: "SOP-02",
    title: "Material Ordering & Delivery",
    summary: "Materials must be ordered within 24 hours of contract signing. All deliveries must be confirmed and documented with photos.",
    fullContent: `
## Purpose
Ensure timely and accurate material procurement and delivery coordination.

## When to Use
After every signed contract, before production scheduling.

## Quick Steps (Field Summary)
1. Verify material list against scope
2. Submit order to supplier within 24 hours
3. Confirm delivery date
4. Document delivery with photos
5. Verify quantities received

## Step-by-Step Procedure
1. **Scope Review**: Verify all materials needed match the contract scope
2. **Quantity Calculation**: Double-check squares, linear feet, and waste factor
3. **Order Submission**: Place order with approved supplier within 24 hours
4. **Delivery Scheduling**: Coordinate delivery 1-2 days before scheduled build
5. **Homeowner Notification**: Inform customer of delivery date and expectations
6. **Delivery Confirmation**: Verify delivery occurred at correct address
7. **Photo Documentation**: Photograph all delivered materials via CompanyCam
8. **Quantity Verification**: Count and verify all items against order
9. **Damage Check**: Inspect for damaged or incorrect materials
10. **Discrepancy Reporting**: Report any issues immediately to office

## Hard Stops
- NO ordering without signed contract
- NO scheduling build without confirmed delivery
- STOP if materials are damaged or incorrect

## Common Mistakes
- Ordering wrong color or style
- Not accounting for waste factor
- Missing delivery window

## Deliverables
- Order confirmation in AccuLynx
- Delivery photos in CompanyCam
- Signed delivery receipt
    `,
  },
  {
    number: 3,
    id: "SOP-03",
    title: "Production Scheduling",
    summary: "Jobs must be scheduled in AccuLynx within 48 hours of material delivery. Crews must be assigned based on skill level and availability.",
    fullContent: `
## Purpose
Optimize crew utilization and ensure on-time project completion.

## When to Use
After materials are confirmed for delivery.

## Quick Steps (Field Summary)
1. Confirm material delivery date
2. Check crew availability
3. Schedule in AccuLynx
4. Notify homeowner
5. Brief crew on scope

## Step-by-Step Procedure
1. **Material Confirmation**: Verify delivery is scheduled and confirmed
2. **Weather Check**: Review 5-day forecast for build date
3. **Crew Assessment**: Evaluate required skill level for job type
4. **Availability Check**: Confirm crew availability for target date
5. **Schedule Entry**: Enter job in AccuLynx production calendar
6. **Crew Assignment**: Assign crew with appropriate skills and capacity
7. **Homeowner Call**: Notify customer 48 hours before scheduled date
8. **Crew Brief**: Provide job details, scope, and special instructions
9. **Material Staging**: Ensure materials are staged and accessible
10. **Backup Plan**: Have contingency crew identified for emergencies

## Hard Stops
- NO scheduling without material confirmation
- NO scheduling in severe weather forecast
- STOP if crew capacity exceeded

## Common Mistakes
- Overbooking crews
- Not checking weather
- Forgetting customer notification

## Deliverables
- Job scheduled in AccuLynx
- Crew assignment confirmed
- Homeowner notification logged
    `,
  },
  {
    number: 4,
    id: "SOP-04",
    title: "Job Site Safety & Compliance",
    summary: "All crew members must follow OSHA safety standards. PPE is required on all job sites. Safety violations result in immediate work stoppage.",
    fullContent: `
## Purpose
Maintain a zero-injury workplace and full OSHA compliance.

## When to Use
Every job site, every day, no exceptions.

## Quick Steps (Field Summary)
1. Conduct pre-job safety briefing
2. Verify all PPE is worn
3. Secure work area
4. Monitor conditions continuously
5. Document any incidents

## Step-by-Step Procedure
1. **Pre-Job Meeting**: Conduct tailgate safety meeting before work begins
2. **PPE Verification**: Confirm all workers have proper protective equipment
3. **Site Assessment**: Identify and mitigate hazards before starting
4. **Perimeter Security**: Establish work zone with cones/barriers
5. **Ladder Safety**: Ensure proper ladder placement and usage
6. **Fall Protection**: Verify harness systems for steep roofs
7. **Tool Check**: Inspect all tools and equipment for defects
8. **Continuous Monitoring**: Watch for changing conditions
9. **Incident Response**: Stop work immediately for any safety concern
10. **End-of-Day Review**: Debrief on any issues or near-misses

## Hard Stops
- IMMEDIATE work stoppage for any safety violation
- NO work without proper PPE
- STOP if any worker is impaired

## Common Mistakes
- Skipping safety briefing to save time
- Not securing tools on roof
- Working in deteriorating weather

## Deliverables
- Completed safety checklist
- Incident reports (if any)
- Daily sign-in sheet
    `,
  },
  {
    number: 5,
    id: "SOP-05",
    title: "Quality Control & Inspections",
    summary: "All completed work must pass internal QC inspection before customer walkthrough. Photo documentation is required at each stage.",
    fullContent: `
## Purpose
Ensure every job meets TSM quality standards before handoff.

## When to Use
During and after every installation.

## Quick Steps (Field Summary)
1. Document progress photos
2. Complete QC checklist
3. Identify punch list items
4. Fix before customer walk
5. Final photo documentation

## Step-by-Step Procedure
1. **Progress Photos**: Capture each phase of installation
2. **Substrate Check**: Verify decking condition before shingle application
3. **Flashing Inspection**: Check all penetrations and transitions
4. **Shingle Alignment**: Verify straight lines and proper overlap
5. **Ridge Cap Review**: Confirm proper installation and sealing
6. **Drip Edge Check**: Verify proper installation at edges
7. **Cleanup Inspection**: Ensure all debris removed from property
8. **Punch List Creation**: Document any items needing correction
9. **Correction Completion**: Fix all punch items before walkthrough
10. **Final Documentation**: Complete photo set in CompanyCam

## Hard Stops
- NO customer walkthrough until QC passed
- NO final invoice without completed checklist
- STOP if structural issues discovered

## Common Mistakes
- Rushing QC to move to next job
- Missing flashing defects
- Incomplete cleanup

## Deliverables
- Completed QC checklist
- Full photo documentation
- Punch list resolution record
    `,
  },
  {
    number: 6,
    id: "SOP-06",
    title: "Supplement Processing",
    summary: "Supplements must be submitted within 5 business days of discovery. All supplement documentation must include itemized scope and photos.",
    fullContent: `
## Purpose
Maximize recoverable revenue through proper supplement documentation.

## When to Use
When additional damage or scope is discovered beyond original claim.

## Quick Steps (Field Summary)
1. Document additional damage
2. Create itemized scope
3. Submit within 5 days
4. Follow up weekly
5. Track in AccuLynx

## Step-by-Step Procedure
1. **Discovery Documentation**: Photo and note all additional damage
2. **Scope Assessment**: Determine full extent of additional work needed
3. **Xactimate Entry**: Create detailed supplement in Xactimate
4. **Photo Attachment**: Attach all supporting photos to supplement
5. **Review Check**: Have manager review before submission
6. **Submission**: Submit to insurance within 5 business days
7. **Adjuster Follow-up**: Contact adjuster within 48 hours of submission
8. **Weekly Tracking**: Check status weekly until resolved
9. **Approval Documentation**: Document approved amounts
10. **Scope Update**: Update job scope in AccuLynx

## Hard Stops
- NO supplement without photo documentation
- NO submission without manager approval
- STOP if scope not accurately represented

## Common Mistakes
- Missing the 5-day deadline
- Incomplete photo documentation
- Not following up consistently

## Deliverables
- Submitted supplement in Xactimate
- Photo documentation package
- Tracking log in AccuLynx
    `,
  },
  {
    number: 7,
    id: "SOP-07",
    title: "Invoice & Collections",
    summary: "Invoices must be issued within 24 hours of job completion. Payment follow-up schedule must be adhered to strictly.",
    fullContent: `
## Purpose
Ensure timely revenue collection and healthy cash flow.

## When to Use
After every completed job passes QC inspection.

## Quick Steps (Field Summary)
1. Generate invoice within 24 hours
2. Send to customer
3. Follow up at 7 days
4. Escalate at 30 days
5. Final notice at 45 days

## Step-by-Step Procedure
1. **Completion Verification**: Confirm job passed QC inspection
2. **Invoice Generation**: Create invoice in AccuLynx within 24 hours
3. **Amount Verification**: Confirm all supplements and change orders included
4. **Invoice Delivery**: Send invoice via email and mail
5. **7-Day Follow-up**: Courtesy call if no payment received
6. **14-Day Follow-up**: Second contact with payment request
7. **30-Day Escalation**: Manager involvement for past-due accounts
8. **45-Day Notice**: Formal collection notice issued
9. **60-Day Action**: Legal collection process initiated
10. **Payment Processing**: Record all payments in AccuLynx

## Hard Stops
- NO invoice without completed QC
- NO skipping collection steps
- STOP collections if dispute filed

## Common Mistakes
- Delaying invoice generation
- Not following up consistently
- Missing payment application

## Deliverables
- Invoice in AccuLynx
- Collection activity log
- Payment receipts
    `,
  },
  {
    number: 8,
    id: "SOP-08",
    title: "Commission Submission",
    summary: "Commission requests must be submitted with complete documentation. All advances must be accurately reported. False submissions result in denial.",
    fullContent: `
## Purpose
Ensure accurate and timely commission processing for sales team.

## When to Use
After job completion and payment collection milestones.

## Quick Steps (Field Summary)
1. Verify job completion
2. Confirm payment received
3. Complete commission form
4. Attach all documentation
5. Submit for approval

## Step-by-Step Procedure
1. **Completion Check**: Verify job is fully complete and passed QC
2. **Payment Verification**: Confirm customer payment received
3. **Revenue Calculation**: Confirm total job revenue including supplements
4. **Advance Review**: Document all advances already received
5. **Commission Calculation**: Apply correct tier rate to profit
6. **Form Completion**: Fill out commission worksheet completely
7. **Documentation Attachment**: Attach signed contract, COC, payment proof
8. **Accuracy Review**: Double-check all numbers before submission
9. **Manager Submission**: Route to assigned manager for review
10. **Tracking**: Monitor status through approval process

## Hard Stops
- NO commission without COC (Certificate of Completion)
- NO submission with inaccurate advance reporting
- STOP if documentation incomplete

## Common Mistakes
- Submitting before payment received
- Forgetting to report advances
- Missing required documentation

## Deliverables
- Completed commission form
- Supporting documentation
- Submission confirmation
    `,
  },
  {
    number: 9,
    id: "SOP-09",
    title: "Warranty Handling",
    summary: "Warranty claims must be responded to within 24 hours. All warranty work must be documented and tracked to completion.",
    fullContent: `
## Purpose
Maintain customer satisfaction and company reputation through responsive warranty service.

## When to Use
For any customer warranty claim or issue reported.

## Quick Steps (Field Summary)
1. Log claim within 1 hour
2. Contact customer within 24 hours
3. Schedule inspection
4. Complete repair
5. Document resolution

## Step-by-Step Procedure
1. **Claim Receipt**: Log warranty claim in system within 1 hour of receipt
2. **Customer Contact**: Call customer within 24 hours to acknowledge
3. **Issue Assessment**: Gather detailed information about the problem
4. **Inspection Schedule**: Set inspection within 3-5 business days
5. **On-Site Inspection**: Document issue with photos in CompanyCam
6. **Resolution Plan**: Determine repair scope and timeline
7. **Repair Scheduling**: Schedule repair crew within 7 days of inspection
8. **Repair Completion**: Complete all necessary repairs
9. **Customer Sign-off**: Obtain customer confirmation of resolution
10. **Warranty Close**: Update warranty record as resolved

## Hard Stops
- NO 24-hour response time exceeded
- NO closing without customer confirmation
- STOP if issue is outside warranty scope (escalate)

## Common Mistakes
- Delayed initial response
- Not documenting the resolution
- Closing without customer confirmation

## Deliverables
- Warranty claim record
- Inspection photos
- Resolution documentation
    `,
  },
  {
    number: 10,
    id: "SOP-10",
    title: "Customer Communication",
    summary: "Customers must be updated at each project milestone. All communication must be professional and documented in AccuLynx.",
    fullContent: `
## Purpose
Build trust and reduce callbacks through proactive customer communication.

## When to Use
At every stage of the customer journey.

## Quick Steps (Field Summary)
1. Confirm contact at each milestone
2. Document all communication
3. Respond within 4 hours
4. Use professional tone
5. Log in AccuLynx

## Step-by-Step Procedure
1. **Contract Signing**: Thank customer and confirm next steps
2. **Material Order**: Notify of order placement and expected delivery
3. **Delivery Confirmation**: Confirm materials arrived at property
4. **Pre-Install Call**: Reminder 24-48 hours before installation
5. **Day-of Update**: Morning call on installation day
6. **Progress Updates**: Mid-day text with photo of progress
7. **Completion Notification**: Call when crew is finishing up
8. **Walkthrough Scheduling**: Arrange final walkthrough time
9. **Post-Install Follow-up**: Satisfaction check 3-5 days after
10. **Review Request**: Request review at appropriate time

## Hard Stops
- NO radio silence for more than 48 hours
- NO unprofessional language or tone
- STOP if customer requests no contact (escalate)

## Common Mistakes
- Forgetting milestone updates
- Not logging communication
- Overpromising on timelines

## Deliverables
- Communication log in AccuLynx
- Customer satisfaction confirmation
- Review collection (when appropriate)
    `,
  },
];

// Legacy summary format for compatibility
export const SOPMASTER_SUMMARY = SOPMASTER_CONTENT.map(sop => ({
  id: sop.id,
  title: sop.title,
  summary: sop.summary,
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
