import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Ban } from "lucide-react";

const HOLD_TYPES = [
  { value: "commission_hold", label: "Commission Hold", requiresJob: true },
  { value: "invoice_hold", label: "Invoice Hold", requiresJob: true },
  { value: "scheduling_hold", label: "Scheduling Hold", requiresJob: true },
  { value: "access_hold", label: "Access Hold", requiresUser: true },
];

const ENTITY_TYPES = [
  { value: "commission", label: "Commission" },
  { value: "submission", label: "Submission" },
  { value: "job", label: "Job" },
  { value: "user", label: "User" },
];

interface ApplyHoldModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyHoldModalEnhanced({ open, onOpenChange }: ApplyHoldModalEnhancedProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    hold_type: "",
    job_id: "",
    user_id: "",
    related_entity_type: "",
    related_entity_id: "",
    reason: "",
  });

  // Fetch users for the user dropdown
  const { data: users } = useQuery({
    queryKey: ["profiles-for-hold"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const selectedHoldType = HOLD_TYPES.find(t => t.value === formData.hold_type);
  const requiresJob = selectedHoldType?.requiresJob;
  const requiresUser = selectedHoldType?.requiresUser;

  const createHold = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("compliance_holds").insert({
        created_by_user_id: user?.id,
        hold_type: formData.hold_type,
        job_id: formData.job_id || null,
        user_id: formData.user_id || null,
        related_entity_type: formData.related_entity_type || null,
        related_entity_id: formData.related_entity_id || null,
        reason: formData.reason,
        status: "active",
      }).select().single();
      
      if (error) throw error;

      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "apply_hold",
        target_type: "hold",
        target_id: data.id,
        metadata: { 
          hold_type: formData.hold_type, 
          job_id: formData.job_id || null,
          user_id: formData.user_id || null,
        },
      });

      return data;
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
      user_id: "",
      related_entity_type: "",
      related_entity_id: "",
      reason: "",
    });
  };

  const canSubmit = 
    formData.hold_type && 
    formData.reason && 
    (!requiresJob || formData.job_id) &&
    (!requiresUser || formData.user_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-orange-500" />
            Apply New Hold
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Hold Type */}
          <div className="space-y-2">
            <Label>Hold Type *</Label>
            <Select
              value={formData.hold_type}
              onValueChange={(v) => setFormData({ ...formData, hold_type: v, job_id: "", user_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select hold type" />
              </SelectTrigger>
              <SelectContent>
                {HOLD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job ID - show when required */}
          {requiresJob && (
            <div className="space-y-2">
              <Label>Job ID *</Label>
              <Input
                value={formData.job_id}
                onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                placeholder="AccuLynx Job ID"
              />
              <p className="text-xs text-muted-foreground">
                Required for {selectedHoldType?.label}
              </p>
            </div>
          )}

          {/* User - show when required */}
          {requiresUser && (
            <div className="space-y-2">
              <Label>User *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData({ ...formData, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Required for Access Hold
              </p>
            </div>
          )}

          {/* Related Entity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Related Entity Type</Label>
              <Select
                value={formData.related_entity_type}
                onValueChange={(v) => setFormData({ ...formData, related_entity_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity ID</Label>
              <Input
                value={formData.related_entity_id}
                onChange={(e) => setFormData({ ...formData, related_entity_id: e.target.value })}
                placeholder="ID (optional)"
              />
            </div>
          </div>

          {/* Reason */}
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
