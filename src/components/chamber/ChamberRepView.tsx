import { useMemo, useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  ExternalLink,
  Calendar,
  BookOpen,
  Check,
  X,
  MapPin,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useChambers,
  useChamberEvents,
  useMyEventAssignments,
  useUpdateEventAssignmentStatus,
  type ChamberEvent,
} from "@/hooks/useChambers";
import { format, isPast, isToday } from "date-fns";
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

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300",
  declined: "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300",
};

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

const EVENT_TYPES = ["Networking", "Ribbon Cutting", "Education", "Meeting", "Community", "Government", "Signature"];

export function ChamberRepView() {
  const { user } = useAuth();
  const { data: chambers, isLoading: chambersLoading } = useChambers();
  const { data: events, isLoading: eventsLoading } = useChamberEvents();
  const { data: myAssignments } = useMyEventAssignments();
  const updateStatus = useUpdateEventAssignmentStatus();

  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [eventSearch, setEventSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const myEventAssignmentMap = useMemo(() => {
    const map: Record<string, typeof myAssignments extends (infer T)[] | undefined ? T : never> = {};
    for (const a of myAssignments || []) {
      map[a.event_id] = a;
    }
    return map;
  }, [myAssignments]);

  const myEvents = useMemo(() => {
    if (!events || !myAssignments) return [];
    const eventIds = new Set(myAssignments.map((a) => a.event_id));
    return events
      .filter((e) => eventIds.has(e.id))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events, myAssignments]);

  const filteredEvents = useMemo(() => {
    let evts = myEvents;
    if (eventSearch) {
      const q = eventSearch.toLowerCase();
      evts = evts.filter((e) =>
        [e.name, e.location, e.chamber_name].some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== "all") {
      evts = evts.filter((e) => e.event_type === typeFilter);
    }
    if (statusFilter !== "all") {
      evts = evts.filter((e) => {
        const a = myEventAssignmentMap[e.id];
        return a?.status === statusFilter;
      });
    }
    return evts;
  }, [myEvents, eventSearch, typeFilter, statusFilter, myEventAssignmentMap]);

  const upcomingFiltered = filteredEvents.filter((e) => {
    const d = new Date(e.event_date + "T23:59:59");
    return !isPast(d) || isToday(d);
  });

  const pastFiltered = filteredEvents.filter((e) => {
    const d = new Date(e.event_date + "T23:59:59");
    return isPast(d) && !isToday(d);
  });

  // Group by month
  function groupByMonth(evts: ChamberEvent[]) {
    const groups: { label: string; sortKey: string; events: ChamberEvent[] }[] = [];
    const map = new Map<string, ChamberEvent[]>();
    for (const e of evts) {
      const d = new Date(e.event_date + "T12:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const [key, events] of map.entries()) {
      const d = new Date(events[0].event_date + "T12:00:00");
      groups.push({ label: format(d, "MMMM yyyy"), sortKey: key, events });
    }
    groups.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return groups;
  }

  const stats = useMemo(() => {
    const ea = myAssignments || [];
    return {
      total: myEvents.length,
      assigned: ea.filter((a) => a.status === "assigned").length,
      confirmed: ea.filter((a) => a.status === "confirmed").length,
      declined: ea.filter((a) => a.status === "declined").length,
    };
  }, [myEvents, myAssignments]);

  if (chambersLoading || eventsLoading) {
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
          <Building2 className="h-4 w-4" /> My Chambers
        </TabsTrigger>
        <TabsTrigger value="events" className="gap-2">
          <Calendar className="h-4 w-4" /> My Events
          {stats.assigned > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px]">
              {stats.assigned}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="guide" className="gap-2">
          <BookOpen className="h-4 w-4" /> Rep Guide
        </TabsTrigger>
      </TabsList>

      {/* ─── My Chambers ─── */}
      <TabsContent value="chambers">
        {!chambers || chambers.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">You haven't been assigned to any chambers yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Ask your manager to assign you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chambers.map((chamber) => {
              const show = showCredentials[chamber.id];
              return (
                <Card key={chamber.id} className="overflow-hidden">
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
                            onClick={() => setShowCredentials((p) => ({ ...p, [chamber.id]: !p[chamber.id] }))}
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
                        {chamber.has_portal ? "Login to Portal" : "View Website"}
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ─── My Events ─── */}
      <TabsContent value="events">
        {myEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No events assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: stats.total, color: "text-foreground" },
                { label: "Pending", value: stats.assigned, color: "text-blue-600" },
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
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Type</span>
                <Chip label="All" active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
                {EVENT_TYPES.map((t) => (
                  <Chip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Status</span>
                {["all", "assigned", "confirmed", "declined"].map((s) => (
                  <Chip
                    key={s}
                    label={s === "all" ? "All" : s === "assigned" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                  />
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            {upcomingFiltered.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Upcoming Events
                </h3>
                {groupByMonth(upcomingFiltered).map((group) => (
                  <Fragment key={group.sortKey}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1.5 border-b border-border">
                      {group.label}
                    </div>
                    <div className="space-y-2 mb-4">
                      {group.events.map((event) => {
                        const d = new Date(event.event_date + "T12:00:00");
                        const assignment = myEventAssignmentMap[event.id];
                        const status = assignment?.status || "assigned";
                        const borderColor =
                          status === "confirmed" ? "border-l-green-500"
                          : status === "declined" ? "border-l-red-500"
                          : "border-l-blue-500";

                        return (
                          <Card key={event.id} className={`border-l-[3px] ${borderColor} ${status === "declined" ? "opacity-60" : ""}`}>
                            <CardContent className="p-3 flex gap-3">
                              <div className="text-center shrink-0 w-9">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{format(d, "MMM")}</div>
                                <div className="text-xl font-bold leading-tight">{format(d, "d")}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-sm font-medium leading-tight">{event.name}</span>
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[status] || ""}`}>
                                    {status === "assigned" ? "Pending" : status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Badge>
                                  {status === "assigned" && assignment && (
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <Button
                                        size="sm"
                                        className="gap-1 bg-green-600 hover:bg-green-700 h-7 text-xs"
                                        onClick={() => updateStatus.mutate({ id: assignment.id, status: "confirmed" })}
                                        disabled={updateStatus.isPending}
                                      >
                                        <Check className="h-3 w-3" /> Confirm
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-7 text-xs"
                                        onClick={() => updateStatus.mutate({ id: assignment.id, status: "declined" })}
                                        disabled={updateStatus.isPending}
                                      >
                                        <X className="h-3 w-3" /> Decline
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </Fragment>
                ))}
              </div>
            )}

            {/* Past Events */}
            {pastFiltered.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Past Events
                </h3>
                <div className="space-y-2 opacity-60">
                  {groupByMonth(pastFiltered).map((group) => (
                    <Fragment key={group.sortKey}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1.5 border-b border-border">
                        {group.label}
                      </div>
                      {group.events.map((event) => {
                        const d = new Date(event.event_date + "T12:00:00");
                        const assignment = myEventAssignmentMap[event.id];
                        const status = assignment?.status || "assigned";

                        return (
                          <Card key={event.id} className="border-l-[3px] border-l-transparent">
                            <CardContent className="p-3 flex gap-3">
                              <div className="text-center shrink-0 w-9">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{format(d, "MMM")}</div>
                                <div className="text-xl font-bold leading-tight">{format(d, "d")}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-sm font-medium leading-tight">{event.name}</span>
                                  <div className="flex gap-1.5 shrink-0">
                                    <Badge variant="outline" className={`text-[10px] ${EVENT_TYPE_COLORS[event.event_type] || ""}`}>
                                      {event.event_type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  {event.event_time && (
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.event_time}</span>
                                  )}
                                  <span className="flex items-center gap-1">{event.chamber_name}</span>
                                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[status] || ""}`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No events match your filters.</div>
            )}
          </div>
        )}
      </TabsContent>

      {/* ─── Rep Guide ─── */}
      <TabsContent value="guide">
        <RepGuideContent />
      </TabsContent>
    </Tabs>
  );
}
