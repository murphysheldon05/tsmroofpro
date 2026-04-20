import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import {
  Archive,
  BarChart3,
  CheckCircle2,
  GripVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { differenceInDays, format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { warrantySteps } from "@/components/tutorial/tutorialSteps";
import {
  DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TABS = ["submitted", "board", "archive", "aging"] as const;
type WarrantyTab = typeof TABS[number];

const KANBAN_COLUMNS: { key: string; label: string; statuses: WarrantyStatus[]; description: string }[] = [
  { key: "approved", label: "Approved", statuses: ["assigned", "in_review"], description: "Reviewed and in the tracker" },
  { key: "scheduled", label: "Scheduled", statuses: ["scheduled"], description: "Scheduled for warranty work" },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress", "waiting_on_materials", "waiting_on_manufacturer"], description: "Warranty work underway" },
  { key: "completed", label: "Completed", statuses: ["completed", "denied"], description: "Work completed, ready to archive" },
];

const STATUS_FOR_COLUMN: Record<string, WarrantyStatus> = {
  approved: "assigned",
  scheduled: "scheduled",
  in_progress: "in_progress",
  completed: "completed",
};

function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function formatOptionalDate(value?: string | null, fallback = "No date") {
  const parsed = parseOptionalDate(value);
  return parsed ? format(parsed, "MMM d, yyyy") : fallback;
}

function getAgeDays(w: WarrantyRequest): number {
  const submittedAt = parseOptionalDate(w.date_submitted);
  return submittedAt ? Math.max(0, differenceInDays(new Date(), submittedAt)) : 0;
}

function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case "emergency": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    default: return "#3b82f6";
  }
}

function getWarrantyTab(warranty: WarrantyRequest): WarrantyTab {
  if (warranty.status === "new") return "submitted";
  if (warranty.status === "closed") return "archive";
  return "board";
}

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
      opacity: isDragging ? 0.55 : 1,
    }),
    borderLeftWidth: 4,
    borderLeftColor: getPriorityBorderColor(warranty.priority_level),
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      onClick={() => onView(warranty)}
      className={cn(
        "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-card",
        !isCompleted && age > 30 && "border-destructive/60",
        !isCompleted && age > 14 && age <= 30 && "border-amber-400/60",
        isDragOverlay && "shadow-xl ring-2 ring-primary rotate-2 scale-105",
        isDragging && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-medium text-sm truncate">{warranty.customer_name}</p>
        <div className="flex items-center gap-1">
          {!isCompleted && age > 0 && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
              age > 30 ? "bg-destructive/10 text-destructive" :
              age > 14 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              "bg-muted text-muted-foreground"
            )}>
              {age}d
            </span>
          )}
          {isDraggable && !isDragOverlay && (
            <button
              type="button"
              className="h-7 w-7 shrink-0 rounded-md border bg-background/70 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag warranty card"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
      <p className="text-[10px] text-muted-foreground">{formatOptionalDate(warranty.date_submitted)}</p>
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
      <p className="text-[10px] text-muted-foreground mt-1">{formatOptionalDate(warranty.date_submitted)}</p>
    </div>
  );
}

