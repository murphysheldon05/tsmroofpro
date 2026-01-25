import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateSubcontractor, useUpdateSubcontractor, Subcontractor } from "@/hooks/useSubcontractors";
import { TRADE_TYPES, SERVICE_AREAS, ENTITY_STATUSES, DOC_STATUSES } from "@/lib/directoryConstants";
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

export function SubcontractorForm({ open, onOpenChange, subcontractor }: SubcontractorFormProps) {
  const isEditing = !!subcontractor;
  const createMutation = useCreateSubcontractor();
  const updateMutation = useUpdateSubcontractor();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      company_name: subcontractor?.company_name || "",
      primary_contact_name: subcontractor?.primary_contact_name || "",
      phone: subcontractor?.phone || "",
      email: subcontractor?.email || "",
      trade_type: (subcontractor?.trade_type || "other") as TradeType,
      service_areas: subcontractor?.service_areas || ["phoenix_metro"],
      status: (subcontractor?.status || "active") as EntityStatus,
      internal_rating: subcontractor?.internal_rating || null,
      notes: subcontractor?.notes || "",
      coi_status: (subcontractor?.coi_status || "missing") as DocStatus,
      coi_expiration_date: subcontractor?.coi_expiration_date || "",
      w9_status: (subcontractor?.w9_status || "missing") as DocStatus,
      ic_agreement_status: (subcontractor?.ic_agreement_status || "missing") as DocStatus,
    },
  });

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
              <Select defaultValue={watch("trade_type")} onValueChange={(v: TradeType) => setValue("trade_type", v)}>
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
              <Select defaultValue={watch("status")} onValueChange={(v: EntityStatus) => setValue("status", v)}>
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
              <Select defaultValue={watch("coi_status")} onValueChange={(v: DocStatus) => setValue("coi_status", v)}>
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
              <Select defaultValue={watch("w9_status")} onValueChange={(v: DocStatus) => setValue("w9_status", v)}>
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
              <Select defaultValue={watch("ic_agreement_status")} onValueChange={(v: DocStatus) => setValue("ic_agreement_status", v)}>
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
