import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, User } from "lucide-react";

export interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface UserPickerProps {
  value: { email: string; name: string };
  onChange: (email: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Check if string looks like an email */
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function UserPicker({
  value,
  onChange,
  placeholder = "Search by name or email...",
  disabled,
  className,
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles-for-user-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active")
        .order("full_name");
      if (error) throw error;
      return (data || []) as UserOption[];
    },
  });

  const filtered = profiles.filter((p) => {
    const displayName = formatDisplayName(p.full_name, p.email);
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      displayName.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.full_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const displayValue = value.name
    ? `${value.name} <${value.email}>`
    : value.email || "";

  const handleSelect = (p: UserOption) => {
    const name = formatDisplayName(p.full_name, p.email) || p.email || "";
    onChange(p.email || "", name);
    setOpen(false);
    setSearch("");
  };

  const handleCustomEmail = () => {
    const trimmed = search.trim();
    if (isValidEmail(trimmed)) {
      const nameFromEmail = trimmed.split("@")[0].replace(/[._-]/g, " ");
      const name =
        nameFromEmail.charAt(0).toUpperCase() +
        nameFromEmail.slice(1).toLowerCase();
      onChange(trimmed.toLowerCase(), name);
      setOpen(false);
      setSearch("");
    }
  };

  const showCustomOption =
    search.trim().length > 0 &&
    isValidEmail(search.trim()) &&
    !profiles.some(
      (p) => p.email?.toLowerCase() === search.trim().toLowerCase()
    );

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "[&>span]:line-clamp-1"
            )}
          >
            <span className="truncate">
              {displayValue || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {showCustomOption
                    ? "Or add as custom recipient below"
                    : "No users found. Type a valid email to add a custom recipient."}
                </div>
              </CommandEmpty>
              {showCustomOption && (
                <CommandGroup heading="Custom">
                  <CommandItem onSelect={handleCustomEmail}>
                    <User className="mr-2 h-4 w-4" />
                    Add &quot;{search.trim()}&quot; as recipient
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Users in system">
                {filtered.slice(0, 10).map((p) => {
                  const displayName = formatDisplayName(p.full_name, p.email) || p.email || "Unknown";
                  return (
                    <CommandItem
                      key={p.id}
                      value={`${p.id}-${p.email}`}
                      onSelect={() => handleSelect(p)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{displayName}</span>
                        {p.email && (
                          <span className="text-xs text-muted-foreground">
                            {p.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