export default function Warranties() {
  const { isAdmin, isManager, isProductionManager, role, user, isActive } = useAuth();
  const canManageWarranty = isAdmin || isManager || isProductionManager;
  const canSubmitWarranty = Boolean(user && isActive);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<WarrantyTab>(
    TABS.includes((initialTab as WarrantyTab) ?? "submitted") ? (initialTab as WarrantyTab) : "submitted"
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);
  const [mobileTab, setMobileTab] = useState("approved");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    data: warranties = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useWarranties();
  const updateWarranty = useUpdateWarranty();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const setRouteParams = (updates: { id?: string | null; tab?: WarrantyTab }) => {
    const nextParams = new URLSearchParams(searchParams);
    if (updates.id === null) nextParams.delete("id");
    else if (updates.id) nextParams.set("id", updates.id);

    if (updates.tab) nextParams.set("tab", updates.tab);
    setSearchParams(nextParams);
  };

  const handleTabChange = (value: string) => {
    const nextTab = (TABS.includes(value as WarrantyTab) ? value : "submitted") as WarrantyTab;
    setActiveTab(nextTab);
    setRouteParams({ tab: nextTab });
  };

  const handleView = (w: WarrantyRequest) => {
    setSelectedWarranty(w);
    setIsDetailOpen(true);
    setRouteParams({ id: w.id, tab: getWarrantyTab(w) });
  };

  const handleCreate = () => {
    setSelectedWarranty(null);
    setIsFormOpen(true);
  };

  const handleArchive = (w: WarrantyRequest) => {
    if (!canManageWarranty) return;
    updateWarranty.mutate({
      id: w.id,
      status: "closed" as WarrantyStatus,
      previousStatus: w.status,
      userRole: role || undefined,
    });
  };

  const handleApproveSubmission = (w: WarrantyRequest) => {
    if (!canManageWarranty) return;
    updateWarranty.mutate({
      id: w.id,
      status: w.assigned_production_member ? "assigned" : "in_review",
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

  const submittedWarranties = useMemo(
    () => warranties.filter((w) => w.status === "new"),
    [warranties]
  );

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
  const selectedWarrantyId = searchParams.get("id");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.includes(tabParam as WarrantyTab) && tabParam !== activeTab) {
      setActiveTab(tabParam as WarrantyTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (!selectedWarrantyId) return;
    const match = warranties.find((w) => w.id === selectedWarrantyId);
    if (!match) return;

    setSelectedWarranty(match);
    setIsDetailOpen(true);

    const targetTab = getWarrantyTab(match);
    if (activeTab !== targetTab) {
      setActiveTab(targetTab);
    }
  }, [activeTab, selectedWarrantyId, warranties]);

  useEffect(() => {
    if (!selectedWarranty?.id) return;
    const refreshedWarranty = warranties.find((w) => w.id === selectedWarranty.id);
    if (refreshedWarranty) {
      setSelectedWarranty(refreshedWarranty);
    }
  }, [selectedWarranty?.id, warranties]);

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
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Warranty Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The tracker could not be loaded right now.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold">Warranty Tracker</h1>
              <p className="text-sm text-muted-foreground">Anyone can submit a request. Production reviews submitted items before they move into the active tracker.</p>
            </div>
          </div>
          {canSubmitWarranty && (
            <Button onClick={handleCreate} className="bg-primary text-primary-foreground" data-tutorial="submit-warranty">
              <Plus className="h-4 w-4 mr-1.5" />Submit Warranty
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="submitted" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Submitted ({submittedWarranties.length})
            </TabsTrigger>
            <TabsTrigger value="board" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Active Tracker
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              Archive ({archivedWarranties.length})
            </TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-1.5" data-tutorial="aging-tab">
              <BarChart3 className="h-3.5 w-3.5" />
              Aging Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submitted" className="mt-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Submitted Warranty Requests</CardTitle>
                <p className="text-sm text-muted-foreground">
                  New requests stay here until a production manager reviews them. Once approved, they move into the active tracker.
                </p>
              </CardHeader>
              <CardContent>
                {submittedWarranties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No submitted warranty requests are waiting for review.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {submittedWarranties.map((warranty) => (
                      <div
                        key={warranty.id}
                        className="rounded-xl border p-4 transition-colors hover:bg-accent/30"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => handleView(warranty)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{warranty.customer_name}</p>
                              <Badge className={cn("text-[10px]", PRIORITY_LEVELS.find((item) => item.value === warranty.priority_level)?.color)}>
                                {PRIORITY_LEVELS.find((item) => item.value === warranty.priority_level)?.label}
                              </Badge>
                              <Badge variant="secondary">Submitted</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{warranty.job_address}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{warranty.issue_description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted {formatOptionalDate(warranty.date_submitted)} by review workflow
                            </p>
                          </div>
                          {canManageWarranty && (
                            <Button
                              onClick={() => handleApproveSubmission(warranty)}
                              disabled={updateWarranty.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve Into Tracker
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="board" className="mt-4" data-tutorial="kanban-board">
            {!canManageWarranty && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Only production managers and admins can move warranties through the tracker pipeline.</p>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="hidden md:grid grid-cols-4 gap-4">
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
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                            <Archive className="w-4 h-4 text-muted-foreground/60" />
                          </div>
                          <p className="text-xs text-muted-foreground">Nothing here</p>
                        </div>
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

              <DragOverlay>
                {activeWarranty ? (
                  <DraggableWarrantyCard warranty={activeWarranty} onView={() => {}} isDragOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="md:hidden">
              <Tabs value={mobileTab} onValueChange={setMobileTab}>
                <TabsList className="w-full grid grid-cols-4">
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
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                            <Archive className="w-5 h-5 text-muted-foreground/60" />
                          </div>
                          <p className="text-sm text-muted-foreground">Nothing in {col.label.toLowerCase()}</p>
                        </div>
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
                  <p className="text-sm text-muted-foreground text-center py-8">No archived warranties yet. Completed warranties can be closed and archived from the active tracker.</p>
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
                          {w.closed_date && <p className="text-[10px] text-muted-foreground">Closed {formatOptionalDate(w.closed_date)}</p>}
                          {w.date_completed && !w.closed_date && <p className="text-[10px] text-muted-foreground">Completed {formatOptionalDate(w.date_completed)}</p>}
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

        {canSubmitWarranty && (
          <button onClick={handleCreate} className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform">
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      <WarrantyForm
        open={isFormOpen}
        onOpenChange={o => {
          setIsFormOpen(o);
          if (!o) setSelectedWarranty(null);
        }}
        warranty={selectedWarranty}
      />

      <WarrantyDetail
        open={isDetailOpen}
        onOpenChange={o => {
          setIsDetailOpen(o);
          if (!o) {
            setSelectedWarranty(null);
            setRouteParams({ id: null });
          }
        }}
        warranty={selectedWarranty}
        onEdit={() => { setIsDetailOpen(false); setIsFormOpen(true); }}
        canEdit={canManageWarranty}
      />
      <GuidedTour pageName="warranties" pageTitle="Warranty Tracker" steps={warrantySteps} />
    </>
  );
}
