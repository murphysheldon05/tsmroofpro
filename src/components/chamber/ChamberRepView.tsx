import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  ExternalLink,
  Calendar,
  BookOpen,
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
} from "@/hooks/useChambers";
import { isPast, isToday } from "date-fns";
import { RepGuideContent } from "./RepGuideContent";
import { ChamberMonthCalendar } from "./ChamberMonthCalendar";
import { EventChecklist } from "./EventChecklist";

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

  const pastConfirmedEvents = useMemo(() => {
    return myEvents.filter((e) => {
      const d = new Date(e.event_date + "T23:59:59");
      const assignment = myEventAssignmentMap[e.id];
      return (isPast(d) && !isToday(d)) && assignment?.status === "confirmed";
    }).slice(-10);
  }, [myEvents, myEventAssignmentMap]);

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

            {/* Month Calendar View */}
            <ChamberMonthCalendar
              events={filteredEvents}
              myAssignmentMap={myEventAssignmentMap}
              onConfirm={(id) => updateStatus.mutate({ id, status: "confirmed" })}
              onDecline={(id) => updateStatus.mutate({ id, status: "declined" })}
            />

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No events match your filters.</div>
            )}

            {/* Event Checklists for past confirmed events */}
            {pastConfirmedEvents.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                  Post-Event Checklists
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete these action items for events you attended.
                </p>
                {pastConfirmedEvents.map((event) => (
                  <EventChecklist key={event.id} event={event} />
                ))}
              </div>
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
