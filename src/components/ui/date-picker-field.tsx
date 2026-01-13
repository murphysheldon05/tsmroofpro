import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface DatePickerFieldProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  required = false,
  id,
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  // Parse string date to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parse(value, "yyyy-MM-dd", new Date());
    } catch {
      return undefined;
    }
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && " *"}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
