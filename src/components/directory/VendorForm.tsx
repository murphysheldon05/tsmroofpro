import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateVendor, useUpdateVendor, Vendor } from "@/hooks/useVendors";
import { VENDOR_TYPES, ENTITY_STATUSES, DOC_STATUSES, CONTACT_METHODS } from "@/lib/directoryConstants";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toast } from "sonner";

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
}

type VendorType = "supplier" | "dump" | "equipment_rental" | "safety" | "marketing" | "other";
type EntityStatus = "active" | "on_hold" | "do_not_use";
type DocStatus = "received" | "missing";
type ContactMethod = "call" | "text" | "email";

export function VendorForm({ open, onOpenChange, vendor }: VendorFormProps) {
  const isEditing = !!vendor;
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      vendor_name: vendor?.vendor_name || "",
      primary_contact_name: vendor?.primary_contact_name || "",
      phone: vendor?.phone || "",
      email: vendor?.email || "",
      vendor_type: (vendor?.vendor_type || "other") as VendorType,
      status: (vendor?.status || "active") as EntityStatus,
      account_number: vendor?.account_number || "",
      preferred_contact_method: (vendor?.preferred_contact_method || "email") as ContactMethod,
      notes: vendor?.notes || "",
      coi_status: (vendor?.coi_status || "missing") as DocStatus,
      coi_expiration_date: vendor?.coi_expiration_date || "",
      w9_status: (vendor?.w9_status || "missing") as DocStatus,
      ic_agreement_status: (vendor?.ic_agreement_status || "missing") as DocStatus,
    },
  });

  const coiExpirationDate = watch("coi_expiration_date");

  const onSubmit = async (data: any) => {
    try {
      // Convert empty date strings to null for PostgreSQL DATE columns
      if (data.coi_expiration_date === "") data.coi_expiration_date = null;
      if (isEditing && vendor) {
        await updateMutation.mutateAsync({ id: vendor.id, ...data });
        toast.success("Vendor updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Vendor created successfully");
      }
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save vendor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input id="vendor_name" {...register("vendor_name", { required: true })} />
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
              <Label>Vendor Type</Label>
              <Select defaultValue={watch("vendor_type")} onValueChange={(v: VendorType) => setValue("vendor_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map((t) => (
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
              <Label htmlFor="account_number">Account Number</Label>
              <Input id="account_number" {...register("account_number")} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Contact Method</Label>
              <Select defaultValue={watch("preferred_contact_method")} onValueChange={(v: ContactMethod) => setValue("preferred_contact_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
