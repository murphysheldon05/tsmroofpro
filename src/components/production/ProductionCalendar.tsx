import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, GripVertical, Users, PlusCircle, Filter } from "lucide-react";
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
import {
  useDeliveryCalendarEvents,
  useCreateDeliveryEvent,
  useUpdateDeliveryEvent,
  useDeleteDeliveryEvent,
  DeliveryCalendarEvent,
} from "@/hooks/useDeliveryCalendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Separate calendar component for reuse
function CalendarGrid({
  title,
  events,
  crews,
  currentMonth,
  setCurrentMonth,
  canEdit,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onDragEvent,
  isDelivery = false,
}: {
  title: string;
  events: (ProductionCalendarEvent | DeliveryCalendarEvent)[];
  crews: Crew[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  canEdit: boolean;
  onAddEvent: (date?: Date) => void;
  onEditEvent: (event: ProductionCalendarEvent | DeliveryCalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onDragEvent: (event: ProductionCalendarEvent | DeliveryCalendarEvent, targetDate: Date) => void;
  isDelivery?: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ProductionCalendarEvent | DeliveryCalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [visibleCrews, setVisibleCrews] = useState<Set<string>>(new Set(["all"]));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const toggleCrewFilter = (crewId: string) => {
    setVisibleCrews((prev) => {
      const next = new Set(prev);
      if (crewId === "all") {
        // If clicking "all", reset to show all
        return new Set(["all"]);
      }
      // Remove "all" when selecting specific crews
      next.delete("all");
      if (next.has(crewId)) {
        next.delete(crewId);
        // If none selected, go back to "all"
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

  const handleDragStart = (e: React.DragEvent, event: ProductionCalendarEvent | DeliveryCalendarEvent) => {
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
      onDragEvent(draggedEvent, targetDate);
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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => onAddEvent()} className="ml-2">
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
                    const categoryInfo = !isDelivery && "event_category" in event
                      ? EVENT_CATEGORIES[(event as ProductionCalendarEvent).event_category] || EVENT_CATEGORIES.other
                      : null;

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
                        style={{ backgroundColor: event.crew_id ? crewColor : (categoryInfo?.bgColor ? undefined : "#64748b") }}
                        title={`${event.crew_id ? getCrewName(event.crew_id) : ""}${!isDelivery && categoryInfo ? ` - ${categoryInfo.label}` : ""}: ${event.title}${canEdit ? " (drag to reschedule)" : ""}`}
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
                  const categoryInfo = !isDelivery && "event_category" in event
                    ? EVENT_CATEGORIES[(event as ProductionCalendarEvent).event_category] || EVENT_CATEGORIES.other
                    : null;

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
                          {categoryInfo && (
                            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", categoryInfo.bgColor, categoryInfo.color)}>
                              {categoryInfo.label}
                            </span>
                          )}
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
                          <Button variant="ghost" size="icon" onClick={() => onEditEvent(event)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id)}>
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
  );
}

export function ProductionCalendar() {
  const [productionMonth, setProductionMonth] = useState(new Date());
  const [deliveryMonth, setDeliveryMonth] = useState(new Date());

  // Production event dialogs
  const [isAddProductionOpen, setIsAddProductionOpen] = useState(false);
  const [editingProductionEvent, setEditingProductionEvent] = useState<ProductionCalendarEvent | null>(null);
  const [newProductionEvent, setNewProductionEvent] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_category: "other" as EventCategory,
    crew_id: "",
  });

  // Delivery event dialogs
  const [isAddDeliveryOpen, setIsAddDeliveryOpen] = useState(false);
  const [editingDeliveryEvent, setEditingDeliveryEvent] = useState<DeliveryCalendarEvent | null>(null);
  const [newDeliveryEvent, setNewDeliveryEvent] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    crew_id: "",
  });

  // Crew management
  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [newCrew, setNewCrew] = useState({ name: "", color: "#3b82f6" });

  const { isManager, isAdmin } = useAuth();
  const canEdit = isManager || isAdmin;

  // Hooks
  const { data: crews = [] } = useCrews();
  const createCrew = useCreateCrew();

  const { data: productionEvents = [], isLoading: productionLoading } = useProductionCalendarEvents();
  const createProductionEvent = useCreateCalendarEvent();
  const updateProductionEvent = useUpdateCalendarEvent();
  const deleteProductionEvent = useDeleteCalendarEvent();

  const { data: deliveryEvents = [], isLoading: deliveryLoading } = useDeliveryCalendarEvents();
  const createDeliveryEvent = useCreateDeliveryEvent();
  const updateDeliveryEvent = useUpdateDeliveryEvent();
  const deleteDeliveryEvent = useDeleteDeliveryEvent();

  // Production event handlers
  const handleAddProductionEvent = () => {
    if (!newProductionEvent.title || !newProductionEvent.start_date) return;
    createProductionEvent.mutate(
      {
        title: newProductionEvent.title,
        description: newProductionEvent.description || undefined,
        start_date: newProductionEvent.start_date,
        end_date: newProductionEvent.end_date || undefined,
        event_category: newProductionEvent.event_category,
        crew_id: newProductionEvent.crew_id || undefined,
      },
      {
        onSuccess: () => {
          setIsAddProductionOpen(false);
          setNewProductionEvent({ title: "", description: "", start_date: "", end_date: "", event_category: "other", crew_id: "" });
        },
      }
    );
  };

  const handleUpdateProductionEvent = () => {
    if (!editingProductionEvent || !editingProductionEvent.title || !editingProductionEvent.start_date) return;
    updateProductionEvent.mutate(
      {
        id: editingProductionEvent.id,
        title: editingProductionEvent.title,
        description: editingProductionEvent.description || undefined,
        start_date: editingProductionEvent.start_date,
        end_date: editingProductionEvent.end_date,
        event_category: editingProductionEvent.event_category,
        crew_id: editingProductionEvent.crew_id,
      },
      {
        onSuccess: () => setEditingProductionEvent(null),
      }
    );
  };

  const handleDeleteProductionEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteProductionEvent.mutate(id);
      setEditingProductionEvent(null);
    }
  };

  const handleDragProductionEvent = (event: ProductionCalendarEvent | DeliveryCalendarEvent, targetDate: Date) => {
    const prodEvent = event as ProductionCalendarEvent;
    const originalStartDate = parseISO(prodEvent.start_date);
    const daysDiff = differenceInDays(targetDate, originalStartDate);

    const newStartDate = format(targetDate, "yyyy-MM-dd");
    let newEndDate: string | null = null;

    if (prodEvent.end_date) {
      const originalEndDate = parseISO(prodEvent.end_date);
      const newEnd = new Date(originalEndDate);
      newEnd.setDate(newEnd.getDate() + daysDiff);
      newEndDate = format(newEnd, "yyyy-MM-dd");
    }

    updateProductionEvent.mutate({
      id: prodEvent.id,
      start_date: newStartDate,
      end_date: newEndDate,
    });
  };

  // Delivery event handlers
  const handleAddDeliveryEvent = () => {
    if (!newDeliveryEvent.title || !newDeliveryEvent.start_date) return;
    createDeliveryEvent.mutate(
      {
        title: newDeliveryEvent.title,
        description: newDeliveryEvent.description || undefined,
        start_date: newDeliveryEvent.start_date,
        end_date: newDeliveryEvent.end_date || undefined,
        crew_id: newDeliveryEvent.crew_id || undefined,
      },
      {
        onSuccess: () => {
          setIsAddDeliveryOpen(false);
          setNewDeliveryEvent({ title: "", description: "", start_date: "", end_date: "", crew_id: "" });
        },
      }
    );
  };

  const handleUpdateDeliveryEvent = () => {
    if (!editingDeliveryEvent || !editingDeliveryEvent.title || !editingDeliveryEvent.start_date) return;
    updateDeliveryEvent.mutate(
      {
        id: editingDeliveryEvent.id,
        title: editingDeliveryEvent.title,
        description: editingDeliveryEvent.description || undefined,
        start_date: editingDeliveryEvent.start_date,
        end_date: editingDeliveryEvent.end_date,
        crew_id: editingDeliveryEvent.crew_id,
      },
      {
        onSuccess: () => setEditingDeliveryEvent(null),
      }
    );
  };

  const handleDeleteDeliveryEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this delivery?")) {
      deleteDeliveryEvent.mutate(id);
      setEditingDeliveryEvent(null);
    }
  };

  const handleDragDeliveryEvent = (event: ProductionCalendarEvent | DeliveryCalendarEvent, targetDate: Date) => {
    const delEvent = event as DeliveryCalendarEvent;
    const originalStartDate = parseISO(delEvent.start_date);
    const daysDiff = differenceInDays(targetDate, originalStartDate);

    const newStartDate = format(targetDate, "yyyy-MM-dd");
    let newEndDate: string | null = null;

    if (delEvent.end_date) {
      const originalEndDate = parseISO(delEvent.end_date);
      const newEnd = new Date(originalEndDate);
      newEnd.setDate(newEnd.getDate() + daysDiff);
      newEndDate = format(newEnd, "yyyy-MM-dd");
    }

    updateDeliveryEvent.mutate({
      id: delEvent.id,
      start_date: newStartDate,
      end_date: newEndDate,
    });
  };

  // Crew handlers
  const handleAddCrew = () => {
    if (!newCrew.name) return;
    createCrew.mutate(newCrew, {
      onSuccess: () => {
        setIsAddCrewOpen(false);
        setNewCrew({ name: "", color: "#3b82f6" });
      },
    });
  };

  const crewColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
    "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ];

  if (productionLoading || deliveryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Crew Management Section */}
      {canEdit && (
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Crews:</span>
          <div className="flex flex-wrap gap-2">
            {crews.map((crew) => (
              <div
                key={crew.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-white text-sm"
                style={{ backgroundColor: crew.color }}
              >
                {crew.name}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAddCrewOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1" /> Add Crew
          </Button>
        </div>
      )}

      {/* Production Build Schedule */}
      <CalendarGrid
        title="Production Build Schedule"
        events={productionEvents}
        crews={crews}
        currentMonth={productionMonth}
        setCurrentMonth={setProductionMonth}
        canEdit={canEdit}
        onAddEvent={() => setIsAddProductionOpen(true)}
        onEditEvent={(e) => setEditingProductionEvent(e as ProductionCalendarEvent)}
        onDeleteEvent={handleDeleteProductionEvent}
        onDragEvent={handleDragProductionEvent}
        isDelivery={false}
      />

      {/* Delivery Schedule */}
      <CalendarGrid
        title="Delivery Schedule"
        events={deliveryEvents}
        crews={crews}
        currentMonth={deliveryMonth}
        setCurrentMonth={setDeliveryMonth}
        canEdit={canEdit}
        onAddEvent={() => setIsAddDeliveryOpen(true)}
        onEditEvent={(e) => setEditingDeliveryEvent(e as DeliveryCalendarEvent)}
        onDeleteEvent={handleDeleteDeliveryEvent}
        onDragEvent={handleDragDeliveryEvent}
        isDelivery={true}
      />

      {/* Add Crew Dialog */}
      <Dialog open={isAddCrewOpen} onOpenChange={setIsAddCrewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Crew</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crew-name">Crew Name *</Label>
              <Input
                id="crew-name"
                value={newCrew.name}
                onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
                placeholder="e.g., Crew 7"
              />
            </div>
            <div>
              <Label>Crew Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {crewColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCrew({ ...newCrew, color })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newCrew.color === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCrewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCrew} disabled={!newCrew.name || createCrew.isPending}>
              Add Crew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Production Event Dialog */}
      <Dialog open={isAddProductionOpen} onOpenChange={setIsAddProductionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Production Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prod-title">Title *</Label>
              <Input
                id="prod-title"
                value={newProductionEvent.title}
                onChange={(e) => setNewProductionEvent({ ...newProductionEvent, title: e.target.value })}
                placeholder="e.g., Smith Residence Roof Install"
              />
            </div>
            <div>
              <Label htmlFor="prod-crew">Assign Crew</Label>
              <Select
                value={newProductionEvent.crew_id || "none"}
                onValueChange={(value) => setNewProductionEvent({ ...newProductionEvent, crew_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a crew" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {crews.map((crew) => (
                    <SelectItem key={crew.id} value={crew.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: crew.color }} />
                        {crew.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prod-category">Category</Label>
              <Select
                value={newProductionEvent.event_category}
                onValueChange={(value: EventCategory) => setNewProductionEvent({ ...newProductionEvent, event_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_CATEGORIES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prod-description">Description</Label>
              <Textarea
                id="prod-description"
                value={newProductionEvent.description}
                onChange={(e) => setNewProductionEvent({ ...newProductionEvent, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField
                label="Start Date"
                required
                value={newProductionEvent.start_date}
                onChange={(v) => setNewProductionEvent({ ...newProductionEvent, start_date: v })}
                id="prod-start_date"
              />
              <DatePickerField
                label="End Date"
                value={newProductionEvent.end_date}
                onChange={(v) => setNewProductionEvent({ ...newProductionEvent, end_date: v })}
                id="prod-end_date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProductionEvent} disabled={!newProductionEvent.title || !newProductionEvent.start_date || createProductionEvent.isPending}>
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Production Event Dialog */}
      <Dialog open={!!editingProductionEvent} onOpenChange={(open) => !open && setEditingProductionEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Production Event</DialogTitle>
          </DialogHeader>
          {editingProductionEvent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-prod-title">Title *</Label>
                <Input
                  id="edit-prod-title"
                  value={editingProductionEvent.title}
                  onChange={(e) => setEditingProductionEvent({ ...editingProductionEvent, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-prod-crew">Assign Crew</Label>
                <Select
                  value={editingProductionEvent.crew_id || "none"}
                  onValueChange={(value) => setEditingProductionEvent({ ...editingProductionEvent, crew_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crew" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {crews.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: crew.color }} />
                          {crew.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-prod-category">Category</Label>
                <Select
                  value={editingProductionEvent.event_category}
                  onValueChange={(value: EventCategory) => setEditingProductionEvent({ ...editingProductionEvent, event_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-prod-description">Description</Label>
                <Textarea
                  id="edit-prod-description"
                  value={editingProductionEvent.description || ""}
                  onChange={(e) => setEditingProductionEvent({ ...editingProductionEvent, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Start Date"
                  required
                  value={editingProductionEvent.start_date}
                  onChange={(v) => setEditingProductionEvent({ ...editingProductionEvent, start_date: v })}
                  id="edit-prod-start_date"
                />
                <DatePickerField
                  label="End Date"
                  value={editingProductionEvent.end_date || ""}
                  onChange={(v) => setEditingProductionEvent({ ...editingProductionEvent, end_date: v || null })}
                  id="edit-prod-end_date"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProductionEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProductionEvent} disabled={updateProductionEvent.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Delivery Event Dialog */}
      <Dialog open={isAddDeliveryOpen} onOpenChange={setIsAddDeliveryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delivery Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="del-title">Title *</Label>
              <Input
                id="del-title"
                value={newDeliveryEvent.title}
                onChange={(e) => setNewDeliveryEvent({ ...newDeliveryEvent, title: e.target.value })}
                placeholder="e.g., Material Delivery - 123 Main St"
              />
            </div>
            <div>
              <Label htmlFor="del-crew">Assign Crew</Label>
              <Select
                value={newDeliveryEvent.crew_id || "none"}
                onValueChange={(value) => setNewDeliveryEvent({ ...newDeliveryEvent, crew_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a crew" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {crews.map((crew) => (
                    <SelectItem key={crew.id} value={crew.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: crew.color }} />
                        {crew.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="del-description">Description</Label>
              <Textarea
                id="del-description"
                value={newDeliveryEvent.description}
                onChange={(e) => setNewDeliveryEvent({ ...newDeliveryEvent, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DatePickerField
                label="Delivery Date"
                required
                value={newDeliveryEvent.start_date}
                onChange={(v) => setNewDeliveryEvent({ ...newDeliveryEvent, start_date: v })}
                id="del-start_date"
              />
              <DatePickerField
                label="End Date"
                value={newDeliveryEvent.end_date}
                onChange={(v) => setNewDeliveryEvent({ ...newDeliveryEvent, end_date: v })}
                id="del-end_date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeliveryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDeliveryEvent} disabled={!newDeliveryEvent.title || !newDeliveryEvent.start_date || createDeliveryEvent.isPending}>
              Add Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Delivery Event Dialog */}
      <Dialog open={!!editingDeliveryEvent} onOpenChange={(open) => !open && setEditingDeliveryEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Event</DialogTitle>
          </DialogHeader>
          {editingDeliveryEvent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-del-title">Title *</Label>
                <Input
                  id="edit-del-title"
                  value={editingDeliveryEvent.title}
                  onChange={(e) => setEditingDeliveryEvent({ ...editingDeliveryEvent, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-del-crew">Assign Crew</Label>
                <Select
                  value={editingDeliveryEvent.crew_id || "none"}
                  onValueChange={(value) => setEditingDeliveryEvent({ ...editingDeliveryEvent, crew_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crew" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {crews.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: crew.color }} />
                          {crew.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-del-description">Description</Label>
                <Textarea
                  id="edit-del-description"
                  value={editingDeliveryEvent.description || ""}
                  onChange={(e) => setEditingDeliveryEvent({ ...editingDeliveryEvent, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Delivery Date"
                  required
                  value={editingDeliveryEvent.start_date}
                  onChange={(v) => setEditingDeliveryEvent({ ...editingDeliveryEvent, start_date: v })}
                  id="edit-del-start_date"
                />
                <DatePickerField
                  label="End Date"
                  value={editingDeliveryEvent.end_date || ""}
                  onChange={(v) => setEditingDeliveryEvent({ ...editingDeliveryEvent, end_date: v || null })}
                  id="edit-del-end_date"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeliveryEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDeliveryEvent} disabled={updateDeliveryEvent.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
