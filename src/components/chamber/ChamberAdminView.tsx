import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  Loader2,
  Edit,
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
  useChamberStats,
  type Chamber,
  type ChamberEvent,
} from "@/hooks/useChambers";
import { format } from "date-fns";

const EVENT_TYPE_COLORS: Record<string, string> = {
  Networking: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
  "Ribbon Cutting": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
  Education: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
  Meeting: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
  Community: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
  Government: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
  Signature: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
};

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

export function ChamberAdminView() {
  const { data: chambers, isLoading } = useChambers();
  const { data: allAssignments } = useChamberAssignments();
  const { data: allEvents } = useChamberEvents();
  const { data: profiles } = useAllProfiles();
  const stats = useChamberStats();
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

  const assignmentsByChamberId = useMemo(() => {
    const map: Record<string, typeof allAssignments> = {};
    for (const a of allAssignments || []) {
      if (!map[a.chamber_id]) map[a.chamber_id] = [];
      map[a.chamber_id]!.push(a);
    }
    return map;
  }, [allAssignments]);

  function toggleCredentials(chamberId: string) {
    setShowCredentials((prev) => ({ ...prev, [chamberId]: !prev[chamberId] }));
  }

  function handleAssign() {
    if (!assignModal || !selectedRepId) return;
    assignRep.mutate(
      { chamberId: assignModal.chamberId, userId: selectedRepId, notes: assignNotes },
      {
        onSuccess: () => {
          setAssignModal(null);
          setSelectedRepId("");
          setAssignNotes("");
        },
      }
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
      updateEvent.mutate(
        { id: editingEvent.id, ...eventForm, is_manual: true },
        { onSuccess: () => setEventModal(false) }
      );
    } else {
      createEvent.mutate(
        { ...eventForm, is_manual: true },
        { onSuccess: () => setEventModal(false) }
      );
    }
  }

  function handleAssignEvent() {
    if (!eventAssignModal || !eventRepId) return;
    assignToEvent.mutate(
      { eventId: eventAssignModal.eventId, userId: eventRepId },
      {
        onSuccess: () => {
          setEventAssignModal(null);
          setEventRepId("");
        },
      }
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
        <TabsTrigger value="stats" className="gap-2">
          <BarChart3 className="h-4 w-4" /> Stats
        </TabsTrigger>
      </TabsList>

      {/* ─── Chambers Tab ─── */}
      <TabsContent value="chambers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(chambers || []).map((chamber) => {
            const assignments = assignmentsByChamberId[chamber.id] || [];
            const show = showCredentials[chamber.id];
            return (
              <Card key={chamber.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{chamber.name}</CardTitle>
                    {chamber.has_portal ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                        Portal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">No Portal</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {chamber.has_portal && chamber.portal_url && (
                    <a
                      href={chamber.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {chamber.portal_label || "Portal Login"}
                    </a>
                  )}

                  {chamber.username && (
                    <div className="text-xs space-y-1">
                      <button
                        onClick={() => toggleCredentials(chamber.id)}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {show ? "Hide credentials" : "Show credentials"}
                      </button>
                      {show && (
                        <div className="bg-muted/50 rounded-md p-2 space-y-0.5 font-mono text-[11px]">
                          <div><span className="text-muted-foreground">User:</span> {chamber.username}</div>
                          <div><span className="text-muted-foreground">Pass:</span> {chamber.password}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Assigned Reps ({assignments.length})</span>
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
                          <div key={a.id} className="flex items-center justify-between text-xs">
                            <span>{a.user_name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeAssignment.mutate(a.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No reps assigned</p>
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
          <div className="flex justify-end">
            <Button onClick={() => openEventForm()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Chamber</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(allEvents || []).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(event.event_date + "T00:00:00"), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{event.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{event.chamber_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${EVENT_TYPE_COLORS[event.event_type] || ""}`}>
                        {event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{event.event_time || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{event.location || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEventAssignModal({ eventId: event.id, eventName: event.name })}>
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEventForm(event)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteEvent.mutate(event.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!allEvents || allEvents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No events yet. Click "Add Event" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                    <TableCell>{a.user_name}</TableCell>
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

      {/* ─── Stats Tab ─── */}
      <TabsContent value="stats">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Chambers</p>
              <p className="text-3xl font-bold">{chambers?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-3xl font-bold">{stats.totalEvents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Event Assignments</p>
              <p className="text-3xl font-bold">
                {stats.eventAssignments.assigned + stats.eventAssignments.confirmed + stats.eventAssignments.declined}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Confirmed</p>
              <p className="text-3xl font-bold text-green-600">{stats.eventAssignments.confirmed}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{stats.eventAssignments.assigned} pending</span>
                <span>{stats.eventAssignments.declined} declined</span>
              </div>
            </CardContent>
          </Card>
        </div>
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
                <SelectTrigger>
                  <SelectValue placeholder="Choose a rep..." />
                </SelectTrigger>
                <SelectContent>
                  {(profiles || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select chamber..." />
                </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Networking", "Ribbon Cutting", "Education", "Meeting", "Community", "Government", "Signature"].map((t) => (
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
              <SelectTrigger>
                <SelectValue placeholder="Choose a rep..." />
              </SelectTrigger>
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
