import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, ChevronsUpDown } from "lucide-react";

type ProfileRow = { id: string; full_name: string | null; email: string | null };

interface UserUuidMultiSelectProps {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
  helperText?: string;
  disabled?: boolean;
}

export function UserUuidMultiSelect({
  label,
  value,
  onChange,
  helperText,
  disabled,
}: UserUuidMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["kpi-scorecards-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    enabled: open || value.length > 0,
  });

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = formatDisplayName(p.full_name, p.email).toLowerCase();
      return name.includes(q) || (p.email?.toLowerCase().includes(q) ?? false);
    });
  }, [profiles, search]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length === 0 ? "Select users…" : `${value.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-[220px]">
            {isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No users found.</p>
            ) : (
              <ul className="p-1 space-y-0.5">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/80",
                        value.includes(p.id) && "bg-muted/50"
                      )}
                    >
                      <Checkbox checked={value.includes(p.id)} className="pointer-events-none" />
                      <span className="truncate">{formatDisplayName(p.full_name, p.email)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = byId.get(id);
            const text = p ? formatDisplayName(p.full_name, p.email) : id.slice(0, 8);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-[140px] truncate">{text}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() => remove(id)}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
