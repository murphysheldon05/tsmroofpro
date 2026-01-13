import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubcontractors, useUpdateSubcontractor } from "@/hooks/useSubcontractors";
import { useVendors, useUpdateVendor } from "@/hooks/useVendors";
import { useProspects } from "@/hooks/useProspects";
import { useCreateComplianceRequest } from "@/hooks/useComplianceRequests";
import { COMPLIANCE_DOCS } from "@/lib/directoryConstants";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";

interface ComplianceRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComplianceRequestForm({ open, onOpenChange }: ComplianceRequestFormProps) {
  const [recipientType, setRecipientType] = useState<string>("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [generatedMessage, setGeneratedMessage] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const { data: subcontractors = [] } = useSubcontractors();
  const { data: vendors = [] } = useVendors();
  const { data: prospects = [] } = useProspects();
  const createRequest = useCreateComplianceRequest();
  const updateSubcontractor = useUpdateSubcontractor();
  const updateVendor = useUpdateVendor();

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      notes: "",
    },
  });

  const getRecipients = () => {
    switch (recipientType) {
      case "subcontractor":
        return subcontractors.map((s) => ({ id: s.id, name: s.company_name, email: s.email }));
      case "vendor":
        return vendors.map((v) => ({ id: v.id, name: v.vendor_name, email: v.email }));
      case "prospect":
        return prospects.map((p) => ({ id: p.id, name: p.company_name, email: p.email }));
      default:
        return [];
    }
  };

  const getSelectedRecipient = () => {
    return getRecipients().find((r) => r.id === recipientId);
  };

  const generateEmailMessage = () => {
    const recipient = getSelectedRecipient();
    const notes = watch("notes");
    
    const docsList = selectedDocs.map((d) => 
      COMPLIANCE_DOCS.find((doc) => doc.value === d)?.label || d
    ).join("\n- ");

    const message = `Dear ${recipient?.name || "Partner"},

TSM Roofing LLC is requesting the following compliance documents from you:

- ${docsList}

${dueDate ? `Please submit these documents by: ${new Date(dueDate).toLocaleDateString()}` : ""}

${notes ? `Additional Notes:\n${notes}` : ""}

Please reply to this email with the requested documents attached, or upload them to our portal.

Thank you for your prompt attention to this matter.

Best regards,
TSM Roofing LLC
Compliance Team`;

    setGeneratedMessage(message);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success("Message copied to clipboard");
  };

  const onSubmit = async (data: any) => {
    if (!recipientType || !recipientId || selectedDocs.length === 0) {
      toast.error("Please select recipient and at least one document type");
      return;
    }

    const recipient = getSelectedRecipient();
    if (!recipient) {
      toast.error("Recipient not found");
      return;
    }

    try {
      // Create compliance request log
      await createRequest.mutateAsync({
        recipient_type: recipientType,
        recipient_id: recipientId,
        recipient_name: recipient.name,
        documents_requested: selectedDocs,
        due_date: dueDate || null,
        notes: data.notes || null,
        requested_by: null, // Will be set by RLS
      });

      // Update recipient record
      const updateData: any = {
        id: recipientId,
        last_requested_date: new Date().toISOString().split("T")[0],
        requested_docs: selectedDocs,
        docs_due_date: dueDate || null,
      };

      // Set requested doc statuses to missing
      if (selectedDocs.includes("COI")) updateData.coi_status = "missing";
      if (selectedDocs.includes("W-9")) updateData.w9_status = "missing";
      if (selectedDocs.includes("IC Agreement")) updateData.ic_agreement_status = "missing";

      if (recipientType === "subcontractor") {
        await updateSubcontractor.mutateAsync(updateData);
      } else if (recipientType === "vendor") {
        await updateVendor.mutateAsync(updateData);
      }

      generateEmailMessage();
      toast.success("Compliance request logged successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create request");
    }
  };

  const handleClose = () => {
    reset();
    setRecipientType("");
    setRecipientId("");
    setSelectedDocs([]);
    setGeneratedMessage("");
    setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Compliance Documents</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Type *</Label>
              <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); setRecipientId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcontractor">Approved Subcontractor</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient *</Label>
              <Select value={recipientId} onValueChange={setRecipientId} disabled={!recipientType}>
                <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  {getRecipients().map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Documents Requested *</Label>
            <div className="flex flex-wrap gap-4">
              {COMPLIANCE_DOCS.map((doc) => (
                <div key={doc.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={doc.value}
                    checked={selectedDocs.includes(doc.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDocs([...selectedDocs, doc.value]);
                      } else {
                        setSelectedDocs(selectedDocs.filter((d) => d !== doc.value));
                      }
                    }}
                  />
                  <label htmlFor={doc.value} className="text-sm">{doc.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              id="due_date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes to Recipient</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createRequest.isPending}>
              <Send className="w-4 h-4 mr-2" />
              Generate Request
            </Button>
          </div>
        </form>

        {generatedMessage && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Generated Email Message
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {generatedMessage}
              </pre>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
