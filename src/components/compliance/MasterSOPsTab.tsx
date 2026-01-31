import { useState } from "react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Shield,
  AlertTriangle,
  FileText,
  Database,
  Camera,
  DollarSign,
  Skull,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";

// Full SOP content data
const MASTER_SOPS = [
  {
    id: "SOP-01",
    title: "Commission Submission & Approval",
    hasFlowchart: true,
    purpose: "Ensure commissions are calculated at assigned tiers, validated against margin gates, routed correctly, and protected from manipulation.",
    systemOwner: ["Sales Manager (review)", "Accounting (execution only)", "Ops Compliance (enforcement)"],
    finalAuthority: "Sheldon Murphy only.",
    entryCriteria: [
      "Job status is \"Completed\"",
      "Job closeout checklist is 100% complete",
      "No punch list items remain",
      "No materials are left on site",
      "Final contract value is locked",
      "Payment data exists in AccuLynx Payments tab",
    ],
    entryCriteriaNote: "If any condition is false → BLOCK submission.",
    sections: [
      {
        title: "Commission Basis Rules",
        content: [
          "Commission is calculated on the rep's ASSIGNED TIER.",
          "Gross margin acts as a VALIDATION GATE, not the calculator.",
        ],
      },
      {
        title: "Minimum Margins",
        content: [
          "Retail Shingle: 30% minimum",
          "Retail Tile: 35% minimum",
          "Insurance: 40% minimum / 45% target / 50% stretch",
        ],
      },
      {
        title: "Tier Drop Rule",
        content: [
          "For every 5% below the minimum margin, drop ONE FULL TIER.",
          "Automatic. No discretion. No manager override.",
        ],
      },
    ],
    steps: [
      {
        number: 1,
        title: "Sales Rep Submits Commission",
        owner: "Sales Rep",
        inputs: [
          "Job ID",
          "Deal type (Retail / Insurance)",
          "Assigned commission tier",
          "Gross margin %",
          "AccuLynx payment reference",
          "Acknowledgment checkbox for anti-gaming policy",
        ],
        action: "Submit through Commission Submission form → Route to assigned Sales Manager",
      },
      {
        number: 2,
        title: "Margin Validation Gate (SYSTEM)",
        owner: "System",
        logic: [
          "Validate margin against minimum",
          "If margin meets minimum → assigned tier applies",
          "If margin below minimum → auto tier drop",
          "If insurance margin <40% → FLAG for GM approval",
        ],
      },
      {
        number: 3,
        title: "Sales Manager Review",
        owner: "Sales Manager",
        mayDo: [
          "Approve",
          "Reject with reason",
          "Apply override ONLY if deal count is 1–10",
        ],
        mayNotDo: [
          "Override tier drops",
          "Approve sub-40% insurance margin",
          "Approve own commissions",
        ],
      },
      {
        number: 4,
        title: "Accounting Execution",
        owner: "Accounting",
        mayDo: [
          "Verify math",
          "Queue for payroll",
          "Apply payment",
        ],
        mayNotDo: [
          "Change tier",
          "Grant exceptions",
          "Interpret margin intent",
        ],
      },
    ],
    antiGamingRules: [
      "Running lower-tier jobs through higher-tier reps",
      "Proxy deal ownership",
      "Manager-generated commission structures",
      "Timing manipulation",
    ],
    antiGamingNote: "Any of the above = SEVERE violation + immediate termination escalation.",
    exitCriteria: [
      "Paid via payroll",
      "Logged as \"Paid\"",
      "Tied to AccuLynx Payments tab entry",
    ],
    content: [
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
      "Accounting cannot change tiers or grant exceptions.",
    ],
  },
  {
    id: "SOP-02",
    title: "Material Ordering & Delivery",
    hasFlowchart: true,
    content: [
      "Materials must be ordered within 24 hours of contract signing.",
      "All deliveries must be confirmed and documented with photos in CompanyCam.",
      "Delivery confirmation must include: date/time, materials received, condition verification.",
      "Any discrepancies must be reported immediately to supplier and documented.",
      "Material staging location must be verified with customer before delivery.",
    ],
    hardStops: [
      "No installation scheduling without confirmed material delivery.",
      "No acceptance of damaged materials without documentation and replacement order.",
    ],
  },
  {
    id: "SOP-03",
    title: "Production Scheduling",
    hasFlowchart: true,
    content: [
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
    hasFlowchart: false,
    content: [
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
    hasFlowchart: false,
    content: [
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
    hasFlowchart: false,
    content: [
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
    hasFlowchart: true,
    content: [
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
    title: "Commission Submission",
    hasFlowchart: false,
    content: [
      "Commission requests must be submitted with complete documentation.",
      "All advances must be accurately reported — discrepancies result in denial.",
      "False or misleading submissions result in immediate denial and potential termination.",
      "Commission source = AccuLynx Payments tab ONLY.",
      "Tier assignment based on documented performance metrics — no gaming allowed.",
      "Commission approval requires manager sign-off before accounting processing.",
    ],
    hardStops: [
      "No commission payment without complete documentation.",
      "No advances hidden or misreported.",
      "Tier gaming = immediate termination.",
      "Proxy ownership = immediate termination.",
      "Timing manipulation = immediate termination.",
    ],
  },
  {
    id: "SOP-09",
    title: "Warranty Handling",
    hasFlowchart: false,
    content: [
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
    hasFlowchart: false,
    content: [
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

// Commission SOP-01 Detailed Flowchart
function CommissionFlowchart() {
  return (
    <div className="my-4 p-4 bg-muted/30 rounded-lg space-y-4">
      <p className="text-xs text-muted-foreground font-medium">Commission Approval Flow:</p>
      <div className="space-y-3">
        {/* Step 1 */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium">
            Sales Rep Submits
          </div>
        </div>
        <div className="ml-6 border-l-2 border-primary/30 pl-4 py-1">
          <ArrowRight className="w-4 h-4 text-primary/50 -ml-6 mb-1" />
        </div>
        
        {/* Step 2 - Decision */}
        <div className="flex items-start gap-2">
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-medium">
            Margin Validation Gate
          </div>
        </div>
        <div className="ml-6 grid grid-cols-2 gap-4 border-l-2 border-primary/30 pl-4 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs">Meets Minimum → Assigned Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs">Below Minimum → Auto Tier Drop</span>
          </div>
        </div>
        
        {/* Step 3 */}
        <div className="flex items-start gap-2">
          <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs font-medium">
            Sales Manager Review
          </div>
        </div>
        <div className="ml-6 grid grid-cols-3 gap-2 border-l-2 border-primary/30 pl-4 py-2">
          <div className="flex items-center gap-1 text-xs">
            <XCircle className="w-3 h-3 text-red-500" />
            <span>Reject → Back to Rep</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Approve</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Override (Deals 1–10)</span>
          </div>
        </div>
        
        {/* Step 4 */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-xs font-medium">
            Accounting Executes
          </div>
        </div>
        <div className="ml-6 border-l-2 border-primary/30 pl-4 py-1">
          <ArrowRight className="w-4 h-4 text-primary/50 -ml-6 mb-1" />
        </div>
        
        {/* Step 5 */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
            Payroll (per SOP 09)
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple flowchart component
function SOPFlowchart({ sopId }: { sopId: string }) {
  // Special handling for SOP-01 Commission flowchart
  if (sopId === "SOP-01") {
    return <CommissionFlowchart />;
  }

  const flowcharts: Record<string, { steps: string[]; arrows?: boolean }> = {
    "SOP-02": {
      steps: [
        "Contract Signed",
        "Order Materials (24h)",
        "Confirm Delivery",
        "Photo Documentation",
        "Ready for Install",
      ],
      arrows: true,
    },
    "SOP-03": {
      steps: [
        "Materials Confirmed",
        "Assign Crew",
        "Schedule in AccuLynx",
        "Notify Customer (48h)",
        "Execute Build",
      ],
      arrows: true,
    },
    "SOP-07": {
      steps: [
        "Job Complete",
        "Issue Invoice (24h)",
        "Day 7 Reminder",
        "Day 14 Final Notice",
        "Day 21 Escalation",
        "Day 30 Legal",
      ],
      arrows: true,
    },
  };

  const flow = flowcharts[sopId];
  if (!flow) return null;

  return (
    <div className="my-4 p-4 bg-muted/30 rounded-lg overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-3 font-medium">Process Flow:</p>
      <div className="flex items-center gap-1 min-w-max">
        {flow.steps.map((step, idx) => (
          <div key={idx} className="flex items-center">
            <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium whitespace-nowrap">
              {step}
            </div>
            {idx < flow.steps.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-1 text-primary/50 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MasterSOPsTab() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("TSM Roof Pro — Master SOPs", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Version: ${SOPMASTER_VERSION}`, margin, yPos);
      yPos += 5;
      doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, margin, yPos);
      yPos += 15;

      // Authority Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("GLOBAL AUTHORITY", margin, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const authorityLines = [
        "• Sheldon Murphy = Final Exception Authority (rare exceptions only)",
        "• Ops Compliance Officer (Manny) = Primary enforcement (audits, blocks, escalates)",
        "• Accounting = Executes only (no interpretation, no exceptions)",
      ];
      authorityLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 5;

      // System of Record
      doc.setFont("helvetica", "bold");
      doc.text("SYSTEM OF RECORD", margin, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      const systemLines = [
        "• AccuLynx = source of truth for approvals/scope/contracts/changes",
        "• CompanyCam = only place for photos/documentation",
        "• Commission source = AccuLynx Payments tab ONLY",
      ];
      systemLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 5;

      // Termination Rules
      doc.setTextColor(180, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("TERMINATION-LEVEL VIOLATIONS", margin, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      doc.text("• Tier gaming, proxy ownership, timing manipulation = IMMEDIATE TERMINATION", margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Each SOP
      MASTER_SOPS.forEach((sop, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${sop.id} — ${sop.title}`, margin, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        sop.content.forEach((line) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const wrappedLines = doc.splitTextToSize(`• ${line}`, pageWidth - margin * 2);
          wrappedLines.forEach((wl: string) => {
            doc.text(wl, margin, yPos);
            yPos += 4.5;
          });
        });

        yPos += 3;
        doc.setFont("helvetica", "bold");
        doc.text("Hard Stops:", margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 0, 0);
        sop.hardStops.forEach((stop) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const wrappedLines = doc.splitTextToSize(`⛔ ${stop}`, pageWidth - margin * 2);
          wrappedLines.forEach((wl: string) => {
            doc.text(wl, margin, yPos);
            yPos += 4.5;
          });
        });
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      });

      doc.save(`TSM-Master-SOPs-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Download */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Master Standard Operating Procedures
          </h2>
          <p className="text-sm text-muted-foreground">
            Version: {SOPMASTER_VERSION}
          </p>
        </div>
        <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
          <Download className="w-4 h-4 mr-2" />
          {isGeneratingPDF ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      {/* Global Authority Section - Non-collapsible */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Global Authority Chain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <Badge className="bg-amber-500 text-white shrink-0">Final Authority</Badge>
              <div>
                <p className="font-medium">Sheldon Murphy</p>
                <p className="text-sm text-muted-foreground">
                  Final Exception Authority — rare exceptions only, documented and justified
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <Badge className="bg-blue-600 text-white shrink-0">Primary</Badge>
              <div>
                <p className="font-medium">Ops Compliance Officer (Manny)</p>
                <p className="text-sm text-muted-foreground">
                  Primary enforcement — audits, blocks, escalates. No exceptions granted at this level.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <Badge variant="secondary" className="shrink-0">Execution</Badge>
              <div>
                <p className="font-medium">Accounting</p>
                <p className="text-sm text-muted-foreground">
                  Executes only — no interpretation, no exceptions. Follows approved workflows.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System of Record Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            System of Record Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-sm">AccuLynx</p>
                <p className="text-xs text-muted-foreground">
                  Source of truth for approvals, scope, contracts, changes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Camera className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-sm">CompanyCam</p>
                <p className="text-xs text-muted-foreground">
                  Only place for photos and visual documentation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <DollarSign className="w-8 h-8 text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-sm">Commission Source</p>
                <p className="text-xs text-muted-foreground">
                  AccuLynx Payments tab ONLY
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Termination-Level Rules */}
      <Alert variant="destructive" className="border-2 border-destructive">
        <Skull className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Termination-Level Violations</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="font-medium mb-2">The following actions result in IMMEDIATE TERMINATION:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span><strong>Tier Gaming</strong> — Manipulating metrics or assignments to achieve unearned tier status</span>
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span><strong>Proxy Ownership</strong> — Using another person's credentials or identity for submissions</span>
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span><strong>Timing Manipulation</strong> — Deliberately altering dates or timelines to circumvent rules</span>
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* SOP Accordion */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Standard Operating Procedures (SOP 01–10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {MASTER_SOPS.map((sop) => (
              <AccordionItem key={sop.id} value={sop.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {sop.id}
                    </Badge>
                    <span className="font-medium text-left">{sop.title}</span>
                    {sop.hasFlowchart && (
                      <Badge variant="secondary" className="text-xs">
                        Flowchart
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-4 space-y-4">
                    {/* SOP-01 Special Detailed Rendering */}
                    {sop.id === "SOP-01" && 'purpose' in sop && (
                      <>
                        {/* Purpose */}
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Purpose</h4>
                          <p className="text-sm text-muted-foreground">{sop.purpose}</p>
                        </div>

                        {/* System Owner & Authority */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">System Owner</h4>
                            <ul className="text-sm space-y-1">
                              {sop.systemOwner?.map((owner: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  {owner}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Final Exception Authority</h4>
                            <p className="text-sm font-medium">{sop.finalAuthority}</p>
                          </div>
                        </div>

                        {/* Entry Criteria */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            Entry Criteria (ALL REQUIRED)
                          </h4>
                          <ul className="text-sm space-y-1 mb-2">
                            {sop.entryCriteria?.map((criteria: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-blue-500">✓</span>
                                {criteria}
                              </li>
                            ))}
                          </ul>
                          <p className="text-sm font-medium text-destructive">{sop.entryCriteriaNote}</p>
                        </div>

                        {/* Sections: Commission Basis, Margins, Tier Drop */}
                        <div className="space-y-3">
                          {sop.sections?.map((section: { title: string; content: string[] }, idx: number) => (
                            <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                              <h4 className="font-medium text-sm mb-2">{section.title}</h4>
                              <ul className="text-sm space-y-1">
                                {section.content.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {/* Step-by-Step Flow */}
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-primary" />
                            Step-by-Step Flow
                          </h4>
                          <div className="space-y-3">
                            {sop.steps?.map((step: any, idx: number) => (
                              <div key={idx} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-primary">{`Step ${step.number}`}</Badge>
                                  <span className="font-medium text-sm">{step.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Owner: {step.owner}</p>
                                
                                {step.inputs && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium mb-1">Required Inputs:</p>
                                    <ul className="text-xs space-y-0.5 pl-4">
                                      {step.inputs.map((input: string, i: number) => (
                                        <li key={i}>• {input}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {step.action && (
                                  <p className="text-xs"><strong>Action:</strong> {step.action}</p>
                                )}
                                
                                {step.logic && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium mb-1">Logic:</p>
                                    <ul className="text-xs space-y-0.5 pl-4">
                                      {step.logic.map((item: string, i: number) => (
                                        <li key={i}>• {item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {step.mayDo && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                      <p className="text-xs font-medium text-green-600 mb-1">May Do:</p>
                                      <ul className="text-xs space-y-0.5">
                                        {step.mayDo.map((item: string, i: number) => (
                                          <li key={i} className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-red-600 mb-1">May NOT:</p>
                                      <ul className="text-xs space-y-0.5">
                                        {step.mayNotDo?.map((item: string, i: number) => (
                                          <li key={i} className="flex items-center gap-1">
                                            <XCircle className="w-3 h-3 text-red-500" />
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Flowchart */}
                        {sop.hasFlowchart && <SOPFlowchart sopId={sop.id} />}

                        {/* Anti-Gaming Rules */}
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                            <Skull className="w-4 h-4" />
                            Anti-Gaming / Integrity Rules — ZERO TOLERANCE
                          </h4>
                          <ul className="text-sm space-y-1 mb-2">
                            {sop.antiGamingRules?.map((rule: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-destructive">
                                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {rule}
                              </li>
                            ))}
                          </ul>
                          <p className="text-sm font-bold text-destructive">{sop.antiGamingNote}</p>
                        </div>

                        {/* Exit Criteria */}
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Exit Criteria
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">Commission is complete ONLY when:</p>
                          <ul className="text-sm space-y-1">
                            {sop.exitCriteria?.map((criteria: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                {criteria}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Standard SOP Rendering for non-SOP-01 */}
                    {sop.id !== "SOP-01" && (
                      <>
                        {/* Flowchart if applicable */}
                        {sop.hasFlowchart && <SOPFlowchart sopId={sop.id} />}

                        {/* Content */}
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Requirements
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {sop.content.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Hard Stops */}
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-4 h-4" />
                            Hard Stops (Non-Negotiable)
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {sop.hardStops.map((stop, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-destructive">
                                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{stop}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Hard Stops for SOP-01 */}
                    {sop.id === "SOP-01" && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-4 h-4" />
                          Hard Stops (Non-Negotiable)
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {sop.hardStops.map((stop, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-destructive">
                              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{stop}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
