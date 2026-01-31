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
    title: "Lead-to-Contract Process",
    hasFlowchart: true,
    content: [
      "All sales representatives must follow the standardized lead intake, qualification, and contract execution workflow.",
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

// Simple flowchart component
function SOPFlowchart({ sopId }: { sopId: string }) {
  const flowcharts: Record<string, { steps: string[]; arrows?: boolean }> = {
    "SOP-01": {
      steps: [
        "Lead Intake",
        "Qualification",
        "Proposal",
        "Contract Review",
        "Customer Signature",
        "Schedule",
      ],
      arrows: true,
    },
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
