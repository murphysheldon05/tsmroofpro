import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Save,
  Send,
  ArrowLeft,
  AlertTriangle,
  Wrench,
  Upload,
  X,
  Loader2,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useCreateCommissionDocument,
  useUpdateCommissionDocument,
  useUpdateCommissionDocumentStatus,
  type CommissionDocument,
} from "@/hooks/useCommissionDocuments";
import { PayRunDeadlineBanner } from "./PayRunDeadlineBanner";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface RepairCommissionFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

export function RepairCommissionForm({ document: doc, readOnly = false }: RepairCommissionFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();
  const statusMutation = useUpdateCommissionDocumentStatus();

  const [customerName, setCustomerName] = useState(doc?.customer_name || "");
  const [customerAddress, setCustomerAddress] = useState(doc?.customer_address || "");
  const [customerPhone, setCustomerPhone] = useState(doc?.customer_phone || "");
  const [customerEmail, setCustomerEmail] = useState(doc?.customer_email || "");
  const [repairDescription, setRepairDescription] = useState(doc?.repair_description || "");
  const [repairDate, setRepairDate] = useState(doc?.repair_date || "");
  const [totalRepairAmount, setTotalRepairAmount] = useState(doc?.total_repair_amount?.toString() || "");
  const [commissionRate, setCommissionRate] = useState(doc?.repair_commission_rate?.toString() || "0.10");
  const [notes, setNotes] = useState(doc?.notes || "");
  const [jobNameId, setJobNameId] = useState(doc?.job_name_id || "");
  const [salesRep, setSalesRep] = useState(doc?.sales_rep || "");
  const [photos, setPhotos] = useState<string[]>(doc?.repair_photos || []);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!salesRep && user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setSalesRep(data.full_name);
        });
    }
  }, [user]);

  const totalAmount = parseFloat(totalRepairAmount) || 0;
  const rate = parseFloat(commissionRate) || 0;
  const commissionAmount = totalAmount * rate;

  function validate(): string[] {
    const errs: string[] = [];
    if (!customerName.trim()) errs.push("Customer name is required");
    if (!customerAddress.trim()) errs.push("Customer address is required");
    if (!repairDescription.trim()) errs.push("Repair description is required");
    if (!totalRepairAmount || totalAmount <= 0) errs.push("Total repair amount must be greater than 0");
    if (!jobNameId.trim()) errs.push("Job Name / ID is required");
    return errs;
  }

  async function handleSave(submit = false) {
    if (submit) {
      const errs = validate();
      if (errs.length > 0) {
        setErrors(errs);
        return;
      }
    }
    setErrors([]);

    const payload: any = {
      form_type: "repair" as const,
      job_name_id: jobNameId,
      job_date: repairDate || null,
      sales_rep: salesRep,
      sales_rep_id: user?.id || null,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      repair_description: repairDescription,
      repair_date: repairDate || null,
      total_repair_amount: totalAmount,
      repair_commission_amount: commissionAmount,
      repair_commission_rate: rate,
      repair_photos: photos.length > 0 ? photos : null,
      notes: notes || null,
      status: "draft",
      // Standard fields default to zero for repair forms
      gross_contract_total: totalAmount,
      op_percent: 0,
      material_cost: 0,
      labor_cost: 0,
      neg_exp_1: 0,
      neg_exp_2: 0,
      neg_exp_3: 0,
      pos_exp_1: 0,
      pos_exp_2: 0,
      pos_exp_3: 0,
      pos_exp_4: 0,
      commission_rate: rate,
      advance_total: 0,
      starting_claim_amount: null,
      final_claim_amount: null,
      approved_by: null,
      approved_at: null,
      approval_comment: null,
      install_date: repairDate || null,
    };

    let docId = doc?.id;

    if (docId) {
      await updateMutation.mutateAsync({ id: docId, ...payload });
    } else {
      const result = await createMutation.mutateAsync(payload);
      docId = result?.id;
    }

    if (submit && docId) {
      await statusMutation.mutateAsync({ id: docId, status: "submitted" });
    }

    toast.success(submit ? "Repair Commission Submitted" : "Draft Saved");
    navigate(-1);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("repair-photos").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("repair-photos").getPublicUrl(path);
        newPhotos.push(urlData.publicUrl);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Job Name / ID" value={jobNameId} />
          <Field label="Sales Rep" value={salesRep} />
          <Field label="Customer Name" value={customerName} />
          <Field label="Customer Address" value={customerAddress} />
          <Field label="Customer Phone" value={customerPhone} />
          <Field label="Customer Email" value={customerEmail} />
          <Field label="Repair Date" value={repairDate} />
          <Field label="Total Repair Amount" value={formatCurrency(totalAmount)} />
          <Field label="Commission Rate" value={`${(rate * 100).toFixed(1)}%`} />
          <Field label="Commission Amount" value={formatCurrency(commissionAmount)} />
        </div>
        {repairDescription && (
          <div>
            <Label className="text-muted-foreground text-xs">Repair Description</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{repairDescription}</p>
          </div>
        )}
        {notes && (
          <div>
            <Label className="text-muted-foreground text-xs">Notes</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        )}
        {photos.length > 0 && (
          <div>
            <Label className="text-muted-foreground text-xs">Photos</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Repair photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PayRunDeadlineBanner />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-purple-500" />
          <h1 className="text-xl font-bold">Repair Commission</h1>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Job Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Job Name / ID *</Label>
              <Input value={jobNameId} onChange={(e) => setJobNameId(e.target.value)} placeholder="e.g. Smith Repair 1234" />
            </div>
            <div>
              <Label>Sales Rep</Label>
              <Input value={salesRep} onChange={(e) => setSalesRep(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Customer Address *</Label>
              <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full address" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repair Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Repair Description / Scope of Work *</Label>
            <Textarea
              value={repairDescription}
              onChange={(e) => setRepairDescription(e.target.value)}
              rows={4}
              placeholder="Describe the repair work performed..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Repair Date</Label>
              <Input type="date" value={repairDate} onChange={(e) => setRepairDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Total Repair Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalRepairAmount}
                onChange={(e) => setTotalRepairAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Commission Rate</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="0.10"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">{(rate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <Label>Commission Amount</Label>
              <div className="h-10 px-4 rounded-xl font-mono text-base flex items-center bg-primary/5 border border-primary/20 text-primary font-semibold">
                {formatCurrency(commissionAmount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {photos.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Photo ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload Photos"}
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..." />
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><strong>Job:</strong> {jobNameId}</div>
              <div><strong>Rep:</strong> {salesRep}</div>
              <div><strong>Customer:</strong> {customerName}</div>
              <div><strong>Address:</strong> {customerAddress}</div>
              <div><strong>Total:</strong> {formatCurrency(totalAmount)}</div>
              <div><strong>Commission:</strong> {formatCurrency(commissionAmount)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pb-8">
        <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? "Hide Preview" : "Preview"}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            variant="neon"
            onClick={() => handleSave(true)}
            disabled={createMutation.isPending || updateMutation.isPending || statusMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
