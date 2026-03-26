import { useMemo, useState } from "react";
import { useProfiles } from "@/hooks/useKpiScorecards";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function UserSelect({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Select user...",
}: UserSelectProps) {
  const { data: profiles = [] } = useProfiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = profiles.filter((p) => !excludeIds.includes(p.id));
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }, [profiles, excludeIds, search]);

  const selected = profiles.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(selected.full_name ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              {selected.full_name || selected.email}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  p.id === value && "bg-accent"
                )}
                onClick={() => {
                  onChange(p.id === value ? null : p.id);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(p.full_name ?? "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-left">
                  {p.full_name || p.email}
                </span>
                {p.id === value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface UserMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function UserMultiSelect({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Select users...",
}: UserMultiSelectProps) {
  const { data: profiles = [] } = useProfiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allExcluded = [...excludeIds, ...value];

  const filtered = useMemo(() => {
    const base = profiles.filter((p) => !excludeIds.includes(p.id));
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }, [profiles, excludeIds, search]);

  const selectedProfiles = profiles.filter((p) => value.includes(p.id));

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  };

  return (
    <div className="space-y-2">
      {selectedProfiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProfiles.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs"
            >
              {p.full_name || p.email}
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-2 border-b border-border">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                    value.includes(p.id) && "bg-accent"
                  )}
                  onClick={() => toggle(p.id)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(p.full_name ?? "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left">
                    {p.full_name || p.email}
                  </span>
                  {value.includes(p.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
