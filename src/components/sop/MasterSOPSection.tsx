import { useState, useRef, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  Skull,
  Loader2,
  Download,
  GitBranch,
} from "lucide-react";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSOPAcknowledgment } from "@/hooks/useSOPAcknowledgment";
import { MASTER_SOP_CONTENT } from "@/lib/masterSOPContent";
import { MermaidFlowchart } from "./MermaidFlowchart";

interface MasterSOPSectionProps {
  mode: "view" | "acknowledge";
  onAcknowledged?: () => void;
}

export function MasterSOPSection({ mode, onAcknowledged }: MasterSOPSectionProps) {
  const { user } = useAuth();
  const { acknowledge, isAcknowledging } = useSOPAcknowledgment();
  const [userName, setUserName] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hasScrolledAll, setHasScrolledAll] = useState(false);
  const [isAcknowledgeChecked, setIsAcknowledgeChecked] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Track scroll position
  useEffect(() => {
    if (mode !== "acknowledge") return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledAll(true);
        }
      },
      { threshold: 0.1 }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => observer.disconnect();
  }, [mode]);

  // Generate PDF document
  const generateAcknowledgmentPDF = async (): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TSM Roofing LLC — Master SOP Acknowledgment", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Version: ${SOPMASTER_VERSION}`, margin, yPos);
    yPos += 5;
    doc.text(`Signed: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, margin, yPos);
    yPos += 5;
    doc.text(`Employee: ${signedName || userName}`, margin, yPos);
    yPos += 5;
    doc.text(`Email: ${user?.email}`, margin, yPos);
    yPos += 15;

    // Separator
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Each SOP
    for (const sop of MASTER_SOP_CONTENT) {
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

      for (const line of sop.summary) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const wrappedLines = doc.splitTextToSize(`• ${line}`, pageWidth - margin * 2);
        for (const wl of wrappedLines) {
          doc.text(wl, margin, yPos);
          yPos += 4.5;
        }
      }

      yPos += 5;

      if (sop.hardStops && sop.hardStops.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Hard Stops:", margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 0, 0);
        for (const stop of sop.hardStops) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const wrappedLines = doc.splitTextToSize(`⛔ ${stop}`, pageWidth - margin * 2);
          for (const wl of wrappedLines) {
            doc.text(wl, margin, yPos);
            yPos += 4.5;
          }
        }
        doc.setTextColor(0, 0, 0);
      }
      yPos += 8;
    }

    // Signature section at end
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 10;
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ACKNOWLEDGMENT", margin, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    const ackText = `I, ${signedName || userName}, acknowledge that I have read, understand, and agree to comply with all Standard Operating Procedures (SOPs) listed above. I understand that failure to follow these procedures may result in disciplinary action, including termination.`;
    const wrappedAck = doc.splitTextToSize(ackText, pageWidth - margin * 2);
    for (const line of wrappedAck) {
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    yPos += 15;
    doc.text(`Digital Signature: ${signedName || userName}`, margin, yPos);
    yPos += 8;
    doc.text(`Date: ${format(new Date(), "MMMM d, yyyy 'at' h:mm:ss a")}`, margin, yPos);

    return doc.output("blob");
  };

  // Handle acknowledgment submission
  const handleAcknowledge = async () => {
    if (!user || !isAcknowledgeChecked || !signedName.trim()) {
      toast.error("Please complete all fields and check the acknowledgment box");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Generate PDF
      const pdfBlob = await generateAcknowledgmentPDF();
      const fileName = `SOP-Acknowledgment-${SOPMASTER_VERSION}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`;
      const filePath = `${user.id}/acknowledgments/${fileName}`;

      // Upload PDF to storage
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      // Create file record
      const { error: fileError } = await supabase.from("user_files").insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        file_size: pdfBlob.size,
        file_type: "application/pdf",
        document_type: "sop_acknowledgment",
      });

      if (fileError) throw fileError;

      // Update acknowledgment with document URL and signature
      await supabase
        .from("sop_acknowledgments")
        .update({
          document_url: filePath,
          signature_data: signedName,
          signed_name: signedName,
        })
        .eq("user_id", user.id)
        .eq("sop_key", "SOPMASTER")
        .eq("version", SOPMASTER_VERSION);

      // Submit acknowledgment
      await acknowledge();

      toast.success("SOPs acknowledged successfully! A copy has been saved to your documents.");
      onAcknowledged?.();
    } catch (error: any) {
      console.error("Acknowledgment error:", error);
      toast.error("Failed to submit acknowledgment: " + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const canAcknowledge = mode === "acknowledge" && hasScrolledAll && isAcknowledgeChecked && signedName.trim().length >= 2;

  return (
    <div className="space-y-4" ref={scrollContainerRef}>
      {/* Header */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Master Standard Operating Procedures
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Version: {SOPMASTER_VERSION}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "acknowledge" && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Required Reading</AlertTitle>
              <AlertDescription>
                Please read through all 10 SOPs below. You must scroll to the bottom and acknowledge each section before you can continue.
              </AlertDescription>
            </Alert>
          )}

          {/* Global Authority */}
          <div className="mb-4 p-3 bg-background rounded-lg border space-y-2">
            <h4 className="font-medium text-sm">Authority Chain</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white text-xs">Final</Badge>
                <span>Sheldon Murphy — Exception Authority</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-xs">Primary</Badge>
                <span>Ops Compliance (Manny) — Enforcement</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Execution</Badge>
                <span>Accounting — No exceptions</span>
              </div>
            </div>
          </div>

          {/* Termination Warning */}
          <Alert variant="destructive" className="mb-4">
            <Skull className="h-4 w-4" />
            <AlertTitle className="text-sm font-bold">Termination-Level Violations</AlertTitle>
            <AlertDescription className="text-xs">
              Tier gaming, proxy ownership, timing manipulation = IMMEDIATE TERMINATION
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SOP Accordion */}
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpandedItems}
        className="space-y-2"
      >
        {MASTER_SOP_CONTENT.map((sop) => (
          <AccordionItem key={sop.id} value={sop.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {sop.id}
                </Badge>
                <span className="font-medium text-sm">{sop.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 text-sm">
                {/* Flowchart */}
                {sop.flowchart && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-xs flex items-center gap-1.5 text-muted-foreground">
                      <GitBranch className="w-3.5 h-3.5" />
                      Process Flow
                    </h5>
                    <MermaidFlowchart chart={sop.flowchart} id={sop.id} />
                  </div>
                )}

                {/* Summary points */}
                <div className="space-y-2">
                  <h5 className="font-medium text-xs text-muted-foreground">Key Points</h5>
                  <ul className="space-y-1.5">
                    {sop.summary.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hard Stops */}
                {sop.hardStops && sop.hardStops.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h5 className="font-medium text-xs mb-2 flex items-center gap-1 text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Hard Stops
                    </h5>
                    <ul className="space-y-1">
                      {sop.hardStops.map((stop, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-destructive">
                          <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
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

      {/* Scroll marker for detection */}
      <div ref={bottomRef} className="h-1" />

      {/* Acknowledgment Section */}
      {mode === "acknowledge" && (
        <Card className={`sticky bottom-0 border-2 ${hasScrolledAll ? "border-primary bg-background" : "border-muted bg-muted/50"}`}>
          <CardContent className="p-4 space-y-4">
            {!hasScrolledAll && (
              <p className="text-center text-sm text-muted-foreground">
                ↓ Scroll through all SOPs to enable acknowledgment ↓
              </p>
            )}

            {hasScrolledAll && (
              <>
                {/* Signature Input */}
                <div className="space-y-2">
                  <Label htmlFor="signed-name" className="text-sm font-medium">
                    Type your full legal name to sign
                  </Label>
                  <Input
                    id="signed-name"
                    placeholder="Enter your full name"
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    className="text-center font-medium"
                  />
                </div>

                {/* Acknowledgment Checkbox */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="acknowledge"
                    checked={isAcknowledgeChecked}
                    onCheckedChange={(checked) => setIsAcknowledgeChecked(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                    I have read, understand, and agree to comply with all Standard Operating Procedures listed above. 
                    I understand that failure to follow these procedures may result in disciplinary action, including termination.
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleAcknowledge}
                  disabled={!canAcknowledge || isAcknowledging || isGeneratingPDF}
                  className="w-full"
                  size="lg"
                >
                  {isAcknowledging || isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acknowledge & Sign
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Mode - Download Button */}
      {mode === "view" && (
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      )}
    </div>
  );
}
