import { Input } from "@/components/ui/input";
import { CommissionDocumentFormRow as FormRow } from "../CommissionDocumentFormRow";
import { FormSection } from "./FormSection";

const inputClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";

interface JobInfoSectionProps {
  jobNameId: string;
  jobDate: string;
  salesRep: string;
  canEdit: boolean;
  isPrivileged: boolean;
  onJobNameIdChange: (value: string) => void;
  onJobDateChange: (value: string) => void;
  onSalesRepChange: (value: string) => void;
}

export function JobInfoSection({
  jobNameId,
  jobDate,
  salesRep,
  canEdit,
  isPrivileged,
  onJobNameIdChange,
  onJobDateChange,
  onSalesRepChange,
}: JobInfoSectionProps) {
  return (
    <FormSection title="Job Information">
      <FormRow label="Job Name & ID">
        <Input
          value={jobNameId}
          onChange={(e) => onJobNameIdChange(e.target.value)}
          disabled={!canEdit}
          className={inputClasses}
          placeholder="Enter job name or ID"
          required
        />
      </FormRow>
      
      <FormRow label="Job Date">
        <Input
          type="date"
          value={jobDate}
          onChange={(e) => onJobDateChange(e.target.value)}
          disabled={!canEdit}
          className={inputClasses}
          required
        />
      </FormRow>
      
      <FormRow 
        label="Sales Rep" 
        hint={isPrivileged ? "Managers can edit" : "Auto-populated from your profile"}
      >
        <Input
          value={salesRep}
          onChange={(e) => onSalesRepChange(e.target.value)}
          disabled={!canEdit || !isPrivileged}
          className={`${inputClasses} ${!isPrivileged ? 'bg-muted' : ''}`}
          placeholder="Enter sales rep name"
          required
        />
      </FormRow>
    </FormSection>
  );
}
