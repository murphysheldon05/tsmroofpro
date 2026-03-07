import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WarrantyForm } from "@/components/warranty/WarrantyForm";
import { WarrantyDetail } from "@/components/warranty/WarrantyDetail";
import { WarrantyAgingReport } from "@/components/warranty/WarrantyAgingReport";
import {
  WarrantyRequest, WarrantyStatus, useWarranties, useUpdateWarranty,
  WARRANTY_STATUSES, PRIORITY_LEVELS,
} from "@/hooks/useWarranties";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Shield, BarChart3, Search, Archive } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { warrantySteps } from "@/components/tutorial/tutorialSteps";
import {
  DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Kanban columns for the warranty pipeline
const KANBAN_COLUMNS: { key: string; label: string; statuses: WarrantyStatus[]; description: string }[] = [
  { key: "pending_review", label: "Pending Review", statuses: ["new"], description: "Awaiting production manager review" },
  { key: "approved", label: "Approved", statuses: ["assigned", "in_review"], description: "Reviewed and in the warranty queue" },
  { key: "scheduled", label: "Scheduled", statuses: ["scheduled"], description: "Scheduled for warranty work" },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress", "waiting_on_materials", "waiting_on_manufacturer"], description: "Warranty work underway" },
  { key: "completed", label: "Completed", statuses: ["completed", "denied"], description: "Work completed, ready to archive" },
];

const STATUS_FOR_COLUMN: Record<string, WarrantyStatus> = {
  pending_review: "new",
  approved: "assigned",
  scheduled: "scheduled",
  in_progress: "in_progress",
  completed: "completed",
};

function getAgeDays(w: WarrantyRequest): number {
  return differenceInDays(new Date(), parseISO(w.date_submitted));
}

function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case "emergency": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    default: return "#3b82f6";
  }
}

// Droppable column wrapper
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-2 min-h-[200px] bg-muted/20 rounded-xl p-2 transition-all duration-200",
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

// Draggable warranty card
function DraggableWarrantyCard({
  warranty,
  onView,
  isDragOverlay = false,
  isDraggable = true,
  onArchive,
}: {
  warranty: WarrantyRequest;
  onView: (w: WarrantyRequest) => void;
  isDragOverlay?: boolean;
  isDraggable?: boolean;
  onArchive?: (w: WarrantyRequest) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: warranty.id,
    data: { warranty },
    disabled: !isDraggable,
  });

  const age = getAgeDays(warranty);
  const isCompleted = warranty.status === "completed" || warranty.status === "denied" || warranty.status === "closed";
  const statusConfig = WARRANTY_STATUSES.find(s => s.value === warranty.status);
  const priorityConfig = PRIORITY_LEVELS.find(p => p.value === warranty.priority_level);

  const cardStyle = {
    ...(isDragOverlay ? {} : {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    }),
    borderLeftWidth: 4,
    borderLeftColor: getPriorityBorderColor(warranty.priority_level),
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      onClick={() => onView(warranty)}
      className={cn(
        "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-card",
        !isCompleted && age > 30 && "border-destructive/60",
        !isCompleted && age > 14 && age <= 30 && "border-amber-400/60",
        isDragOverlay && "shadow-xl ring-2 ring-primary rotate-2 scale-105",
        isDragging && "opacity-30",
        isDraggable && !isDragOverlay && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-medium text-sm truncate">{warranty.customer_name}</p>
        {!isCompleted && age > 0 && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
            age > 30 ? "bg-destructive/10 text-destructive" :
            age > 14 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            "bg-muted text-muted-foreground"
          )}>
            {age}d
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground truncate mb-2">{warranty.job_address}</p>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{warranty.issue_description}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={cn("text-[10px]", statusConfig?.color)}>{statusConfig?.label}</Badge>
        <Badge className={cn("text-[10px]", priorityConfig?.color)}>{priorityConfig?.label}</Badge>
      </div>
      {warranty.assigned_production_member && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Assigned</p>
      )}
      <p className="text-[10px] text-muted-foreground">{format(parseISO(warranty.date_submitted), "MMM d, yyyy")}</p>
      {onArchive && (warranty.status === "completed" || warranty.status === "denied") && (
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs h-7 text-muted-foreground hover:text-primary"
            onClick={() => onArchive(warranty)}
          >
            <Archive className="h-3 w-3 mr-1" />
            Close & Archive
          </Button>
        </div>
      )}
    </div>
  );
}

