import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  useCreateWarranty,
  useUpdateWarranty,
  WarrantyRequest,
  ROOF_TYPES,
  WARRANTY_TYPES,
  SOURCE_OPTIONS,
  PRIORITY_LEVELS,
  WARRANTY_STATUSES,
  RoofType,
  WarrantyType,
  SourceOfRequest,
  PriorityLevel,
  WarrantyStatus,
} from "@/hooks/useWarranties";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WarrantyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty?: WarrantyRequest | null;
}

interface ProductionMember {
  id: string;
  full_name: string | null;
}

export function WarrantyForm({ open, onOpenChange, warranty }: WarrantyFormProps) {
  const isEditing = !!warranty;
  const createMutation = useCreateWarranty();
  const updateMutation = useUpdateWarranty();

  // Fetch production team members (users with production permission or manager/admin role)
  const { data: productionMembers = [] } = useQuery({
    queryKey: ["production-members"],
    queryFn: async () => {
      // GOVERNANCE: employee_status='active' is the canonical access check
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("employee_status", "active");

      if (error) throw error;
      return data as ProductionMember[];
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      customer_name: warranty?.customer_name || "",
      job_address: warranty?.job_address || "",
      original_job_number: warranty?.original_job_number || "",
      original_install_date: warranty?.original_install_date || "",
      roof_type: (warranty?.roof_type || "shingle") as RoofType,
      warranty_type: (warranty?.warranty_type || "workmanship") as WarrantyType,
      warranty_coverage_description: warranty?.warranty_coverage_description || "",
      warranty_expiration_date: warranty?.warranty_expiration_date || "",
      manufacturer: warranty?.manufacturer || "",
      date_submitted: warranty?.date_submitted || new Date().toISOString().split("T")[0],
      issue_description: warranty?.issue_description || "",
      source_of_request: (warranty?.source_of_request || "homeowner") as SourceOfRequest,
      assigned_production_member: warranty?.assigned_production_member || "",
      secondary_support: warranty?.secondary_support || "",
      date_assigned: warranty?.date_assigned || "",
      priority_level: (warranty?.priority_level || "medium") as PriorityLevel,
      status: (warranty?.status || "new") as WarrantyStatus,
      resolution_summary: warranty?.resolution_summary || "",
      date_completed: warranty?.date_completed || "",
      labor_cost: warranty?.labor_cost || null,
      material_cost: warranty?.material_cost || null,
      is_manufacturer_claim_filed: warranty?.is_manufacturer_claim_filed || false,
      closeout_photos_uploaded: warranty?.closeout_photos_uploaded || false,
      customer_notified_of_completion: warranty?.customer_notified_of_completion || false,
    },
  });

  const warrantyType = watch("warranty_type");
  const status = watch("status");
  const isCompleted = status === "completed";

  const onSubmit = async (data: any) => {
    try {
      // Clean up empty strings to null for optional fields
      const cleanedData = {
        ...data,
        assigned_production_member: data.assigned_production_member || null,
        secondary_support: data.secondary_support || null,
        date_assigned: data.date_assigned || null,
        manufacturer: data.manufacturer || null,
        resolution_summary: data.resolution_summary || null,
        date_completed: data.date_completed || null,
        labor_cost: data.labor_cost || null,
        material_cost: data.material_cost || null,
        // For create: set nullable fields to null if empty
        original_install_date: data.original_install_date || null,
        warranty_coverage_description: data.warranty_coverage_description || null,
        warranty_expiration_date: data.warranty_expiration_date || null,
      };

      if (isEditing && warranty) {
        await updateMutation.mutateAsync({ id: warranty.id, ...cleanedData });
      } else {
        await createMutation.mutateAsync(cleanedData);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isEditing ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-lg max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Warranty Request" : "New Warranty Request"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* === CREATE MODE: Simple form === */}
          {!isEditing && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input id="customer_name" autoFocus {...register("customer_name", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_address">Job Address *</Label>
                  <Input id="job_address" {...register("job_address", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="original_job_number">Job Number *</Label>
                  <Input id="original_job_number" {...register("original_job_number", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issue_description">What's the issue? *</Label>
                  <Textarea id="issue_description" {...register("issue_description", { required: true })} rows={3} placeholder="Describe the warranty issue..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source *</Label>
                    <Select value={watch("source_of_request")} onValueChange={(v: SourceOfRequest) => setValue("source_of_request", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={watch("priority_level")} onValueChange={(v: PriorityLevel) => setValue("priority_level", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === EDIT MODE: Full form === */}
          {isEditing && (
            <>
              {/* Customer & Job Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Customer & Job Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input id="customer_name" {...register("customer_name", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_address">Job Address *</Label>
                    <Input id="job_address" {...register("job_address", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_job_number">Original Job Number *</Label>
                    <Input id="original_job_number" {...register("original_job_number", { required: true })} />
                  </div>
                  <DatePickerField
                    label="Original Install Date"
                    value={watch("original_install_date")}
                    onChange={(v) => setValue("original_install_date", v)}
                    id="original_install_date"
                  />
                  <div className="space-y-2">
                    <Label>Roof Type *</Label>
                    <Select value={watch("roof_type")} onValueChange={(v: RoofType) => setValue("roof_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROOF_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Warranty Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Warranty Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warranty Type *</Label>
                    <Select value={watch("warranty_type")} onValueChange={(v: WarrantyType) => setValue("warranty_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WARRANTY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePickerField
                    label="Warranty Expiration Date"
                    value={watch("warranty_expiration_date")}
                    onChange={(v) => setValue("warranty_expiration_date", v)}
                    id="warranty_expiration_date"
                  />
                  {(warrantyType === "manufacturer" || warrantyType === "combination") && (
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input id="manufacturer" {...register("manufacturer")} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_coverage_description">Warranty Coverage Description</Label>
                  <Textarea id="warranty_coverage_description" {...register("warranty_coverage_description")} rows={3} />
                </div>
              </div>

              {/* Issue Intake */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Issue Intake</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DatePickerField
                    label="Date Submitted"
                    required
                    value={watch("date_submitted")}
                    onChange={(v) => setValue("date_submitted", v)}
                    id="date_submitted"
                  />
                  <div className="space-y-2">
                    <Label>Source of Request *</Label>
                    <Select value={watch("source_of_request")} onValueChange={(v: SourceOfRequest) => setValue("source_of_request", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issue_description">Issue Description *</Label>
                  <Textarea id="issue_description" {...register("issue_description", { required: true })} rows={4} />
                </div>
              </div>

              {/* Assignment & Accountability */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Assignment & Accountability</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assigned Production Member</Label>
                    <Select
                      value={watch("assigned_production_member") || "none"}
                      onValueChange={(v) => setValue("assigned_production_member", v === "none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {productionMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Support</Label>
                    <Select
                      value={watch("secondary_support") || "none"}
                      onValueChange={(v) => setValue("secondary_support", v === "none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {productionMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePickerField
                    label="Date Assigned"
                    value={watch("date_assigned") || ""}
                    onChange={(v) => setValue("date_assigned", v)}
                    id="date_assigned"
                  />
                  <div className="space-y-2">
                    <Label>Priority Level *</Label>
                    <Select value={watch("priority_level")} onValueChange={(v: PriorityLevel) => setValue("priority_level", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Status Tracking */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Status</h3>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={watch("status")} onValueChange={(v: WarrantyStatus) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WARRANTY_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resolution (shown when status is completed or denied) */}
              {(isCompleted || status === "denied") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Resolution</h3>
                  <div className="space-y-2">
                    <Label htmlFor="resolution_summary">Resolution Summary {isCompleted && "*"}</Label>
                    <Textarea id="resolution_summary" {...register("resolution_summary")} rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DatePickerField
                      label="Date Completed"
                      required={isCompleted}
                      value={watch("date_completed") || ""}
                      onChange={(v) => setValue("date_completed", v)}
                      id="date_completed"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="labor_cost">Labor Cost ($)</Label>
                      <Input id="labor_cost" type="number" step="0.01" {...register("labor_cost", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material_cost">Material Cost ($)</Label>
                      <Input id="material_cost" type="number" step="0.01" {...register("material_cost", { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_manufacturer_claim_filed"
                        checked={watch("is_manufacturer_claim_filed")}
                        onCheckedChange={(v) => setValue("is_manufacturer_claim_filed", v)}
                      />
                      <Label htmlFor="is_manufacturer_claim_filed">Manufacturer Claim Filed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="closeout_photos_uploaded"
                        checked={watch("closeout_photos_uploaded")}
                        onCheckedChange={(v) => setValue("closeout_photos_uploaded", v)}
                      />
                      <Label htmlFor="closeout_photos_uploaded">Close-Out Photos Uploaded</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="customer_notified_of_completion"
                        checked={watch("customer_notified_of_completion")}
                        onCheckedChange={(v) => setValue("customer_notified_of_completion", v)}
                      />
                      <Label htmlFor="customer_notified_of_completion">Customer Notified of Completion</Label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? "Update" : "Submit"} Warranty Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
