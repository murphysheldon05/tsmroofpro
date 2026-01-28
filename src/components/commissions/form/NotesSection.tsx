import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "./FormSection";

const inputClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";

interface NotesSectionProps {
  notes: string;
  canEdit: boolean;
  onNotesChange: (value: string) => void;
}

export function NotesSection({ notes, canEdit, onNotesChange }: NotesSectionProps) {
  return (
    <FormSection title="Notes">
      <Textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        disabled={!canEdit}
        className={inputClasses}
        placeholder="Optional notes..."
        rows={3}
      />
    </FormSection>
  );
}
