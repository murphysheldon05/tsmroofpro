import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Clock, MapPin, UserPlus, Edit, Trash2, Check, X } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import type { ChamberEvent, ChamberEventAssignment } from "@/hooks/useChambers";

const EVENT_TYPE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  Networking: { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300" },
  "Ribbon Cutting": { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
  Education: { dot: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300" },
  Meeting: { dot: "bg-gray-400", bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300" },
  Community: { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300" },
  Government: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300" },
  Signature: { dot: "bg-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-300" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ChamberMonthCalendarProps {
  events: ChamberEvent[];
  eventAssignments?: Record<string, ChamberEventAssignment[]>;
  myAssignmentMap?: Record<string, ChamberEventAssignment>;
  isAdmin?: boolean;
  onAssignEvent?: (eventId: string, eventName: string) => void;
  onEditEvent?: (event: ChamberEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onConfirm?: (assignmentId: string) => void;
  onDecline?: (assignmentId: string) => void;
}

export function ChamberMonthCalendar({
  events,
  eventAssignments,
  myAssignmentMap,
  isAdmin = false,
  onAssignEvent,
  onEditEvent,
  onDeleteEvent,
  onConfirm,
  onDecline,
}: ChamberMonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsByDate = useMemo(() => {
    const map: Record<string, ChamberEvent[]> = {};
    for (const e of events) {
      const key = e.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const monthEventCount = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.event_date + "T12:00:00");
      return isSameMonth(d, currentMonth);
    }).length;
  }, [events, currentMonth]);

  return (
    <div className="space-y-4">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h3>
          <p className="text-xs text-muted-foreground">{monthEventCount} event{monthEventCount !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2 border-b">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[dateKey] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={di}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r p-1 transition-colors ${
                    !inMonth ? "bg-muted/20" : today ? "bg-primary/5" : "bg-background"
                  } ${di === 6 ? "border-r-0" : ""}`}
                >
                  {/* Day number */}
                  <div className={`text-right text-xs mb-0.5 ${
                    !inMonth ? "text-muted-foreground/40" : today ? "font-bold text-primary" : "text-muted-foreground"
                  }`}>
                    {today ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {format(day, "d")}
                      </span>
                    ) : (
                      format(day, "d")
                    )}
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const colors = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.Meeting;
                      return (
                        <EventPill
                          key={event.id}
                          event={event}
                          colors={colors}
                          isAdmin={isAdmin}
                          assignments={eventAssignments?.[event.id]}
                          myAssignment={myAssignmentMap?.[event.id]}
                          onAssign={onAssignEvent}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onConfirm={onConfirm}
                          onDecline={onDecline}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground text-center">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventPill({
  event,
  colors,
  isAdmin,
  assignments,
  myAssignment,
  onAssign,
  onEdit,
  onDelete,
  onConfirm,
  onDecline,
}: {
  event: ChamberEvent;
  colors: { dot: string; bg: string; text: string };
  isAdmin: boolean;
  assignments?: ChamberEventAssignment[];
  myAssignment?: ChamberEventAssignment;
  onAssign?: (eventId: string, eventName: string) => void;
  onEdit?: (event: ChamberEvent) => void;
  onDelete?: (eventId: string) => void;
  onConfirm?: (assignmentId: string) => void;
  onDecline?: (assignmentId: string) => void;
}) {
  const status = myAssignment?.status;
  const statusBorder =
    status === "confirmed" ? "ring-1 ring-green-400"
    : status === "declined" ? "ring-1 ring-red-400 opacity-50"
    : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight font-medium truncate ${colors.bg} ${colors.text} ${statusBorder} hover:brightness-95 transition-all cursor-pointer`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors.dot} mr-0.5 align-middle`} />
          {event.name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 space-y-2">
          <div>
            <h4 className="font-semibold text-sm">{event.name}</h4>
            <p className="text-xs text-muted-foreground">{event.chamber_name}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${colors.bg} ${colors.text}`}>
              {event.event_type}
            </Badge>
            {event.is_manual && (
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">Manual</Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              {format(new Date(event.event_date + "T12:00:00"), "EEE, MMM d, yyyy")}
              {event.event_time && ` at ${event.event_time}`}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {event.location}
              </div>
            )}
          </div>

          {/* Admin: show assigned reps */}
          {isAdmin && assignments && assignments.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assigned Reps</p>
              <div className="space-y-0.5">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span>{a.user_name}</span>
                    <Badge variant="outline" className={`text-[9px] py-0 ${
                      a.status === "confirmed" ? "bg-green-50 text-green-700 border-green-300" :
                      a.status === "declined" ? "bg-red-50 text-red-700 border-red-300" :
                      "bg-blue-50 text-blue-700 border-blue-300"
                    }`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rep: show confirm/decline */}
          {!isAdmin && myAssignment && myAssignment.status === "assigned" && (
            <div className="border-t pt-2 flex gap-2">
              <Button size="sm" variant="neon" className="flex-1 gap-1 h-7 text-xs" onClick={() => onConfirm?.(myAssignment.id)}>
                <Check className="h-3 w-3" /> Confirm
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => onDecline?.(myAssignment.id)}>
                <X className="h-3 w-3" /> Decline
              </Button>
            </div>
          )}
          {!isAdmin && myAssignment && myAssignment.status !== "assigned" && (
            <div className="border-t pt-2">
              <Badge variant="outline" className={`text-[10px] ${
                myAssignment.status === "confirmed" ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"
              }`}>
                {myAssignment.status === "confirmed" ? "Confirmed" : "Declined"}
              </Badge>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="border-t pt-2 flex gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => onAssign?.(event.id, event.name)}>
                <UserPlus className="h-3 w-3" /> Assign
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit?.(event)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete?.(event.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
