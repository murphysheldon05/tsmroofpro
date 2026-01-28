import { Button } from "@/components/ui/button";
import { Save, Send } from "lucide-react";

interface FormActionsProps {
  isLoading: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export function FormActions({ isLoading, onSaveDraft, onSubmit }: FormActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
      <Button
        variant="outline"
        onClick={onSaveDraft}
        disabled={isLoading}
        className="flex-1"
      >
        <Save className="h-4 w-4 mr-2" />
        Save as Draft
      </Button>
      <Button
        onClick={onSubmit}
        disabled={isLoading}
        className="flex-1"
      >
        <Send className="h-4 w-4 mr-2" />
        Submit for Approval
      </Button>
    </div>
  );
}
