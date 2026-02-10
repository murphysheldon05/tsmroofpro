import { useState, useEffect, useMemo } from "react";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfWeek, endOfWeek, differenceInDays,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, GripVertical,
  Users, Filter, Calendar, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProductionCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent,
  useDeleteCalendarEvent, ProductionCalendarEvent, EVENT_CATEGORIES, EventCategory,
} from "@/hooks/useProductionCalendar";
import { useCrews, useCreateCrew, useUpdateCrew, useDeleteCrew, Crew } from "@/hooks/useCrews";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { HoldWarningBanner } from "@/components/compliance/HoldWarningBanner";
import { TodaysBuildsSection } from "@/components/production/TodaysBuildsSection";
import { DayOverflowModal, OverflowTrigger } from "@/components/calendar/DayOverflowModal";

type CalendarView = "day" | "week" | "month";

function getStoredView(): CalendarView {
  try { return (localStorage.getItem("build-calendar-view") as CalendarView) || "week"; }
  catch { return "week"; }
}

export default function BuildSchedule() {
  const [view, setView] = useState<CalendarView>(getStoredView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ProductionCalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [visibleCrews, setVisibleCrews] = useState<Set<string>>(new Set(["all"]));
  const [crewPanelOpen, setCrewPanelOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProductionCalendarEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start_date: "", end_date: "", event_category: "other" as EventCategory, crew_id: "" });
  const [overflowDate, setOverflowDate] = useState<Date | null>(null);

  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [deleteCrewConfirm, setDeleteCrewConfirm] = useState<string | null>(null);
  const [newCrew, setNewCrew] = useState({ name: "", color: "#3b82f6" });

  const { isManager, isAdmin } = useAuth();
  const { data: userHolds } = useUserHoldsCheck();
  const canEdit = isManager || isAdmin;
  const schedulingHolds = userHolds?.filter(h => h.hold_type === "scheduling_hold") || [];
  const hasSchedulingHold = schedulingHolds.length > 0;

  const { data: crews = [] } = useCrews();
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();
  const deleteCrew = useDeleteCrew();

  const { data: events = [], isLoading } = useProductionCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  useEffect(() => { localStorage.setItem("build-calendar-view", view); }, [view]);

  // Crew filtering
  const toggleCrewFilter = (crewId: string) => {
    setVisibleCrews(prev => {
      if (crewId === "all") return new Set(["all"]);
      const next = new Set(prev);
      next.delete("all");
      if (next.has(crewId)) { next.delete(crewId); if (next.size === 0) return new Set(["all"]); }
      else next.add(crewId);
      return next;
    });
  };
  const isCrewVisible = (crewId: string | null) => {
    if (visibleCrews.has("all")) return true;
    return crewId ? visibleCrews.has(crewId) : visibleCrews.has("unassigned");
  };
  const filteredEvents = events.filter(e => isCrewVisible(e.crew_id));

  const getEventsForDate = (date: Date) =>
    filteredEvents.filter(e => {
      const s = parseISO(e.start_date);
      const en = e.end_date ? parseISO(e.end_date) : s;
      return date >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
             date <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
    });

  const getCrewColor = (id: string | null) => crews.find(c => c.id === id)?.color || "#64748b";
  const getCrewName = (id: string | null) => crews.find(c => c.id === id)?.name || "Unassigned";

  // Week builds count per crew
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const crewWeekCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    crews.forEach(c => { counts[c.id] = 0; });
    events.forEach(e => {
      const s = parseISO(e.start_date);
      if (s >= weekStart && s <= weekEnd && e.crew_id) counts[e.crew_id] = (counts[e.crew_id] || 0) + 1;
    });
    return counts;
  }, [crews, events, weekStart, weekEnd]);

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (view === "day") setCurrentDate(d => subDays(d, 1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };
  const goNext = () => {
    if (view === "day") setCurrentDate(d => addDays(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, event: ProductionCalendarEvent) => {
    if (!canEdit) return;
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", event.id);
  };
  const handleDragOver = (e: React.DragEvent, date: Date) => {
    if (!canEdit || !draggedEvent) return;
    e.preventDefault();
    setDragOverDate(date);
  };
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!canEdit || !draggedEvent) return;
    const orig = parseISO(draggedEvent.start_date);
    const diff = differenceInDays(targetDate, orig);
    if (diff !== 0) {
      updateEvent.mutate({
        id: draggedEvent.id,
        start_date: format(targetDate, "yyyy-MM-dd"),
        end_date: draggedEvent.end_date ? format(new Date(parseISO(draggedEvent.end_date).getTime() + diff * 86400000), "yyyy-MM-dd") : undefined,
      });
    }
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  // Event CRUD
  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start_date) return;
    createEvent.mutate({
      title: newEvent.title, description: newEvent.description || undefined,
      start_date: newEvent.start_date, end_date: newEvent.end_date || undefined,
      event_category: newEvent.event_category, crew_id: newEvent.crew_id || undefined,
    }, {
      onSuccess: () => { setIsAddOpen(false); setNewEvent({ title: "", description: "", start_date: "", end_date: "", event_category: "other", crew_id: "" }); },
    });
  };
  const handleUpdateEvent = () => {
    if (!editingEvent) return;
    updateEvent.mutate({
      id: editingEvent.id, title: editingEvent.title, description: editingEvent.description || undefined,
      start_date: editingEvent.start_date, end_date: editingEvent.end_date || undefined,
      event_category: editingEvent.event_category, crew_id: editingEvent.crew_id || undefined,
    }, { onSuccess: () => setEditingEvent(null) });
  };
  const handleDeleteConfirm = () => {
    if (deleteConfirmId) { deleteEvent.mutate(deleteConfirmId); setDeleteConfirmId(null); }
  };

  // Crew CRUD
  const handleAddCrew = () => {
    if (!newCrew.name) return;
    createCrew.mutate(newCrew, { onSuccess: () => { setIsAddCrewOpen(false); setNewCrew({ name: "", color: "#3b82f6" }); } });
  };
  const handleUpdateCrew = () => {
    if (!editingCrew) return;
    updateCrew.mutate({ id: editingCrew.id, name: editingCrew.name, color: editingCrew.color }, { onSuccess: () => setEditingCrew(null) });
  };
  const handleDeleteCrewConfirm = () => {
    if (deleteCrewConfirm) { deleteCrew.mutate(deleteCrewConfirm); setDeleteCrewConfirm(null); }
  };

  // Date ranges
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const monthPadding = Array(monthStart.getDay()).fill(null);

  // Header label
  const headerLabel = view === "day" ? format(currentDate, "EEEE, MMMM d, yyyy")
    : view === "week" ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  // Event card component
  const EventCard = ({ event, compact = false }: { event: ProductionCalendarEvent; compact?: boolean }) => {
    const color = getCrewColor(event.crew_id);
    const cat = EVENT_CATEGORIES[event.event_category] || EVENT_CATEGORIES.other;
    const isDragging = draggedEvent?.id === event.id;
    return (
      <div
        draggable={canEdit}
        onDragStart={e => handleDragStart(e, event)}
        onDragEnd={() => { setDraggedEvent(null); setDragOverDate(null); }}
        onClick={e => { e.stopPropagation(); setEditingEvent(event); }}
        className={cn(
          "rounded-lg border cursor-pointer transition-all hover:shadow-md",
          compact ? "p-1.5 text-xs" : "p-3",
          canEdit && "active:cursor-grabbing",
          isDragging && "opacity-40"
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {event.crew_id && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: color }}>
              {getCrewName(event.crew_id)}
            </span>
          )}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cat.bgColor, cat.color)}>
            {cat.label}
          </span>
        </div>
        <p className={cn("font-medium truncate mt-1", compact ? "text-xs" : "text-sm")}>{event.title}</p>
        {!compact && event.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>}
      </div>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-7 gap-2">
            {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Build Schedule</h1>
              <p className="text-sm text-muted-foreground">Production build scheduling</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Sheet open={crewPanelOpen} onOpenChange={setCrewPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1.5" />Crews</Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader><SheetTitle>Crew Management</SheetTitle></SheetHeader>
                  <div className="mt-4 space-y-3">
                    {crews.map(crew => (
                      <div key={crew.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: crew.color }} />
                          <div>
                            <p className="text-sm font-medium">{crew.name}</p>
                            <p className="text-xs text-muted-foreground">{crewWeekCounts[crew.id] || 0} builds this week</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCrew(crew)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteCrewConfirm(crew.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => setIsAddCrewOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Crew</Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => setIsAddOpen(true)} disabled={hasSchedulingHold} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" />Add Build
              </Button>
            )}
          </div>
        </div>

        <HoldWarningBanner holds={schedulingHolds} context="scheduling" />

        {/* Today's Builds Section */}
        <TodaysBuildsSection />

        {/* View toggle + navigation */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {(["day", "week", "month"] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]",
                  view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-medium text-sm min-w-[160px] text-center">{headerLabel}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Crew filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => toggleCrewFilter("all")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap min-h-[36px]", visibleCrews.has("all") ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent")}>All Crews</button>
          {crews.map(crew => (
            <button key={crew.id} onClick={() => toggleCrewFilter(crew.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap min-h-[36px]", visibleCrews.has(crew.id) ? "text-white border-transparent" : "bg-background text-muted-foreground border-border hover:bg-accent")} style={visibleCrews.has(crew.id) ? { backgroundColor: crew.color } : undefined}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crew.color }} />{crew.name}
            </button>
          ))}
        </div>

        {/* Calendar Views */}
        {view === "day" && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {getEventsForDate(currentDate).length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No builds scheduled for this day</p>
                ) : (
                  getEventsForDate(currentDate).map(e => <EventCard key={e.id} event={e} />)
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {view === "week" && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              const dayEvents = getEventsForDate(day);
              const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={e => handleDragOver(e, day)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, day)}
                  className={cn(
                    "min-h-[140px] border rounded-lg p-2 transition-all",
                    isToday && "bg-primary/5 border-primary/30",
                    isDragOver && "ring-2 ring-primary bg-primary/10"
                  )}
                >
                  <div className={cn("text-xs font-medium mb-1.5 text-center", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format(day, "EEE")}
                    <span className={cn("ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs", isToday && "bg-primary text-primary-foreground")}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => <EventCard key={e.id} event={e} compact />)}
                    {dayEvents.length > 3 && <OverflowTrigger count={dayEvents.length - 3} onClick={() => setOverflowDate(day)} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "month" && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>
                ))}
                {monthPadding.map((_, i) => <div key={`pad-${i}`} className="h-16 bg-muted/20 rounded" />)}
                {monthDays.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      onDragOver={e => handleDragOver(e, day)}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={e => handleDrop(e, day)}
                      className={cn(
                        "h-16 p-1 border rounded cursor-pointer transition-all hover:bg-accent/50",
                        isToday && "bg-primary/10",
                        isSelected && "ring-2 ring-primary",
                        isDragOver && "ring-2 ring-primary bg-primary/20"
                      )}
                    >
                      <div className={cn("text-xs font-medium", isToday && "text-primary")}>{format(day, "d")}</div>
                      <div className="flex gap-0.5 flex-wrap mt-0.5">
                        {dayEvents.slice(0, 4).map(e => (
                          <div key={e.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: getCrewColor(e.crew_id) }} />
                        ))}
                        {dayEvents.length > 4 && (
                          <button onClick={(e) => { e.stopPropagation(); setOverflowDate(day); }} className="text-[9px] text-primary hover:underline cursor-pointer">+{dayEvents.length - 4}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected day detail panel for month view */}
              {selectedDate && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h3>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {getEventsForDate(selectedDate).map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mobile FAB */}
        {canEdit && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform"
            disabled={hasSchedulingHold}
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Day overflow modal */}
      <DayOverflowModal date={overflowDate} onClose={() => setOverflowDate(null)}>
        {overflowDate && getEventsForDate(overflowDate).map(e => <EventCard key={e.id} event={e} />)}
      </DayOverflowModal>

      {/* Add Event Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Build Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Job name / address" /></div>
            <div><Label>Description</Label><Textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Optional notes" /></div>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField label="Start Date *" value={newEvent.start_date} onChange={d => setNewEvent({ ...newEvent, start_date: d })} />
              <DatePickerField label="End Date" value={newEvent.end_date} onChange={d => setNewEvent({ ...newEvent, end_date: d })} />
            </div>
            <div><Label>Category</Label>
              <Select value={newEvent.event_category} onValueChange={(v: EventCategory) => setNewEvent({ ...newEvent, event_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EVENT_CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Crew</Label>
              <Select value={newEvent.crew_id} onValueChange={v => setNewEvent({ ...newEvent, crew_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign crew" /></SelectTrigger>
                <SelectContent>{crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.start_date}>Add Build</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editingEvent.title} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editingEvent.description || ""} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField label="Start Date" value={editingEvent.start_date} onChange={d => setEditingEvent({ ...editingEvent, start_date: d })} />
                <DatePickerField label="End Date" value={editingEvent.end_date || ""} onChange={d => setEditingEvent({ ...editingEvent, end_date: d })} />
              </div>
              <div><Label>Category</Label>
                <Select value={editingEvent.event_category} onValueChange={(v: EventCategory) => setEditingEvent({ ...editingEvent, event_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(EVENT_CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Crew</Label>
                <Select value={editingEvent.crew_id || ""} onValueChange={v => setEditingEvent({ ...editingEvent, crew_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Assign crew" /></SelectTrigger>
                  <SelectContent>{crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <div>
              {canEdit && editingEvent && (
                <Button variant="destructive" size="sm" onClick={() => { setDeleteConfirmId(editingEvent.id); setEditingEvent(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
              <Button onClick={handleUpdateEvent}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Crew Dialog */}
      <Dialog open={isAddCrewOpen} onOpenChange={setIsAddCrewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Crew</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Crew Name</Label><Input value={newCrew.name} onChange={e => setNewCrew({ ...newCrew, name: e.target.value })} placeholder="e.g., Crew A" /></div>
            <div><Label>Color</Label><div className="flex gap-2 items-center"><Input type="color" value={newCrew.color} onChange={e => setNewCrew({ ...newCrew, color: e.target.value })} className="w-16 h-10 p-1 cursor-pointer" /><span className="text-sm text-muted-foreground">{newCrew.color}</span></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddCrewOpen(false)}>Cancel</Button><Button onClick={handleAddCrew} disabled={!newCrew.name}>Add Crew</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Crew Dialog */}
      <Dialog open={!!editingCrew} onOpenChange={() => setEditingCrew(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Crew</DialogTitle></DialogHeader>
          {editingCrew && (
            <div className="space-y-4">
              <div><Label>Crew Name</Label><Input value={editingCrew.name} onChange={e => setEditingCrew({ ...editingCrew, name: e.target.value })} /></div>
              <div><Label>Color</Label><div className="flex gap-2 items-center"><Input type="color" value={editingCrew.color} onChange={e => setEditingCrew({ ...editingCrew, color: e.target.value })} className="w-16 h-10 p-1 cursor-pointer" /><span className="text-sm text-muted-foreground">{editingCrew.color}</span></div></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditingCrew(null)}>Cancel</Button><Button onClick={handleUpdateCrew}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Crew Confirm */}
      <AlertDialog open={!!deleteCrewConfirm} onOpenChange={() => setDeleteCrewConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Crew</AlertDialogTitle>
            <AlertDialogDescription>This will unassign this crew from all future builds. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteCrewConfirm}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
