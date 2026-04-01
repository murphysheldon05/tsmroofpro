import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Trash2, Minimize2, CalendarPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useScheduleAI, ChatMessage, ScheduleAction } from "@/hooks/useScheduleAI";

const QUICK_CHIPS = [
  { label: "Tile", query: "How far out are we on concrete tile?" },
  { label: "Shingle", query: "How far out are we on asphalt shingles?" },
  { label: "Foam", query: "How far out are we on foam?" },
  { label: "Coatings", query: "How far out are we on coatings?" },
  { label: "All Types", query: "Give me an overview of all product types." },
  { label: "Schedule a Job", query: "I need to schedule a new job" },
];

const ROOF_TYPE_LABELS: Record<string, string> = {
  tile: "Concrete Tile",
  shingle: "Asphalt Shingles",
  foam: "Foam",
  coatings: "Coatings",
};

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ConfirmationCard({
  event,
  onConfirm,
  onCancel,
  isLoading,
  confirmed,
}: {
  event: Record<string, unknown>;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  confirmed: boolean;
}) {
  const roofLabel = ROOF_TYPE_LABELS[event.roof_type as string] || event.roof_type;

  if (confirmed) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Scheduled
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-500">
          {event.title as string} — {formatEventDate(event.start_date as string)} with {event.crew_name as string}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/60 border rounded-xl p-3 space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarPlus className="h-4 w-4 text-primary" />
        Confirm Scheduling
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="text-muted-foreground">Job</div>
        <div className="font-medium truncate">{event.title as string}</div>
        <div className="text-muted-foreground">Type</div>
        <div className="font-medium">{roofLabel as string}</div>
        <div className="text-muted-foreground">Squares</div>
        <div className="font-medium">{event.squares as number}</div>
        <div className="text-muted-foreground">Crew</div>
        <div className="font-medium">{event.crew_name as string}</div>
        <div className="text-muted-foreground">Start</div>
        <div className="font-medium">{formatEventDate(event.start_date as string)}</div>
        {event.end_date && (
          <>
            <div className="text-muted-foreground">End</div>
            <div className="font-medium">{formatEventDate(event.end_date as string)}</div>
          </>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Scheduling..." : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={onCancel}
          disabled={isLoading}
        >
          Start Over
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  onConfirm,
  onCancel,
  isLoading,
  isLastConfirm,
}: {
  msg: ChatMessage;
  onConfirm: (event: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
  isLastConfirm: boolean;
}) {
  const isUser = msg.role === "user";
  const hasConfirm = msg.action?.type === "confirm" && msg.action.event;
  const isScheduled = msg.action?.type === "scheduled";

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {msg.content}
      </div>
      {hasConfirm && isLastConfirm && (
        <div className="w-full max-w-[85%]">
          <ConfirmationCard
            event={msg.action!.event!}
            onConfirm={() => onConfirm(msg.action!.event!)}
            onCancel={onCancel}
            isLoading={isLoading}
            confirmed={false}
          />
        </div>
      )}
      {hasConfirm && !isLastConfirm && (
        <div className="w-full max-w-[85%]">
          <ConfirmationCard
            event={msg.action!.event!}
            onConfirm={() => {}}
            onCancel={() => {}}
            isLoading={false}
            confirmed={true}
          />
        </div>
      )}
      {isScheduled && (
        <div className="w-full max-w-[85%]">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Added to calendar</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function ScheduleAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, sendMessage, confirmSchedule, clearChat } = useScheduleAI();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = (event: Record<string, unknown>) => {
    confirmSchedule(event);
  };

  const lastConfirmIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].action?.type === "confirm") return i;
    }
    return -1;
  })();

  const hasActiveConfirm = lastConfirmIdx >= 0 &&
    !messages.slice(lastConfirmIdx + 1).some((m) => m.action?.type === "scheduled");

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all hover:shadow-xl group"
        title="Schedule Assistant"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold leading-tight">Schedule Assistant</p>
            <p className="text-[11px] opacity-80">Availability &amp; scheduling</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={clearChat}
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsOpen(false)}
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[340px]">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onConfirm={handleConfirm}
            onCancel={clearChat}
            isLoading={isLoading}
            isLastConfirm={hasActiveConfirm && idx === lastConfirmIdx}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Quick chips */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.query)}
              disabled={isLoading}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-50",
                chip.label === "Schedule a Job"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                  : "bg-background text-foreground hover:bg-accent"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasActiveConfirm ? "Or type to change something..." : "Ask about the schedule..."}
          disabled={isLoading}
          className="flex-1 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
