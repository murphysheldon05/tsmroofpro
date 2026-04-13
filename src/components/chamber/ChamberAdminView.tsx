import { useState, useMemo, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  UserPlus,
  Calendar,
  Users,
  BookOpen,
  Loader2,
  Edit,
  Search,
  Clock,
  MapPin,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useChambers,
  useChamberAssignments,
  useAssignRepToChamber,
  useRemoveChamberAssignment,
  useChamberEvents,
  useCreateChamberEvent,
  useUpdateChamberEvent,
  useDeleteChamberEvent,
  useAssignRepToEvent,
  useChamberEventAssignments,
  useChamberStats,
  type Chamber,
  type ChamberEvent,
  type ChamberEventAssignment,
} from "@/hooks/useChambers";
import { format } from "date-fns";
import { RepGuideContent } from "./RepGuideContent";

const EVENT_TYPE_COLORS: Record<string, string> = {
  Networking: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
  "Ribbon Cutting": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  Education: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
  Meeting: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
  Community: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
  Government: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
  Signature: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300",
};

const EVENT_TYPES = ["Networking", "Ribbon Cutting", "Education", "Meeting", "Community", "Government", "Signature"];

function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles-for-chambers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      return (data || []).map((p) => ({
        id: p.id,
        name: p.full_name || p.email || "Unknown",
        email: p.email || "",
      }));
    },
  });
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBorderColor(status: string) {
  switch (status) {
    case "assigned": return "border-l-blue-500";
    case "confirmed": return "border-l-green-500";
    case "declined": return "border-l-red-500";
    default: return "border-l-transparent";
  }
}

