import { useState, useEffect, useMemo } from "react";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfWeek, endOfWeek, differenceInDays,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Truck, CheckCircle, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeliveryCalendarEvents, useCreateDeliveryEvent, useUpdateDeliveryEvent,
  useDeleteDeliveryEvent, DeliveryCalendarEvent,
} from "@/hooks/useDeliveryCalendar";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { TodaysDeliveriesSection } from "@/components/production/TodaysDeliveriesSection";
import { DayOverflowModal, OverflowTrigger } from "@/components/calendar/DayOverflowModal";

type CalendarView = "day" | "week" | "month";

const DELIVERY_STATUSES = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", dotColor: "#3b82f6", icon: Clock },
  in_transit: { label: "In Transit", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", dotColor: "#f59e0b", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", dotColor: "#22c55e", icon: CheckCircle },
  delayed: { label: "Delayed", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", dotColor: "#ef4444", icon: AlertTriangle },
};

// Now using proper status column on delivery_calendar_events table
function getDeliveryStatus(event: DeliveryCalendarEvent): string {
  return event.status || "scheduled";
}
function getDeliveryDescription(event: DeliveryCalendarEvent): string {
  return event.description || "";
}

function getStoredView(): CalendarView {
  try { return (localStorage.getItem("delivery-calendar-view") as CalendarView) || "week"; }
  catch { return "week"; }
}

export default function DeliverySchedule() {
  const [view, setView] = useState<CalendarView>(getStoredView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<DeliveryCalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DeliveryCalendarEvent | null>(null);
  const [editStatus, setEditStatus] = useState("scheduled");
  const [editDescription, setEditDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start_date: "", end_date: "", status: "scheduled" });
  const [overflowDate, setOverflowDate] = useState<Date | null>(null);

  const { isManager, isAdmin } = useAuth();
  const canEdit = isManager || isAdmin;

  const { data: events = [], isLoading } = useDeliveryCalendarEvents();
  const createEvent = useCreateDeliveryEvent();
  const updateEvent = useUpdateDeliveryEvent();
  const deleteEvent = useDeleteDeliveryEvent();

  useEffect(() => { localStorage.setItem("delivery-calendar-view", view); }, [view]);

  // When editing event, parse status
  useEffect(() => {
    if (editingEvent) {
      setEditStatus(getDeliveryStatus(editingEvent));
      setEditDescription(getDeliveryDescription(editingEvent));
    }
  }, [editingEvent]);

  const getEventsForDate = (date: Date) =>
    events.filter(e => {
      const s = parseISO(e.start_date);
      const en = e.end_date ? parseISO(e.end_date) : s;
      return date >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
             date <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
    });

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

  const handleDragStart = (e: React.DragEvent, event: DeliveryCalendarEvent) => {
    if (!canEdit) return;
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!canEdit || !draggedEvent) return;
    const diff = differenceInDays(targetDate, parseISO(draggedEvent.start_date));
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

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start_date) return;
    createEvent.mutate({
      title: newEvent.title,
      description: newEvent.description,
      start_date: newEvent.start_date,
      end_date: newEvent.end_date || undefined,
      status: newEvent.status,
    }, {
      onSuccess: () => { setIsAddOpen(false); setNewEvent({ title: "", description: "", start_date: "", end_date: "", status: "scheduled" }); },
    });
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;
    updateEvent.mutate({
      id: editingEvent.id,
      title: editingEvent.title,
      description: editDescription,
      status: editStatus,
      start_date: editingEvent.start_date,
      end_date: editingEvent.end_date || undefined,
    }, { onSuccess: () => setEditingEvent(null) });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) { deleteEvent.mutate(deleteConfirmId); setDeleteConfirmId(null); }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const monthPadding = Array(monthStart.getDay()).fill(null);

  const headerLabel = view === "day" ? format(currentDate, "EEEE, MMMM d, yyyy")
    : view === "week" ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  const DeliveryCard = ({ event, compact = false }: { event: DeliveryCalendarEvent; compact?: boolean }) => {
    const status = getDeliveryStatus(event);
    const statusInfo = DELIVERY_STATUSES[status as keyof typeof DELIVERY_STATUSES] || DELIVERY_STATUSES.scheduled;
    const desc = getDeliveryDescription(event);
    const StatusIcon = statusInfo.icon;
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
          isDragging && "opacity-40",
          status === "delivered" && "opacity-70"
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: statusInfo.dotColor }}
      >
        <div className="flex items-center gap-1.5">
          <Badge className={cn("text-[10px]", statusInfo.color)}>
            <StatusIcon className="h-3 w-3 mr-0.5" />{statusInfo.label}
          </Badge>
        </div>
        <p className={cn("font-medium truncate mt-1", compact ? "text-xs" : "text-sm")}>{event.title}</p>
        {!compact && desc && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-7 gap-2">{Array(14).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
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
            <Truck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Delivery Schedule</h1>
              <p className="text-sm text-muted-foreground">Material delivery tracking</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" />Add Delivery
            </Button>
          )}
        </div>

        {/* View toggle + nav */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {(["day", "week", "month"] as CalendarView[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]", view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
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

        {/* Today's Deliveries Section */}
        <TodaysDeliveriesSection />

        {/* Status legend */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Object.entries(DELIVERY_STATUSES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.dotColor }} />
              <span className="text-muted-foreground">{v.label}</span>
            </div>
          ))}
        </div>

        {/* Day View */}
        {view === "day" && (
          <Card>
            <CardContent className="pt-4">
              {getEventsForDate(currentDate).length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No deliveries scheduled</p>
              ) : (
                <div className="space-y-2">{getEventsForDate(currentDate).map(e => <DeliveryCard key={e.id} event={e} />)}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Week View */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              const dayEvents = getEventsForDate(day);
              const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={e => { if (canEdit && draggedEvent) { e.preventDefault(); setDragOverDate(day); } }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, day)}
                  className={cn("min-h-[140px] border rounded-lg p-2 transition-all", isToday && "bg-primary/5 border-primary/30", isDragOver && "ring-2 ring-primary bg-primary/10")}
                >
                  <div className={cn("text-xs font-medium mb-1.5 text-center", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format(day, "EEE")}
                    <span className={cn("ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs", isToday && "bg-primary text-primary-foreground")}>{format(day, "d")}</span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => <DeliveryCard key={e.id} event={e} compact />)}
                    {dayEvents.length > 3 && <OverflowTrigger count={dayEvents.length - 3} onClick={() => setOverflowDate(day)} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Month View */}
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
                  return (
                    <div key={day.toISOString()} onClick={() => setSelectedDate(day)}
                      onDragOver={e => { if (canEdit && draggedEvent) { e.preventDefault(); setDragOverDate(day); } }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={e => handleDrop(e, day)}
                      className={cn("h-16 p-1 border rounded cursor-pointer transition-all hover:bg-accent/50", isToday && "bg-primary/10", isSelected && "ring-2 ring-primary", dragOverDate && isSameDay(day, dragOverDate) && "ring-2 ring-primary bg-primary/20")}
                    >
                      <div className={cn("text-xs font-medium", isToday && "text-primary")}>{format(day, "d")}</div>
                      <div className="flex gap-0.5 flex-wrap mt-0.5">
                        {dayEvents.slice(0, 4).map(e => {
                          const st = getDeliveryStatus(e);
                          return <div key={e.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: DELIVERY_STATUSES[st as keyof typeof DELIVERY_STATUSES]?.dotColor || "#64748b" }} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedDate && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h3>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deliveries</p>
                  ) : (
                    <div className="space-y-2">{getEventsForDate(selectedDate).map(e => <DeliveryCard key={e.id} event={e} />)}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mobile FAB */}
        {canEdit && (
          <button onClick={() => setIsAddOpen(true)} className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform">
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Day overflow modal */}
      <DayOverflowModal date={overflowDate} onClose={() => setOverflowDate(null)}>
        {overflowDate && getEventsForDate(overflowDate).map(e => <DeliveryCard key={e.id} event={e} />)}
      </DayOverflowModal>

      {/* Add Delivery Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Delivery</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Supplier / Material *</Label><Input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., ABC Supply - Shingles" /></div>
            <div><Label>Delivery Address / Job</Label><Textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Address or notes" /></div>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField label="Delivery Date *" value={newEvent.start_date} onChange={d => setNewEvent({ ...newEvent, start_date: d })} />
              <div><Label>Status</Label>
                <Select value={newEvent.status} onValueChange={v => setNewEvent({ ...newEvent, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DELIVERY_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.start_date}>Add Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Delivery Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Delivery</DialogTitle></DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div><Label>Supplier / Material</Label><Input value={editingEvent.title} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField label="Delivery Date" value={editingEvent.start_date} onChange={d => setEditingEvent({ ...editingEvent, start_date: d })} />
                <div><Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(DELIVERY_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
