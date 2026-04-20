import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChamberActivityLog, ChamberEvent } from "@/hooks/useChambers";

interface ChamberActivityLogFormProps {
  event: ChamberEvent;
  existingLog?: ChamberActivityLog | null;
  onSubmit: (payload: {
    attended_on: string;
    contacts_made: number;
    inspections_generated: number;
    notes: string;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ChamberActivityLogForm({
  event,
  existingLog,
  onSubmit,
  isSubmitting = false,
}: ChamberActivityLogFormProps) {
  const [attendedOn, setAttendedOn] = useState(
    existingLog?.attended_on ?? event.event_date,
  );
  const [contactsMade, setContactsMade] = useState(
    existingLog?.contacts_made ?? 0,
  );
  const [inspectionsGenerated, setInspectionsGenerated] = useState(
    existingLog?.inspections_generated ?? 0,
  );
  const [notes, setNotes] = useState(existingLog?.notes ?? "");

  const summary = useMemo(() => {
    return `${contactsMade} contact${contactsMade === 1 ? "" : "s"} · ${inspectionsGenerated} inspection${inspectionsGenerated === 1 ? "" : "s"}`;
  }, [contactsMade, inspectionsGenerated]);

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {existingLog ? "Update Activity Log" : "Log Chamber Activity"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
          <div className="font-medium">{event.name}</div>
          <div className="text-muted-foreground">
            {event.chamber_name} · {event.event_date}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{summary}</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`attended-on-${event.id}`}>Date Attended</Label>
            <Input
              id={`attended-on-${event.id}`}
              type="date"
              value={attendedOn}
              onChange={(e) => setAttendedOn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`contacts-made-${event.id}`}>Contacts Made</Label>
            <Input
              id={`contacts-made-${event.id}`}
              type="number"
              min={0}
              value={contactsMade}
              onChange={(e) => setContactsMade(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`inspections-generated-${event.id}`}>
              Inspections Generated
            </Label>
            <Input
              id={`inspections-generated-${event.id}`}
              type="number"
              min={0}
              value={inspectionsGenerated}
              onChange={(e) =>
                setInspectionsGenerated(Number(e.target.value) || 0)
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`activity-notes-${event.id}`}>Notes</Label>
          <Textarea
            id={`activity-notes-${event.id}`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Who you met, follow-up items, and anything leadership should know."
          />
        </div>

        <Button
          onClick={() =>
            onSubmit({
              attended_on: attendedOn,
              contacts_made: contactsMade,
              inspections_generated: inspectionsGenerated,
              notes,
            })
          }
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : existingLog ? "Update Activity" : "Submit Activity"}
        </Button>
      </CardContent>
    </Card>
  );
}
