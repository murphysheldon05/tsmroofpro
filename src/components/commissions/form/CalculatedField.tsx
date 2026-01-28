import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { CommissionDocumentFormRow } from "../CommissionDocumentFormRow";
import { cn } from "@/lib/utils";

interface CalculatedFieldProps {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
  className?: string;
}

export function CalculatedField({ 
  label, 
  value, 
  highlight = false, 
  hint,
  className 
}: CalculatedFieldProps) {
  return (
    <CommissionDocumentFormRow 
      label={
        <span className="flex items-center gap-1">
          {label} <Lock className="h-3 w-3 text-muted-foreground" />
        </span>
      } 
      variant="calculated" 
      highlight={highlight}
      hint={hint}
    >
      <Input
        value={value}
        disabled
        className={cn(
          "font-mono tracking-wide tabular-nums bg-muted text-base",
          highlight && "font-bold text-lg",
          className
        )}
      />
    </CommissionDocumentFormRow>
  );
}
