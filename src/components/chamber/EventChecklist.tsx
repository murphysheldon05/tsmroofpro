import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CalendarCheck, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { ChamberEvent } from "@/hooks/useChambers";

const CHECKLIST_ITEMS = [
  { id: "log_contacts", label: "Log all new contacts in CRM", phase: "within24h" },
  { id: "write_notes", label: "Write notes on the back of business cards collected", phase: "within24h" },
  { id: "send_followups", label: "Send personalized follow-up emails / LinkedIn connections", phase: "within48h" },
  { id: "submit_report", label: "Submit Post-Event Report to manager", phase: "within48h" },
  { id: "call_leads", label: "Phone follow-up with warm / qualified leads", phase: "within1wk" },
  { id: "log_expenses", label: "Submit any expense receipts (if applicable)", phase: "within48h" },
  { id: "share_intel", label: "Share any community outreach opportunities with management", phase: "within24h" },
] as const;

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  within24h: { label: "Within 24 hrs", color: "text-red-600 dark:text-red-400" },
  within48h: { label: "Within 48 hrs", color: "text-amber-600 dark:text-amber-400" },
  within1wk: { label: "Within 1 week", color: "text-blue-600 dark:text-blue-400" },
};

interface EventChecklistProps {
  event: ChamberEvent;
}

export function EventChecklist({ event }: EventChecklistProps) {
  const storageKey = `chamber-checklist-${event.id}`;

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  const completedCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;
  const progress = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);
  const allDone = completedCount === CHECKLIST_ITEMS.length;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const d = new Date(event.event_date + "T12:00:00");

  return (
    <Card className={`transition-all ${allDone ? "border-green-300 bg-green-50/30 dark:bg-green-950/10 dark:border-green-800" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] uppercase leading-none font-semibold">{format(d, "MMM")}</span>
              <span className="text-sm font-bold leading-tight">{format(d, "d")}</span>
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{event.name}</CardTitle>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span>{event.chamber_name}</span>
                {event.event_time && (
                  <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{event.event_time}</span>
                )}
                {event.location && (
                  <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{event.location}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {allDone ? (
              <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                {completedCount}/{CHECKLIST_ITEMS.length}
              </Badge>
            )}
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-0.5">
          {(["within24h", "within48h", "within1wk"] as const).map((phase) => {
            const items = CHECKLIST_ITEMS.filter((i) => i.phase === phase);
            const phaseInfo = PHASE_LABELS[phase];
            return (
              <div key={phase}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-2 mb-1 ${phaseInfo.color}`}>
                  {phaseInfo.label}
                </p>
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                      checked[item.id] ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggle(item.id)}
                      className="shrink-0"
                    />
                    <span className={`text-sm ${checked[item.id] ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
