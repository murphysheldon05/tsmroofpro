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

const SOP_KEYS = [
  "SOP01", "SOP02", "SOP03", "SOP04", "SOP05",
  "SOP06", "SOP07", "SOP08", "SOP09", "SOP10",
];

const DEPARTMENTS = [
  "sales", "production", "supplements", "accounting", "hr", "admin"
];

const SEVERITIES = ["minor", "major", "severe"];

interface LogViolationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogViolationModal({ open, onOpenChange }: LogViolationModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    sop_key: "",
    department: "",
    violation_type: "",
    severity: "",
    description: "",
    job_id: "",
  });

  const createViolation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("compliance_violations").insert({
        created_by_user_id: user?.id,
        sop_key: formData.sop_key,
        department: formData.department,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        job_id: formData.job_id || null,
        status: "open",
      });
      
      if (error) throw error;

      // Log to audit
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "create_violation",
        target_type: "violation",
        metadata: { sop_key: formData.sop_key, severity: formData.severity },
      });
    },
    onSuccess: () => {
      toast.success("Violation logged successfully");
      queryClient.invalidateQueries({ queryKey: ["compliance-violations"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-violations-open-count"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-audit-log"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to log violation: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      sop_key: "",
      department: "",
      violation_type: "",
      severity: "",
      description: "",
      job_id: "",
    });
  };

  const canSubmit = formData.sop_key && formData.severity && formData.description && formData.violation_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Compliance Violation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>SOP *</Label>
              <Select
                value={formData.sop_key}
                onValueChange={(v) => setFormData({ ...formData, sop_key: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SOP" />
                </SelectTrigger>
                <SelectContent>
                  {SOP_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData({ ...formData, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={formData.department}
              onValueChange={(v) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Violation Type *</Label>
            <Input
              value={formData.violation_type}
              onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
              placeholder="e.g., Missing documentation, Procedure skipped"
            />
          </div>

          <div className="space-y-2">
            <Label>Job ID (optional)</Label>
            <Input
              value={formData.job_id}
              onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
              placeholder="AccuLynx Job ID"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the violation in detail..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createViolation.mutate()} 
            disabled={!canSubmit || createViolation.isPending}
          >
            {createViolation.isPending ? "Saving..." : "Log Violation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
