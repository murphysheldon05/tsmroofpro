import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const baseClasses = "font-mono tracking-wide tabular-nums transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";

export function CurrencyInput({
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  placeholder = "$0.00",
  className,
  required = false,
}: CurrencyInputProps) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onWheel={(e) => e.currentTarget.blur()}
      disabled={disabled}
      className={cn(baseClasses, className)}
      placeholder={placeholder}
      required={required}
    />
  );
}