// Simple card for mobile (no drag)
function WarrantyCardSimple({
  warranty,
  onView,
}: {
  warranty: WarrantyRequest;
  onView: (w: WarrantyRequest) => void;
}) {
  const age = getAgeDays(warranty);
  const isCompleted = warranty.status === "completed" || warranty.status === "denied" || warranty.status === "closed";
  const statusConfig = WARRANTY_STATUSES.find(s => s.value === warranty.status);
  const priorityConfig = PRIORITY_LEVELS.find(p => p.value === warranty.priority_level);

  return (
    <div
      onClick={() => onView(warranty)}
      className={cn(
        "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-card",
        !isCompleted && age > 30 && "border-destructive/60",
        !isCompleted && age > 14 && age <= 30 && "border-amber-400/60",
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: getPriorityBorderColor(warranty.priority_level) }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-medium text-sm truncate">{warranty.customer_name}</p>
        {!isCompleted && age > 0 && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
            age > 30 ? "bg-destructive/10 text-destructive" :
            age > 14 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            "bg-muted text-muted-foreground"
          )}>
            {age}d
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground truncate mb-2">{warranty.job_address}</p>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{warranty.issue_description}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={cn("text-[10px]", statusConfig?.color)}>{statusConfig?.label}</Badge>
        <Badge className={cn("text-[10px]", priorityConfig?.color)}>{priorityConfig?.label}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{format(parseISO(warranty.date_submitted), "MMM d, yyyy")}</p>
    </div>
  );
}

