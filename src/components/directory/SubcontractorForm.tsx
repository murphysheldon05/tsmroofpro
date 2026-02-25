import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateSubcontractor, useUpdateSubcontractor, Subcontractor } from "@/hooks/useSubcontractors";
import { TRADE_TYPES, ENTITY_STATUSES, DOC_STATUSES } from "@/lib/directoryConstants";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toast } from "sonner";

interface SubcontractorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcontractor?: Subcontractor | null;
}

type TradeType = "roofing" | "tile" | "shingle" | "foam" | "coatings" | "metal" | "gutters" | "drywall" | "paint" | "other";
type EntityStatus = "active" | "on_hold" | "do_not_use";
type DocStatus = "received" | "missing";

function getDefaults(sub?: Subcontractor | null) {
  return {
    company_name: sub?.company_name || "",
    primary_contact_name: sub?.primary_contact_name || "",
    phone: sub?.phone || "",
    email: sub?.email || "",
    trade_type: (sub?.trade_type || "other") as TradeType,
    service_areas: sub?.service_areas || ["phoenix_metro"],
    status: (sub?.status || "active") as EntityStatus,
    internal_rating: sub?.internal_rating || null,
    notes: sub?.notes || "",
    coi_status: (sub?.coi_status || "missing") as DocStatus,
    coi_expiration_date: sub?.coi_expiration_date || "",
    w9_status: (sub?.w9_status || "missing") as DocStatus,
    ic_agreement_status: (sub?.ic_agreement_status || "missing") as DocStatus,
  };
}

export function SubcontractorForm({ open, onOpenChange, subcontractor }: SubcontractorFormProps) {
  const isEditing = !!subcontractor;
  const createMutation = useCreateSubcontractor();
  const updateMutation = useUpdateSubcontractor();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: getDefaults(subcontractor),
  });

  // Reset form when dialog opens or subcontractor changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(subcontractor));
    }
  }, [open, subcontractor, reset]);

  const coiExpirationDate = watch("coi_expiration_date");

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && subcontractor) {
        await updateMutation.mutateAsync({ id: subcontractor.id, ...data });
        toast.success("Subcontractor updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Subcontractor created successfully");
      }
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save subcontractor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subcontractor" : "Add New Subcontractor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company/Crew Name *</Label>
              <Input id="company_name" {...register("company_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_contact_name">Primary Contact Name *</Label>
              <Input id="primary_contact_name" {...register("primary_contact_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Trade Type</Label>
              <Select value={watch("trade_type")} onValueChange={(v: TradeType) => setValue("trade_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v: EntityStatus) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_rating">Internal Rating (1-5)</Label>
              <Input id="internal_rating" type="number" min="1" max="5" {...register("internal_rating", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>COI Status</Label>
              <Select value={watch("coi_status")} onValueChange={(v: DocStatus) => setValue("coi_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DatePickerField
              label="COI Expiration Date"
              value={coiExpirationDate}
              onChange={(v) => setValue("coi_expiration_date", v)}
              id="coi_expiration_date"
            />
            <div className="space-y-2">
              <Label>W-9 Status</Label>
              <Select value={watch("w9_status")} onValueChange={(v: DocStatus) => setValue("w9_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IC Agreement Status</Label>
              <Select value={watch("ic_agreement_status")} onValueChange={(v: DocStatus) => setValue("ic_agreement_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
