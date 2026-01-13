import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, GripVertical, Users, PlusCircle, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProductionCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  ProductionCalendarEvent,
  EVENT_CATEGORIES,
  EventCategory,
} from "@/hooks/useProductionCalendar";
import { useCrews, useCreateCrew, Crew } from "@/hooks/useCrews";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

export default function BuildSchedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ProductionCalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [visibleCrews, setVisibleCrews] = useState<Set<string>>(new Set(["all"]));

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProductionCalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_category: "other" as EventCategory,
    crew_id: "",
  });

  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [newCrew, setNewCrew] = useState({ name: "", color: "#3b82f6" });

  const { isManager, isAdmin } = useAuth();
  const canEdit = isManager || isAdmin;

  const { data: crews = [] } = useCrews();
  const createCrew = useCreateCrew();

  const { data: events = [], isLoading } = useProductionCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const toggleCrewFilter = (crewId: string) => {
    setVisibleCrews((prev) => {
      const next = new Set(prev);
      if (crewId === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(crewId)) {
        next.delete(crewId);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(crewId);
      }
      return next;
    });
  };

  const isCrewVisible = (crewId: string | null) => {
    if (visibleCrews.has("all")) return true;
    if (crewId === null) return visibleCrews.has("unassigned");
    return visibleCrews.has(crewId);
  };

  const filteredEvents = events.filter((event) => isCrewVisible(event.crew_id));

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;
      return date >= eventStart && date <= eventEnd;
    });
  };

  const getCrewColor = (crewId: string | null) => {
    const crew = crews.find((c) => c.id === crewId);
    return crew?.color || "#64748b";
  };

  const getCrewName = (crewId: string | null) => {
    const crew = crews.find((c) => c.id === crewId);
    return crew?.name || "Unassigned";
  };

  const handleDragStart = (e: React.DragEvent, event: ProductionCalendarEvent) => {
    if (!canEdit) return;
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", event.id);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    if (!canEdit || !draggedEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!canEdit || !draggedEvent) return;

    const originalStartDate = parseISO(draggedEvent.start_date);
    const daysDiff = differenceInDays(targetDate, originalStartDate);

    if (daysDiff !== 0) {
      const newEndDate = draggedEvent.end_date
        ? format(addMonths(parseISO(draggedEvent.end_date), 0), "yyyy-MM-dd")
        : undefined;

      updateEvent.mutate({
        id: draggedEvent.id,
        start_date: format(targetDate, "yyyy-MM-dd"),
        end_date: draggedEvent.end_date
          ? format(
              new Date(parseISO(draggedEvent.end_date).getTime() + daysDiff * 24 * 60 * 60 * 1000),
              "yyyy-MM-dd"
            )
          : undefined,
      });
    }

    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start_date) return;
    createEvent.mutate(
      {
        title: newEvent.title,
        description: newEvent.description || undefined,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date || undefined,
        event_category: newEvent.event_category,
        crew_id: newEvent.crew_id || undefined,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setNewEvent({
            title: "",
            description: "",
            start_date: "",
            end_date: "",
            event_category: "other",
            crew_id: "",
          });
        },
      }
    );
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;
    updateEvent.mutate(
      {
        id: editingEvent.id,
        title: editingEvent.title,
        description: editingEvent.description || undefined,
        start_date: editingEvent.start_date,
        end_date: editingEvent.end_date || undefined,
        event_category: editingEvent.event_category,
        crew_id: editingEvent.crew_id || undefined,
      },
      {
        onSuccess: () => {
          setEditingEvent(null);
        },
      }
    );
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEvent.mutate(id);
    }
  };

  const handleAddCrew = () => {
    if (!newCrew.name) return;
    createCrew.mutate(newCrew, {
      onSuccess: () => {
        setIsAddCrewOpen(false);
        setNewCrew({ name: "", color: "#3b82f6" });
      },
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Build Schedule</h1>
            <p className="text-muted-foreground">Production build scheduling calendar</p>
          </div>
        </div>

        {/* Crew Management */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddCrewOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> Manage Crews
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Build Schedule</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => setIsAddOpen(true)} className="ml-2">
                  <Plus className="h-4 w-4 mr-1" /> Add Event
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {paddingDays.map((_, idx) => (
                <div key={`pad-${idx}`} className="h-20 bg-muted/30 rounded" />
              ))}
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const isDragOver = dragOverDate && isSameDay(day, dragOverDate);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    className={cn(
                      "h-20 p-1 border rounded cursor-pointer transition-all hover:bg-accent/50",
                      !isSameMonth(day, currentMonth) && "opacity-50",
                      isSelected && "ring-2 ring-primary",
                      isToday && "bg-primary/10",
                      isDragOver && "ring-2 ring-primary bg-primary/20 scale-105"
                    )}
                  >
                    <div className={cn("text-sm font-medium", isToday && "text-primary")}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event) => {
                        const crewColor = getCrewColor(event.crew_id);
                        const isDragging = draggedEvent?.id === event.id;
                        const categoryInfo = EVENT_CATEGORIES[event.event_category] || EVENT_CATEGORIES.other;

                        return (
                          <div
                            key={event.id}
                            draggable={canEdit}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "text-xs px-1 py-0.5 rounded truncate flex items-center gap-0.5 transition-opacity text-white",
                              canEdit && "cursor-grab active:cursor-grabbing",
                              isDragging && "opacity-50"
                            )}
                            style={{ backgroundColor: event.crew_id ? crewColor : "#64748b" }}
                            title={`${event.crew_id ? getCrewName(event.crew_id) : ""} - ${categoryInfo.label}: ${event.title}${canEdit ? " (drag to reschedule)" : ""}`}
                          >
                            {canEdit && <GripVertical className="h-3 w-3 flex-shrink-0 opacity-70" />}
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crew Filter Legend */}
            <div className="mt-4 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Crew</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleCrewFilter("all")}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border",
                    visibleCrews.has("all")
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  All Crews
                </button>
                {crews.map((crew) => (
                  <button
                    key={crew.id}
                    onClick={() => toggleCrewFilter(crew.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border",
                      visibleCrews.has(crew.id)
                        ? "text-white border-transparent"
                        : "bg-background text-muted-foreground border-border hover:bg-accent"
                    )}
                    style={visibleCrews.has(crew.id) ? { backgroundColor: crew.color } : undefined}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: crew.color }}
                    />
                    {crew.name}
                  </button>
                ))}
                <button
                  onClick={() => toggleCrewFilter("unassigned")}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border",
                    visibleCrews.has("unassigned")
                      ? "bg-slate-500 text-white border-transparent"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  <div className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
                  Unassigned
                </button>
              </div>
            </div>

            {/* Selected date panel */}
            {selectedDate && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => {
                      const crewColor = getCrewColor(event.crew_id);
                      const categoryInfo = EVENT_CATEGORIES[event.event_category] || EVENT_CATEGORIES.other;

                      return (
                        <div
                          key={event.id}
                          className="flex items-start justify-between p-2 rounded border"
                          style={{ borderLeftWidth: 4, borderLeftColor: crewColor }}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {event.crew_id && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                                  style={{ backgroundColor: crewColor }}
                                >
                                  {getCrewName(event.crew_id)}
                                </span>
                              )}
                              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", categoryInfo.bgColor, categoryInfo.color)}>
                                {categoryInfo.label}
                              </span>
                              <span className="font-medium">{event.title}</span>
                            </div>
                            {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                            {event.end_date && event.end_date !== event.start_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(event.start_date), "MMM d")} - {format(parseISO(event.end_date), "MMM d")}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingEvent(event)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Event Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Build Schedule Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Start Date"
                  value={newEvent.start_date}
                  onChange={(date) => setNewEvent({ ...newEvent, start_date: date })}
                />
                <DatePickerField
                  label="End Date"
                  value={newEvent.end_date}
                  onChange={(date) => setNewEvent({ ...newEvent, end_date: date })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newEvent.event_category}
                  onValueChange={(value: EventCategory) => setNewEvent({ ...newEvent, event_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crew">Crew</Label>
                <Select
                  value={newEvent.crew_id}
                  onValueChange={(value) => setNewEvent({ ...newEvent, crew_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to crew (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {crews.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id}>
                        {crew.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.start_date}>
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            {editingEvent && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingEvent.description || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DatePickerField
                    label="Start Date"
                    value={editingEvent.start_date}
                    onChange={(date) => setEditingEvent({ ...editingEvent, start_date: date })}
                  />
                  <DatePickerField
                    label="End Date"
                    value={editingEvent.end_date || ""}
                    onChange={(date) => setEditingEvent({ ...editingEvent, end_date: date })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editingEvent.event_category}
                    onValueChange={(value: EventCategory) => setEditingEvent({ ...editingEvent, event_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                        <SelectItem key={key} value={key}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-crew">Crew</Label>
                  <Select
                    value={editingEvent.crew_id || ""}
                    onValueChange={(value) => setEditingEvent({ ...editingEvent, crew_id: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to crew" />
                    </SelectTrigger>
                    <SelectContent>
                      {crews.map((crew) => (
                        <SelectItem key={crew.id} value={crew.id}>
                          {crew.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEvent}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Crew Dialog */}
        <Dialog open={isAddCrewOpen} onOpenChange={setIsAddCrewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Crew</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="crew-name">Crew Name</Label>
                <Input
                  id="crew-name"
                  value={newCrew.name}
                  onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
                  placeholder="e.g., Crew A"
                />
              </div>
              <div>
                <Label htmlFor="crew-color">Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="crew-color"
                    type="color"
                    value={newCrew.color}
                    onChange={(e) => setNewCrew({ ...newCrew, color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{newCrew.color}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCrewOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCrew} disabled={!newCrew.name}>
                Add Crew
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