export default function Warranties() {
  const { isAdmin, isManager, isProductionManager, role } = useAuth();
  const canManageWarranty = isAdmin || isManager || isProductionManager;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);
  const [mobileTab, setMobileTab] = useState("pending_review");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: warranties = [], isLoading } = useWarranties();
  const updateWarranty = useUpdateWarranty();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleView = (w: WarrantyRequest) => { setSelectedWarranty(w); setIsDetailOpen(true); };
  const handleEdit = (w: WarrantyRequest) => { setSelectedWarranty(w); setIsFormOpen(true); };
  const handleCreate = () => { setSelectedWarranty(null); setIsFormOpen(true); };

  const handleArchive = (w: WarrantyRequest) => {
    if (!canManageWarranty) return;
    updateWarranty.mutate({
      id: w.id,
      status: "closed" as WarrantyStatus,
      previousStatus: w.status,
      userRole: role || undefined,
    });
  };

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => {
      const items = warranties.filter(w => col.statuses.includes(w.status));
      const overdue = items.filter(w => w.status !== "completed" && w.status !== "denied" && w.status !== "closed" && getAgeDays(w) > 30);
      return { ...col, items, overdueCount: overdue.length };
    });
  }, [warranties]);

  const archivedWarranties = useMemo(() => {
    const closed = warranties.filter(w => w.status === "closed");
    if (!archiveSearch) return closed;
    const s = archiveSearch.toLowerCase();
    return closed.filter(w =>
      w.customer_name.toLowerCase().includes(s) ||
      w.job_address.toLowerCase().includes(s) ||
      w.issue_description.toLowerCase().includes(s)
    );
  }, [warranties, archiveSearch]);

  const activeWarranty = activeId ? warranties.find(w => w.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    if (!canManageWarranty) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!canManageWarranty) return;

    const { active, over } = event;
    if (!over) return;

    const warranty = warranties.find(w => w.id === active.id);
    if (!warranty) return;

    const targetColumnKey = over.id as string;
    const targetStatus = STATUS_FOR_COLUMN[targetColumnKey];
    if (!targetStatus) return;

    const targetColumn = KANBAN_COLUMNS.find(c => c.key === targetColumnKey);
    if (targetColumn?.statuses.includes(warranty.status)) return;

    updateWarranty.mutate({
      id: warranty.id,
      status: targetStatus,
      previousStatus: warranty.status,
      userRole: role || undefined,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-5 gap-4">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}
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
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Warranty Tracker</h1>
              <p className="text-sm text-muted-foreground">Track and manage roofing warranty requests</p>
            </div>
          </div>
          <Button onClick={handleCreate} className="bg-primary text-primary-foreground" data-tutorial="submit-warranty">
            <Plus className="h-4 w-4 mr-1.5" />Submit Warranty
          </Button>
        </div>

        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Board</TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-1.5"><Archive className="h-3.5 w-3.5" />Archive ({archivedWarranties.length})</TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-1.5" data-tutorial="aging-tab"><BarChart3 className="h-3.5 w-3.5" />Aging Report</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-4" data-tutorial="kanban-board">
            {!canManageWarranty && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Only production managers and admins can move warranties through the pipeline.</p>
              </div>
            )}

            {/* Desktop Kanban with DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="hidden md:grid grid-cols-5 gap-4">
                {columns.map(col => (
                  <div key={col.key} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{col.label}</h3>
                        <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
                      </div>
                      {col.overdueCount > 0 && (
                        <span className="text-xs text-destructive font-medium">{col.overdueCount} overdue</span>
                      )}
                    </div>
                    <DroppableColumn id={col.key}>
                      {col.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">No warranties</p>
                      ) : (
                        col.items.map(w => (
                          <DraggableWarrantyCard
                            key={w.id}
                            warranty={w}
                            onView={handleView}
                            isDraggable={canManageWarranty}
                            onArchive={canManageWarranty ? handleArchive : undefined}
                          />
                        ))
                      )}
                    </DroppableColumn>
                  </div>
                ))}
              </div>

              {/* Drag overlay */}
              <DragOverlay>
                {activeWarranty ? (
                  <DraggableWarrantyCard warranty={activeWarranty} onView={() => {}} isDragOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Mobile Tabs (no drag) */}
            <div className="md:hidden">
              <Tabs value={mobileTab} onValueChange={setMobileTab}>
                <TabsList className="w-full grid grid-cols-5">
                  {columns.map(col => (
                    <TabsTrigger key={col.key} value={col.key} className="text-[10px] px-1 relative">
                      {col.label}
                      <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 min-w-4 px-1">{col.items.length}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {columns.map(col => (
                  <TabsContent key={col.key} value={col.key} className="mt-3">
                    <div className="space-y-2">
                      {col.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No warranties</p>
                      ) : (
                        col.items.map(w => <WarrantyCardSimple key={w.id} warranty={w} onView={handleView} />)
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="archive" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Completed Warranty Archive
                </CardTitle>
                <Badge variant="secondary">{archivedWarranties.length} total</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search archived warranties..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                {archivedWarranties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No archived warranties yet. Completed warranties can be closed and archived from the board.</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {archivedWarranties.map(w => (
                      <div key={w.id} onClick={() => handleView(w)} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{w.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.job_address}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{w.issue_description}</p>
                        </div>
                        <div className="text-right ml-3 flex flex-col items-end gap-1">
                          <Badge className={cn("text-[10px]", WARRANTY_STATUSES.find(s => s.value === w.status)?.color)}>
                            {WARRANTY_STATUSES.find(s => s.value === w.status)?.label}
                          </Badge>
                          {w.closed_date && <p className="text-[10px] text-muted-foreground">Closed {format(parseISO(w.closed_date), "MMM d, yyyy")}</p>}
                          {w.date_completed && !w.closed_date && <p className="text-[10px] text-muted-foreground">Completed {format(parseISO(w.date_completed), "MMM d, yyyy")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aging" className="mt-4">
            <WarrantyAgingReport />
          </TabsContent>
        </Tabs>

        {/* Mobile FAB */}
        <button onClick={handleCreate} className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <WarrantyForm
        open={isFormOpen}
        onOpenChange={o => { setIsFormOpen(o); if (!o) setSelectedWarranty(null); }}
        warranty={selectedWarranty}
      />

      <WarrantyDetail
        open={isDetailOpen}
        onOpenChange={o => { setIsDetailOpen(o); if (!o) setSelectedWarranty(null); }}
        warranty={selectedWarranty}
        onEdit={() => { setIsDetailOpen(false); setIsFormOpen(true); }}
      />
      <GuidedTour pageName="warranties" pageTitle="Warranty Tracker" steps={warrantySteps} />
    </AppLayout>
  );
}