export function ChamberAdminView() {
  const { data: chambers, isLoading } = useChambers();
  const { data: allAssignments } = useChamberAssignments();
  const { data: allEvents } = useChamberEvents();
  const { data: profiles } = useAllProfiles();
  const { data: allEventAssignments } = useQuery({
    queryKey: ["all-chamber-event-assignments"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("chamber_event_assignments").select("*");
      if (error) throw error;

      const userIds = [...new Set((data || []).map((a: any) => a.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        profileMap = (profs || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || p.email || "Unknown";
          return acc;
        }, {});
      }

      return (data || []).map((a: any) => ({
        ...a,
        user_name: profileMap[a.user_id] || "Unknown",
      })) as ChamberEventAssignment[];
    },
  });

  const assignRep = useAssignRepToChamber();
  const removeAssignment = useRemoveChamberAssignment();
  const createEvent = useCreateChamberEvent();
  const updateEvent = useUpdateChamberEvent();
  const deleteEvent = useDeleteChamberEvent();
  const assignToEvent = useAssignRepToEvent();

  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [assignModal, setAssignModal] = useState<{ chamberId: string; chamberName: string } | null>(null);
  const [selectedRepId, setSelectedRepId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const [eventModal, setEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChamberEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    chamber_id: "",
    name: "",
    event_type: "Networking",
    event_date: "",
    event_time: "",
    location: "",
  });

  const [eventAssignModal, setEventAssignModal] = useState<{ eventId: string; eventName: string } | null>(null);
  const [eventRepId, setEventRepId] = useState("");

  // Events tab filters
  const [eventSearch, setEventSearch] = useState("");
  const [eventChamberFilter, setEventChamberFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");

  const assignmentsByChamberId = useMemo(() => {
    const map: Record<string, typeof allAssignments> = {};
    for (const a of allAssignments || []) {
      if (!map[a.chamber_id]) map[a.chamber_id] = [];
      map[a.chamber_id]!.push(a);
    }
    return map;
  }, [allAssignments]);

  const eventAssignmentsByEventId = useMemo(() => {
    const map: Record<string, ChamberEventAssignment[]> = {};
    for (const a of allEventAssignments || []) {
      if (!map[a.event_id]) map[a.event_id] = [];
      map[a.event_id].push(a);
    }
    return map;
  }, [allEventAssignments]);

  const chamberNames = useMemo(() => {
    return [...new Set((allEvents || []).map((e) => e.chamber_name).filter(Boolean))].sort();
  }, [allEvents]);

  const stats = useMemo(() => {
    const ea = allEventAssignments || [];
    return {
      total: (allEvents || []).length,
      assigned: ea.filter((a) => a.status === "assigned").length,
      confirmed: ea.filter((a) => a.status === "confirmed").length,
      declined: ea.filter((a) => a.status === "declined").length,
    };
  }, [allEvents, allEventAssignments]);

  const filteredEvents = useMemo(() => {
    let evts = allEvents || [];
    if (eventSearch) {
      const q = eventSearch.toLowerCase();
      evts = evts.filter((e) =>
        [e.name, e.location, e.chamber_name].some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (eventChamberFilter !== "all") {
      evts = evts.filter((e) => e.chamber_name === eventChamberFilter);
    }
    if (eventTypeFilter !== "all") {
      evts = evts.filter((e) => e.event_type === eventTypeFilter);
    }
    if (eventStatusFilter !== "all") {
      evts = evts.filter((e) => {
        const ea = eventAssignmentsByEventId[e.id];
        if (eventStatusFilter === "unassigned") return !ea || ea.length === 0;
        return ea?.some((a) => a.status === eventStatusFilter);
      });
    }
    return evts;
  }, [allEvents, eventSearch, eventChamberFilter, eventTypeFilter, eventStatusFilter, eventAssignmentsByEventId]);

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const groups: { label: string; sortKey: string; events: ChamberEvent[] }[] = [];
    const map = new Map<string, ChamberEvent[]>();
    for (const e of filteredEvents) {
      const d = new Date(e.event_date + "T12:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = format(d, "MMMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const [key, events] of map.entries()) {
      const d = new Date(events[0].event_date + "T12:00:00");
      groups.push({ label: format(d, "MMMM yyyy"), sortKey: key, events });
    }
    groups.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return groups;
  }, [filteredEvents]);

  function toggleCredentials(chamberId: string) {
    setShowCredentials((prev) => ({ ...prev, [chamberId]: !prev[chamberId] }));
  }

  function handleAssign() {
    if (!assignModal || !selectedRepId) return;
    assignRep.mutate(
      { chamberId: assignModal.chamberId, userId: selectedRepId, notes: assignNotes },
      { onSuccess: () => { setAssignModal(null); setSelectedRepId(""); setAssignNotes(""); } }
    );
  }

  function openEventForm(event?: ChamberEvent) {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        chamber_id: event.chamber_id,
        name: event.name,
        event_type: event.event_type,
        event_date: event.event_date,
        event_time: event.event_time || "",
        location: event.location || "",
      });
    } else {
      setEditingEvent(null);
      setEventForm({ chamber_id: "", name: "", event_type: "Networking", event_date: "", event_time: "", location: "" });
    }
    setEventModal(true);
  }

  function handleSaveEvent() {
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...eventForm, is_manual: true }, { onSuccess: () => setEventModal(false) });
    } else {
      createEvent.mutate({ ...eventForm, is_manual: true }, { onSuccess: () => setEventModal(false) });
    }
  }

  function handleAssignEvent() {
    if (!eventAssignModal || !eventRepId) return;
    assignToEvent.mutate(
      { eventId: eventAssignModal.eventId, userId: eventRepId },
      { onSuccess: () => { setEventAssignModal(null); setEventRepId(""); } }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="chambers" className="space-y-4">
      <TabsList>
        <TabsTrigger value="chambers" className="gap-2">
          <Building2 className="h-4 w-4" /> Chambers
        </TabsTrigger>
        <TabsTrigger value="events" className="gap-2">
          <Calendar className="h-4 w-4" /> Events
        </TabsTrigger>
        <TabsTrigger value="assignments" className="gap-2">
          <Users className="h-4 w-4" /> Assignment Log
        </TabsTrigger>
        <TabsTrigger value="guide" className="gap-2">
          <BookOpen className="h-4 w-4" /> Rep Guide
        </TabsTrigger>
      </TabsList>

      {/* ─── Chambers Tab ─── */}
      <TabsContent value="chambers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(chambers || []).map((chamber) => {
            const assignments = assignmentsByChamberId[chamber.id] || [];
            const show = showCredentials[chamber.id];
            return (
              <Card key={chamber.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {chamber.name}
                    </CardTitle>
                    {chamber.has_portal ? (
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                        Portal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">No Portal</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {chamber.has_portal && chamber.username ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-14 shrink-0">Username</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] break-all">{chamber.username}</code>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-14 shrink-0">Password</span>
                        <button
                          onClick={() => toggleCredentials(chamber.id)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {show ? (
                            <>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{chamber.password}</code>
                              <EyeOff className="h-3 w-3 ml-1" />
                            </>
                          ) : (
                            <>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">••••••</code>
                              <Eye className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : !chamber.has_portal ? (
                    <p className="text-xs text-muted-foreground">No member portal — website only</p>
                  ) : null}

                  {chamber.portal_url && (
                    <a
                      href={chamber.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {chamber.portal_label || "Portal Login"}
                    </a>
                  )}

                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">
                        Assigned Reps ({assignments.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setAssignModal({ chamberId: chamber.id, chamberName: chamber.name })}
                      >
                        <UserPlus className="h-3 w-3" /> Assign
                      </Button>
                    </div>
                    {assignments.length > 0 ? (
                      <div className="space-y-1">
                        {assignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                {a.user_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-xs font-medium">{a.user_name}</span>
                                {a.notes && <span className="text-[10px] text-muted-foreground ml-1.5">· {a.notes}</span>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeAssignment.mutate(a.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Unassigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* ─── Events Tab ─── */}
      <TabsContent value="events">
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Assigned", value: stats.assigned, color: "text-blue-600" },
              { label: "Confirmed", value: stats.confirmed, color: "text-green-600" },
              { label: "Declined", value: stats.declined, color: "text-red-600" },
            ].map((s) => (
              <Card key={s.label} className="border">
                <CardContent className="p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Event */}
          <button
            onClick={() => openEventForm()}
            className="w-full py-2.5 rounded-lg border border-dashed border-border text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
          >
            + Add Event
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Search events…"
              className="pl-9"
            />
          </div>

          {/* Chip Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Chamber</span>
              <Chip label="All" active={eventChamberFilter === "all"} onClick={() => setEventChamberFilter("all")} />
              {chamberNames.map((n) => (
                <Chip key={n} label={n!} active={eventChamberFilter === n} onClick={() => setEventChamberFilter(n!)} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Type</span>
              <Chip label="All" active={eventTypeFilter === "all"} onClick={() => setEventTypeFilter("all")} />
              {EVENT_TYPES.map((t) => (
                <Chip key={t} label={t} active={eventTypeFilter === t} onClick={() => setEventTypeFilter(t)} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Status</span>
              {["all", "unassigned", "assigned", "confirmed", "declined"].map((s) => (
                <Chip key={s} label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} active={eventStatusFilter === s} onClick={() => setEventStatusFilter(s)} />
              ))}
            </div>
          </div>

          {/* Monthly Grouped Events */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No events match your filters.</div>
          ) : (
            <div className="space-y-2">
              {eventsByMonth.map((group) => (
                <Fragment key={group.sortKey}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1.5 border-b border-border">
                    {group.label}
                  </div>
                  {group.events.map((event) => {
                    const d = new Date(event.event_date + "T12:00:00");
                    const ea = eventAssignmentsByEventId[event.id] || [];
                    const topStatus = ea.length > 0
                      ? ea.some((a) => a.status === "confirmed") ? "confirmed"
                        : ea.some((a) => a.status === "assigned") ? "assigned"
                        : "declined"
                      : "unassigned";

                    return (
                      <Card key={event.id} className={`border-l-[3px] ${topStatus === "unassigned" ? "border-l-transparent" : StatusBorderColor(topStatus)}`}>
                        <CardContent className="p-3 flex gap-3">
                          {/* Date Badge */}
                          <div className="text-center shrink-0 w-9">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{format(d, "MMM")}</div>
                            <div className="text-xl font-bold leading-tight">{format(d, "d")}</div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-medium leading-tight">
                                {event.name}
                                {event.is_manual && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300">
                                    Manual
                                  </Badge>
                                )}
                              </span>
                              <div className="flex gap-1.5 shrink-0 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] ${EVENT_TYPE_COLORS[event.event_type] || ""}`}>
                                  {event.event_type}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted/50">
                                  {event.chamber_name}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                              {event.event_time && (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.event_time}</span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
                              )}
                            </div>

                            {/* Assignments & Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {ea.length > 0 ? (
                                ea.map((a) => (
                                  <Badge
                                    key={a.id}
                                    variant="outline"
                                    className={`text-[10px] ${
                                      a.status === "confirmed" ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300"
                                        : a.status === "declined" ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300"
                                        : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300"
                                    }`}
                                  >
                                    {a.user_name} · {a.status}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">No reps assigned</span>
                              )}
                              <div className="flex gap-1 ml-auto">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEventAssignModal({ eventId: event.id, eventName: event.name })}>
                                  <UserPlus className="h-3 w-3" /> Assign
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEventForm(event)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteEvent.mutate(event.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ─── Assignment Log Tab ─── */}
      <TabsContent value="assignments">
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chamber</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allAssignments || []).map((a) => {
                const chamberName = (chambers || []).find((c) => c.id === a.chamber_id)?.name || "Unknown";
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{chamberName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                          {a.user_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        {a.user_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.assigned_by_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(a.assigned_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {(!allAssignments || allAssignments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No assignments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ─── Rep Guide Tab ─── */}
      <TabsContent value="guide">
        <RepGuideContent />
      </TabsContent>

      {/* ─── Assign Rep Modal ─── */}
      <Dialog open={!!assignModal} onOpenChange={() => setAssignModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Rep to {assignModal?.chamberName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Rep</Label>
              <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                <SelectTrigger><SelectValue placeholder="Choose a rep..." /></SelectTrigger>
                <SelectContent>
                  {(profiles || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedRepId || assignRep.isPending}>
              {assignRep.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Event Form Modal ─── */}
      <Dialog open={eventModal} onOpenChange={setEventModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chamber</Label>
              <Select value={eventForm.chamber_id} onValueChange={(v) => setEventForm((f) => ({ ...f, chamber_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select chamber..." /></SelectTrigger>
                <SelectContent>
                  {(chambers || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Name</Label>
              <Input value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time</Label>
                <Input value={eventForm.event_time} onChange={(e) => setEventForm((f) => ({ ...f, event_time: e.target.value }))} placeholder="e.g. 5:00 PM" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEvent} disabled={!eventForm.name || !eventForm.event_date || !eventForm.chamber_id}>
              {editingEvent ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Rep to Event Modal ─── */}
      <Dialog open={!!eventAssignModal} onOpenChange={() => setEventAssignModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Rep to: {eventAssignModal?.eventName}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Select Rep</Label>
            <Select value={eventRepId} onValueChange={setEventRepId}>
              <SelectTrigger><SelectValue placeholder="Choose a rep..." /></SelectTrigger>
              <SelectContent>
                {(profiles || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssignEvent} disabled={!eventRepId || assignToEvent.isPending}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
