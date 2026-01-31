import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOLD_TYPES = [
  { value: "commission_hold", label: "Commission Hold" },
  { value: "invoice_hold", label: "Invoice Hold" },
  { value: "scheduling_hold", label: "Scheduling Hold" },
  { value: "access_hold", label: "Access Hold" },
];

const ENTITY_TYPES = [
  { value: "commission", label: "Commission" },
  { value: "submission", label: "Submission" },
  { value: "job", label: "Job" },
  { value: "user", label: "User" },
];

interface ApplyHoldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyHoldModal({ open, onOpenChange }: ApplyHoldModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    hold_type: "",
    job_id: "",
    related_entity_type: "",
    related_entity_id: "",
    reason: "",
  });

  const createHold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("compliance_holds").insert({
        created_by_user_id: user?.id,
        hold_type: formData.hold_type,
        job_id: formData.job_id || null,
        related_entity_type: formData.related_entity_type || null,
        related_entity_id: formData.related_entity_id || null,
        reason: formData.reason,
        status: "active",
      });
      
      if (error) throw error;

      // Log to audit
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "apply_hold",
        target_type: "hold",
        metadata: { hold_type: formData.hold_type, job_id: formData.job_id },
      });
    },
    onSuccess: () => {
      toast.success("Hold applied successfully");
      queryClient.invalidateQueries({ queryKey: ["compliance-holds"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-holds-active-count"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-audit-log"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to apply hold: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      hold_type: "",
      job_id: "",
      related_entity_type: "",
      related_entity_id: "",
      reason: "",
    });
  };

  const canSubmit = formData.hold_type && formData.reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Compliance Hold</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Hold Type *</Label>
            <Select
              value={formData.hold_type}
              onValueChange={(v) => setFormData({ ...formData, hold_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select hold type" />
              </SelectTrigger>
              <SelectContent>
                {HOLD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Job ID (optional)</Label>
            <Input
              value={formData.job_id}
              onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
              placeholder="AccuLynx Job ID"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Related Entity Type</Label>
              <Select
                value={formData.related_entity_type}
                onValueChange={(v) => setFormData({ ...formData, related_entity_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity ID</Label>
              <Input
                value={formData.related_entity_id}
                onChange={(e) => setFormData({ ...formData, related_entity_id: e.target.value })}
                placeholder="ID"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why this hold is being applied..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createHold.mutate()} 
            disabled={!canSubmit || createHold.isPending}
          >
            {createHold.isPending ? "Applying..." : "Apply Hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
