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

// Kanban columns mapping
const KANBAN_COLUMNS: { key: string; label: string; statuses: WarrantyStatus[] }[] = [
  { key: "new", label: "New", statuses: ["new"] },
  { key: "in_progress", label: "In Progress", statuses: ["assigned", "in_review", "in_progress", "waiting_on_materials", "waiting_on_manufacturer"] },
  { key: "scheduled", label: "Scheduled", statuses: ["scheduled"] },
  { key: "completed", label: "Completed", statuses: ["completed", "denied"] },
];

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

export default function Warranties() {
  const { role, isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const canCreate = true; // Anyone can submit

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);
  const [mobileTab, setMobileTab] = useState("new");
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  const { data: warranties = [], isLoading } = useWarranties();
  const updateWarranty = useUpdateWarranty();

  const handleView = (w: WarrantyRequest) => { setSelectedWarranty(w); setIsDetailOpen(true); };
  const handleEdit = (w: WarrantyRequest) => { setSelectedWarranty(w); setIsFormOpen(true); };
  const handleCreate = () => { setSelectedWarranty(null); setIsFormOpen(true); };

  // Column data
  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => {
      const items = warranties.filter(w => col.statuses.includes(w.status));
      const overdue = items.filter(w => w.status !== "completed" && w.status !== "denied" && getAgeDays(w) > 30);
      return { ...col, items, overdueCount: overdue.length };
    });
  }, [warranties]);

  // Archive (completed)
  const archivedWarranties = useMemo(() => {
    const completed = warranties.filter(w => w.status === "completed" || w.status === "denied");
    if (!archiveSearch) return completed;
    const s = archiveSearch.toLowerCase();
    return completed.filter(w =>
      w.customer_name.toLowerCase().includes(s) ||
      w.job_address.toLowerCase().includes(s) ||
      w.issue_description.toLowerCase().includes(s)
    );
  }, [warranties, archiveSearch]);

  // Warranty card
  const WarrantyCard = ({ warranty }: { warranty: WarrantyRequest }) => {
    const age = getAgeDays(warranty);
    const isCompleted = warranty.status === "completed" || warranty.status === "denied";
    const statusConfig = WARRANTY_STATUSES.find(s => s.value === warranty.status);
    const priorityConfig = PRIORITY_LEVELS.find(p => p.value === warranty.priority_level);

    return (
      <div
        onClick={() => handleView(warranty)}
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
        {warranty.assigned_production_member && (
          <p className="text-[10px] text-muted-foreground mt-1.5">Assigned</p>
        )}
        <p className="text-[10px] text-muted-foreground">{format(parseISO(warranty.date_submitted), "MMM d, yyyy")}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}
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
          <Button onClick={handleCreate} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" />Submit Warranty
          </Button>
        </div>

        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Board</TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Aging Report</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-4">
            {/* Desktop Kanban */}
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
                  <div className="space-y-2 min-h-[200px] bg-muted/20 rounded-xl p-2">
                    {col.key === "completed" ? (
                      <>
                        {col.items.slice(0, 5).map(w => <WarrantyCard key={w.id} warranty={w} />)}
                        {col.items.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowArchive(true)}>
                            <Archive className="h-3.5 w-3.5 mr-1" />View Archive ({col.items.length})
                          </Button>
                        )}
                      </>
                    ) : (
                      col.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">No warranties</p>
                      ) : (
                        col.items.map(w => <WarrantyCard key={w.id} warranty={w} />)
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Tabs */}
            <div className="md:hidden">
              <Tabs value={mobileTab} onValueChange={setMobileTab}>
                <TabsList className="w-full grid grid-cols-4">
                  {columns.map(col => (
                    <TabsTrigger key={col.key} value={col.key} className="text-xs relative">
                      {col.label}
                      <Badge variant="secondary" className="ml-1 text-[10px] h-4 min-w-4 px-1">{col.items.length}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {columns.map(col => (
                  <TabsContent key={col.key} value={col.key} className="mt-3">
                    <div className="space-y-2">
                      {col.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No warranties</p>
                      ) : (
                        col.items.map(w => <WarrantyCard key={w.id} warranty={w} />)
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Archive Overlay */}
            {showArchive && (
              <Card className="mt-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Completed Archive</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowArchive(false)}>Close</Button>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search completed..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {archivedWarranties.map(w => (
                      <div key={w.id} onClick={() => handleView(w)} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{w.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.job_address}</p>
                        </div>
                        <div className="text-right ml-3">
                          <Badge className={cn("text-[10px]", WARRANTY_STATUSES.find(s => s.value === w.status)?.color)}>{WARRANTY_STATUSES.find(s => s.value === w.status)?.label}</Badge>
                          {w.date_completed && <p className="text-[10px] text-muted-foreground mt-0.5">{format(parseISO(w.date_completed), "MMM d, yyyy")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
    </AppLayout>
  );
}
