import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface MentionOption {
  id: string;
  full_name: string;
}

interface FeedMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionedUserIds: (ids: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;
export function extractMentionIds(text: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(MENTION_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ids.push(m[2]);
  return ids;
}

export function FeedMentionTextarea({
  value,
  onChange,
  onMentionedUserIds,
  placeholder = "Write something... Use @ to mention someone",
  rows = 3,
  className,
}: FeedMentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-feed-mentions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("employee_status", "active")
        .not("full_name", "is", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as MentionOption[];
    },
  });

  const filtered = profiles
    .filter((p) => p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    onMentionedUserIds(extractMentionIds(value));
  }, [value, onMentionedUserIds]);

  function getMentionMap(raw: string): Map<string, string> {
    const map = new Map<string, string>();
    const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) map.set(m[1], m[2]);
    return map;
  }

  function displayToRaw(display: string, previousRaw: string): string {
    const map = getMentionMap(previousRaw);
    if (map.size === 0) return display;
    let raw = display;
    for (const [name, id] of map) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`@${escaped}(?=\\s|$|[,.)\\]])`, "g");
      raw = raw.replace(re, `@[${name}](${id})`);
    }
    return raw;
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const pos = e.target.selectionStart ?? 0;
    const newRaw = displayToRaw(v, value);
    onChange(newRaw);
    const before = v.slice(0, pos);
    const at = before.lastIndexOf("@");
    if (at !== -1) {
      const afterAt = before.slice(at + 1);
      const charBefore = at > 0 ? v[at - 1] : " ";
      if (
        (charBefore === " " || charBefore === "\n" || at === 0) &&
        !afterAt.includes(" ") &&
        !afterAt.includes("[")
      ) {
        setMentionQuery(afterAt);
        setMentionStart(at);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  /** Map display position to raw position in value */
  function displayPosToRawPos(displayPos: number): number {
    let raw = 0,
      disp = 0;
    while (raw < value.length && disp < displayPos) {
      const rest = value.slice(raw);
      const match = rest.match(/^@\[([^\]]+)\]\([^)]+\)/);
      if (match) {
        disp += 1 + match[1].length;
        raw += match[0].length;
      } else {
        raw++;
        disp++;
      }
    }
    return raw;
  }

  const insertMention = (profile: MentionOption) => {
    const cursorDisplay = textareaRef.current?.selectionStart ?? mentionStart;
    const rawStart = displayPosToRawPos(mentionStart);
    const rawEnd = displayPosToRawPos(cursorDisplay);
    const before = value.slice(0, rawStart);
    const after = value.slice(rawEnd);
    const token = `@[${profile.full_name}](${profile.id}) `;
    onChange(before + token + after);
    setShowSuggestions(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === "Escape") setShowSuggestions(false);
  };

  const displayValue = value.replace(new RegExp(MENTION_REGEX.source, "g"), "@$1");

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => handleChange(e)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn("resize-none", className)}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-64 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.map((profile, i) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => insertMention(profile)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                i === selectedIndex && "bg-accent"
              )}
            >
              {profile.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Render content with @[Name](id) as bold @Name */
export function renderFeedMentionText(text: string): React.ReactNode {
  const parts = text.split(/(@\[([^\]]+)\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("@[")) {
      const name = parts[i + 1];
      return (
        <span key={i} className="font-medium text-primary">
          @{name}
        </span>
      );
    }
    if (part && !part.match(/^@\[/)) return part;
    return null;
  });
}
