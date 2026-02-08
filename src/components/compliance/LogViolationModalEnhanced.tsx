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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Link as LinkIcon, Upload } from "lucide-react";

const SOP_KEYS = [
  "SOP01", "SOP02", "SOP03", "SOP04", "SOP05",
  "SOP06", "SOP07", "SOP08", "SOP09", "SOP10",
];

const DEPARTMENTS = [
  { value: "sales", label: "Sales" },
  { value: "production", label: "Production" },
  { value: "supplements", label: "Supplements" },
  { value: "accounting", label: "Accounting" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
];

interface LogViolationModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogViolationModalEnhanced({ open, onOpenChange }: LogViolationModalEnhancedProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    department: "",
    sop_key: "",
    job_id: "",
    severity: "",
    violation_type: "",
    description: "",
  });
  
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([""]);

  // Get the ops_compliance user (Manny) to assign violations to
  const { data: opsComplianceUser } = useQuery({
    queryKey: ["ops-compliance-user"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ops_compliance")
        .limit(1)
        .single();
      return data?.user_id || null;
    },
  });

  const createViolation = useMutation({
    mutationFn: async () => {
      const evidence = evidenceUrls.filter(url => url.trim()).map(url => ({ type: "url", value: url }));
      
      const { data, error } = await supabase.from("compliance_violations").insert({
        created_by_user_id: user?.id,
        sop_key: formData.sop_key,
        department: formData.department,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        job_id: formData.job_id || null,
        status: "open",
        assigned_to_user_id: opsComplianceUser,
        escalation_required: formData.severity === "severe",
        evidence: evidence.length > 0 ? evidence : null,
      }).select().single();
      
      if (error) throw error;

      // Log to audit
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "create_violation",
        target_type: "violation",
        target_id: data.id,
        metadata: { 
          sop_key: formData.sop_key, 
          severity: formData.severity,
          department: formData.department,
          auto_escalation: formData.severity === "severe",
        },
      });

      // Send email notification for the violation
      if (opsComplianceUser) {
        try {
          await supabase.functions.invoke("send-violation-notification", {
            body: {
              violation_id: data.id,
              violation_type: formData.violation_type,
              severity: formData.severity.toUpperCase(),
              sop_key: formData.sop_key,
              description: formData.description,
              user_id: opsComplianceUser,
              job_id: formData.job_id || undefined,
              department: formData.department,
            },
          });
        } catch (notifyError) {
          console.error("Failed to send violation notification:", notifyError);
        }
      }

      return data;
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
      department: "",
      sop_key: "",
      job_id: "",
      severity: "",
      violation_type: "",
      description: "",
    });
    setEvidenceUrls([""]);
  };

  const addEvidenceUrl = () => {
    setEvidenceUrls([...evidenceUrls, ""]);
  };

  const removeEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const updateEvidenceUrl = (index: number, value: string) => {
    const updated = [...evidenceUrls];
    updated[index] = value;
    setEvidenceUrls(updated);
  };

  const canSubmit = formData.department && formData.sop_key && formData.severity && formData.violation_type && formData.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Violation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Department */}
          <div className="space-y-2">
            <Label>Department *</Label>
            <Select
              value={formData.department}
              onValueChange={(v) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SOP Reference */}
          <div className="space-y-2">
            <Label>SOP Reference *</Label>
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

          {/* Job ID */}
          <div className="space-y-2">
            <Label>Job ID (optional)</Label>
            <Input
              value={formData.job_id}
              onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
              placeholder="AccuLynx Job ID"
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity *</Label>
            <RadioGroup
              value={formData.severity}
              onValueChange={(v) => setFormData({ ...formData, severity: v })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minor" id="minor" />
                <Label htmlFor="minor" className="font-normal text-yellow-600">Minor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="major" id="major" />
                <Label htmlFor="major" className="font-normal text-orange-600">Major</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="severe" id="severe" />
                <Label htmlFor="severe" className="font-normal text-red-600">Severe</Label>
              </div>
            </RadioGroup>
            {formData.severity === "severe" && (
              <p className="text-xs text-red-600">
                ⚠ Severe violations are automatically flagged for escalation
              </p>
            )}
          </div>

          {/* Violation Type */}
          <div className="space-y-2">
            <Label>Violation Type *</Label>
            <Input
              value={formData.violation_type}
              onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
              placeholder="e.g., Missing documentation, Procedure skipped"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the violation in detail..."
              rows={3}
            />
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Evidence URLs (optional)
            </Label>
            {evidenceUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => updateEvidenceUrl(index, e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                {evidenceUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEvidenceUrl(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEvidenceUrl}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add URL
            </Button>
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
