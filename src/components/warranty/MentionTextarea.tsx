import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionedUsers: (userIds: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  email?: string | null;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionedUsers,
  placeholder = "Add a comment... Use @ to mention someone",
  rows = 2,
  className,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-mentions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_approved", true)
        .not("full_name", "is", null)
        .order("full_name");
      if (error) throw error;
      return data as ProfileOption[];
    },
  });

  const filteredProfiles = profiles.filter(p => {
    const displayName = formatDisplayName(p.full_name, p.email);
    return displayName?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase());
  }).slice(0, 6);

  // Parse @mentions from text and extract user IDs
  const extractMentionedUserIds = useCallback((text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const ids: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      ids.push(match[2]);
    }
    return ids;
  }, []);

  useEffect(() => {
    onMentionedUsers(extractMentionedUserIds(value));
  }, [value, extractMentionedUserIds, onMentionedUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check if we're in a @mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show suggestions if @ is at start or after a space, and no spaces in query
      const charBeforeAt = atIndex > 0 ? newValue[atIndex - 1] : " ";
      if ((charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) && !textAfterAt.includes(" ") && !textAfterAt.includes("[")) {
        setMentionQuery(textAfterAt);
        setMentionStart(atIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertMention = (profile: ProfileOption) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart || mentionStart);
    const displayName = formatDisplayName(profile.full_name, profile.email);
    const mention = `@[${displayName}](${profile.id}) `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowSuggestions(false);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredProfiles.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredProfiles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredProfiles[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Render display text (convert @[Name](id) to @Name for display)
  const getDisplayText = (text: string) => {
    return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={getDisplayText(value)}
        onChange={(e) => {
          // We need to map display text changes back to raw text
          // For simplicity, we'll work with raw text directly
          handleChange(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {showSuggestions && filteredProfiles.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-64 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {filteredProfiles.map((profile, index) => (
            <button
              key={profile.id}
              onClick={() => insertMention(profile)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              {formatDisplayName(profile.full_name, profile.email)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility to render note text with highlighted mentions
export function renderMentionText(text: string): React.ReactNode {
  const parts = text.split(/(@\[([^\]]+)\]\(([^)]+)\))/g);
  const result: React.ReactNode[] = [];

  let i = 0;
  while (i < parts.length) {
    if (parts[i]?.startsWith("@[")) {
      // This is a full match - skip it, use next two parts (name, id)
      const name = parts[i + 1];
      result.push(
        <span key={i} className="text-primary font-medium">
          @{name}
        </span>
      );
      i += 3; // Skip full match, name, id
    } else if (parts[i]) {
      result.push(parts[i]);
      i++;
    } else {
      i++;
    }
  }

  return <>{result}</>;
}
