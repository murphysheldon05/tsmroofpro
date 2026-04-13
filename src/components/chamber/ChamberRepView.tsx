import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useChambers,
  useChamberEvents,
  useMyEventAssignments,
  useUpdateEventAssignmentStatus,
  type Chamber,
  type ChamberEvent,
} from "@/hooks/useChambers";
import { format, isPast, isToday } from "date-fns";

const EVENT_TYPE_COLORS: Record<string, string> = {
  Networking: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
  "Ribbon Cutting": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
  Education: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
  Meeting: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
  Community: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
  Government: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
  Signature: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300",
  declined: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
};

export function ChamberRepView() {
  const { user } = useAuth();
  const { data: chambers, isLoading: chambersLoading } = useChambers();
  const { data: events, isLoading: eventsLoading } = useChamberEvents();
  const { data: myAssignments } = useMyEventAssignments();
  const updateStatus = useUpdateEventAssignmentStatus();

  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

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

  const upcomingEvents = myEvents.filter((e) => {
    const d = new Date(e.event_date + "T23:59:59");
    return !isPast(d) || isToday(d);
  });

  const pastEvents = myEvents.filter((e) => {
    const d = new Date(e.event_date + "T23:59:59");
    return isPast(d) && !isToday(d);
  });

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
          {upcomingEvents.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px]">
              {upcomingEvents.length}
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
                <Card key={chamber.id}>
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
                    {chamber.portal_url && (
                      <a
                        href={chamber.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {chamber.has_portal ? "Login to Portal" : "View Website"}
                      </a>
                    )}

                    {chamber.username && (
                      <div className="text-xs space-y-1">
                        <button
                          onClick={() => setShowCredentials((p) => ({ ...p, [chamber.id]: !p[chamber.id] }))}
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
          <div className="space-y-6">
            {upcomingEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Events</h3>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      assignment={myEventAssignmentMap[event.id]}
                      onConfirm={(id) => updateStatus.mutate({ id, status: "confirmed" })}
                      onDecline={(id) => updateStatus.mutate({ id, status: "declined" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </div>
            )}
            {pastEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Past Events</h3>
                <div className="space-y-3 opacity-70">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      assignment={myEventAssignmentMap[event.id]}
                      onConfirm={() => {}}
                      onDecline={() => {}}
                      isPending={false}
                      isPast
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* ─── Rep Guide ─── */}
      <TabsContent value="guide">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chamber Event Rep Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="purpose">
                <AccordionTrigger>Purpose & Your Role</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>As a TSM Roofing representative, you are the face of our company at Chamber of Commerce events. Your role is to build relationships, generate leads, and increase brand awareness in the local business community.</p>
                  <ul>
                    <li>Represent TSM Roofing professionally at all times</li>
                    <li>Build genuine relationships with local business owners</li>
                    <li>Position TSM as the go-to roofing partner for referrals</li>
                    <li>Collect contact information and follow up within 48 hours</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="checklist">
                <AccordionTrigger>Before You Go — Mandatory Checklist</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ul>
                    <li>Bring at least 50 business cards</li>
                    <li>Wear TSM branded polo or professional attire</li>
                    <li>Review the chamber's member directory beforehand</li>
                    <li>Charge your phone — you'll need it for contact exchange</li>
                    <li>Arrive 10-15 minutes early to scope the room</li>
                    <li>Have your elevator pitch ready (see below)</li>
                    <li>Bring a pen and small notepad for notes</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="attendance">
                <AccordionTrigger>Attendance Requirements</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>Consistent attendance is key to building recognition. The chamber community remembers faces they see regularly.</p>
                  <ul>
                    <li>Attend a minimum of 2 events per chamber per month</li>
                    <li>Confirm or decline assigned events within 24 hours</li>
                    <li>If you must cancel, notify your manager immediately</li>
                    <li>No-shows without notice will be flagged</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pitch">
                <AccordionTrigger>Elevator Pitch — Use This</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <blockquote>
                    "Hi, I'm [Name] with TSM Roofing. We're a local roofing company that handles everything from insurance claims to full roof replacements. What makes us different is our hands-on approach — we walk homeowners through every step, from the initial inspection to the final install. If you ever run into someone who needs roof work, I'd love to be your go-to referral."
                  </blockquote>
                  <p><strong>Key points to hit:</strong> Local, full-service, insurance expertise, referral-friendly.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="working">
                <AccordionTrigger>Working the Room</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ul>
                    <li>Don't sit with people you already know — branch out</li>
                    <li>Aim to have meaningful conversations with at least 5 new contacts</li>
                    <li>Ask questions first — people love talking about their business</li>
                    <li>Exchange cards with every new contact</li>
                    <li>Write a note on the back of their card after the conversation</li>
                    <li>Spend equal time listening and talking</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="starters">
                <AccordionTrigger>Conversation Starters & Openers</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ul>
                    <li>"What brings you to this event?"</li>
                    <li>"How long have you been a member of this chamber?"</li>
                    <li>"Tell me about your business — what's your ideal client?"</li>
                    <li>"What's the best referral you've ever gotten from a chamber event?"</li>
                    <li>"I'm always looking for local businesses to partner with — what does a good referral look like for you?"</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="conduct">
                <AccordionTrigger>Conduct Standards & What NOT to Do</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p><strong>DO:</strong></p>
                  <ul>
                    <li>Be professional, friendly, and approachable</li>
                    <li>Represent TSM with integrity</li>
                    <li>Thank the event organizers</li>
                  </ul>
                  <p><strong>DO NOT:</strong></p>
                  <ul>
                    <li>Hard-sell or be pushy — these are relationship events</li>
                    <li>Drink excessively at events with alcohol</li>
                    <li>Badmouth competitors</li>
                    <li>Spend the entire time on your phone</li>
                    <li>Leave early without connecting with new people</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="followup">
                <AccordionTrigger>After the Event — Follow-Up</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ul>
                    <li>Enter all new contacts into your CRM within 24 hours</li>
                    <li>Send a personalized follow-up email or text within 48 hours</li>
                    <li>Connect on LinkedIn if appropriate</li>
                    <li>Reference something specific from your conversation</li>
                    <li>Suggest a coffee meeting for high-potential contacts</li>
                    <li>Report event attendance and key contacts to your manager</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="quickref">
                <AccordionTrigger>Quick Reference Checklist</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                  <ol>
                    <li>Confirm event attendance in the Hub</li>
                    <li>Prepare materials (cards, attire, pitch)</li>
                    <li>Arrive 10-15 minutes early</li>
                    <li>Connect with 5+ new contacts</li>
                    <li>Exchange business cards</li>
                    <li>Take notes on each contact</li>
                    <li>Follow up within 48 hours</li>
                    <li>Log contacts and report to manager</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function EventCard({
  event,
  assignment,
  onConfirm,
  onDecline,
  isPending,
  isPast = false,
}: {
  event: ChamberEvent;
  assignment?: any;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  isPending: boolean;
  isPast?: boolean;
}) {
  const eventDate = new Date(event.event_date + "T00:00:00");
  const status = assignment?.status || "assigned";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{event.name}</span>
              <Badge variant="outline" className={`text-[10px] ${EVENT_TYPE_COLORS[event.event_type] || ""}`}>
                {event.event_type}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[status] || ""}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(eventDate, "EEE, MMM d, yyyy")}
              </span>
              {event.event_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.event_time}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">{event.chamber_name}</p>
          </div>

          {!isPast && status === "assigned" && assignment && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 h-8"
                onClick={() => onConfirm(assignment.id)}
                disabled={isPending}
              >
                <Check className="h-3.5 w-3.5" /> Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => onDecline(assignment.id)}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" /> Decline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
