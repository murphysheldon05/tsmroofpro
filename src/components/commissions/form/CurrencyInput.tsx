import { useRef, useCallback } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    onFocus();
    // Auto-select text so user can type to replace immediately
    setTimeout(() => inputRef.current?.select(), 0);
  }, [onFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Find next focusable input in the form
      const form = (e.target as HTMLElement).closest("form, [role='dialog'], .space-y-3, .space-y-4");
      if (form) {
        const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])"));
        const idx = inputs.indexOf(e.target as HTMLInputElement);
        if (idx >= 0 && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      }
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      onWheel={(e) => e.currentTarget.blur()}
      disabled={disabled}
      className={cn(baseClasses, className)}
      placeholder={placeholder}
      required={required}
    />
  );
}
