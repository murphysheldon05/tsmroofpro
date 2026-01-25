import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateProspect, useUpdateProspect, Prospect } from "@/hooks/useProspects";
import { PROSPECT_TYPES, PROSPECT_SOURCES, PROSPECT_STAGES, ASSIGNED_OWNERS } from "@/lib/directoryConstants";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toast } from "sonner";

interface ProspectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
}

type ProspectType = "subcontractor" | "vendor";
type ProspectSource = "inbound_call" | "referral" | "jobsite_meet" | "other";
type ProspectStage = "new" | "contacted" | "waiting_docs" | "trial_job" | "approved" | "not_a_fit";

export function ProspectForm({ open, onOpenChange, prospect }: ProspectFormProps) {
  const isEditing = !!prospect;
  const createMutation = useCreateProspect();
  const updateMutation = useUpdateProspect();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      company_name: prospect?.company_name || "",
      contact_name: prospect?.contact_name || "",
      phone: prospect?.phone || "",
      email: prospect?.email || "",
      prospect_type: (prospect?.prospect_type || "subcontractor") as ProspectType,
      trade_vendor_type: prospect?.trade_vendor_type || "",
      source: (prospect?.source || "other") as ProspectSource,
      stage: (prospect?.stage || "new") as ProspectStage,
      notes: prospect?.notes || "",
      next_followup_date: prospect?.next_followup_date || "",
      assigned_owner: prospect?.assigned_owner || "",
    },
  });

  const nextFollowupDate = watch("next_followup_date");

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && prospect) {
        await updateMutation.mutateAsync({ id: prospect.id, ...data });
        toast.success("Prospect updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Prospect created successfully");
      }
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save prospect");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Prospect" : "Add New Prospect"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company/Name *</Label>
              <Input id="company_name" {...register("company_name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input id="contact_name" {...register("contact_name", { required: true })} />
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
              <Label>Type</Label>
              <Select defaultValue={watch("prospect_type")} onValueChange={(v: ProspectType) => setValue("prospect_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROSPECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_vendor_type">Trade/Vendor Type</Label>
              <Input id="trade_vendor_type" {...register("trade_vendor_type")} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select defaultValue={watch("source")} onValueChange={(v: ProspectSource) => setValue("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROSPECT_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select defaultValue={watch("stage")} onValueChange={(v: ProspectStage) => setValue("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROSPECT_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Owner</Label>
              <Select defaultValue={watch("assigned_owner") || undefined} onValueChange={(v) => setValue("assigned_owner", v)}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {ASSIGNED_OWNERS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DatePickerField
              label="Next Follow-Up Date"
              value={nextFollowupDate}
              onChange={(v) => setValue("next_followup_date", v)}
              id="next_followup_date"
            />
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
