import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOF_TYPE_LABELS: Record<string, string> = {
  tile: "Concrete Tile",
  shingle: "Asphalt Shingles",
  foam: "Foam",
  coatings: "Coatings",
};

const ROOF_TYPE_KEYWORDS: Record<string, string[]> = {
  tile: [
    "tile", "concrete tile", "concrete", "lift and reset",
    "detach and reset", "tile detach", "tile roofing",
  ],
  shingle: [
    "shingle", "shingles", "asphalt shingle", "asphalt shingles", "asphalt",
  ],
  foam: ["foam", "spray foam", "spf", "polyurethane"],
  coatings: ["coating", "coatings", "coat"],
};

const TILE_SHINGLE_CREW_PATTERNS = ["benjamin", "jimmy"];
const FOAM_COATINGS_CREW_PATTERNS = ["arturo"];

const CREW_ROOF_CAPABILITIES: Record<string, string[]> = {
  tile_shingle: ["tile", "shingle"],
  foam_coatings: ["foam", "coatings"],
};

const SCHEDULE_INTENT_PHRASES = [
  "schedule a job", "schedule a new job", "schedule this", "schedule it",
  "book a job", "book it", "add a job", "add to schedule", "add to the schedule",
  "put on the schedule", "put it on the schedule", "put on schedule",
  "need to schedule", "want to schedule", "i need to schedule",
  "set up a job", "create a job", "new job on the schedule",
  "schedule a tile", "schedule a shingle", "schedule a foam", "schedule a coating",
  "schedule tile", "schedule shingle", "schedule foam", "schedule coating",
  "schedule an install", "add an install",
];

// ─── Duration Calculation ────────────────────────────────────────────────────

function getDaysNeeded(roofType: string, squares: number | null): number {
  const sq = squares || 25;

  switch (roofType) {
    case "tile":
      if (sq <= 25) return 1;
      if (sq <= 35) return 2;
      if (sq <= 50) return 3;
      if (sq <= 60) return 4;
      return 5;
    case "shingle":
      if (sq <= 40) return 1;
      return 2;
    case "foam":
    case "coatings":
      if (sq <= 20) return 2;
      return 3;
    default:
      return 1;
  }
}

function getDurationExplanation(roofType: string, squares: number | null, days: number): string {
  const sq = squares ? `${squares}-square` : "";
  const label = ROOF_TYPE_LABELS[roofType] || roofType;

  if (roofType === "tile") {
    return `A ${sq} ${label} job takes about ${days} day${days !== 1 ? "s" : ""} (lift and reset).`;
  }
  if (roofType === "shingle") {
    const note = days === 1 ? " (even with 1-2 layers)" : "";
    return `A ${sq} ${label} job takes about ${days} day${days !== 1 ? "s" : ""}${note}.`;
  }
  if (roofType === "foam" || roofType === "coatings") {
    if (days >= 3) {
      return `A ${sq} ${label} job takes about ${days} days (cleaning/prep, foam + first coat, final coat).`;
    }
    return `A ${sq} ${label} job takes about ${days} days (prep + application).`;
  }
  return `Estimated ${days} day${days !== 1 ? "s" : ""}.`;
}

// ─── Parsing Helpers ─────────────────────────────────────────────────────────

function detectRoofType(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [type, keywords] of Object.entries(ROOF_TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return type;
    }
  }
  return null;
}

function detectSquares(message: string): number | null {
  const patterns = [
    /(\d+)\s*(?:sq|square|squares)/i,
    /(\d+)\s*(?:sqft|sq\s*ft)/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function detectAllTypesQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("all") || lower.includes("everything") ||
    lower.includes("each") || lower.includes("every type") ||
    lower.includes("overview") || lower.includes("summary")
  );
}

function detectSchedulingIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return SCHEDULE_INTENT_PHRASES.some((kw) => lower.includes(kw));
}

// ─── Crew Matching ───────────────────────────────────────────────────────────

interface Crew {
  id: string;
  name: string;
}

function getCrewGroup(crewName: string): "tile_shingle" | "foam_coatings" | null {
  const lower = crewName.toLowerCase();
  if (TILE_SHINGLE_CREW_PATTERNS.some((p) => lower.includes(p))) return "tile_shingle";
  if (FOAM_COATINGS_CREW_PATTERNS.some((p) => lower.includes(p))) return "foam_coatings";
  return null;
}

function getCrewsForRoofType(roofType: string, crews: Crew[]): Crew[] {
  const isTileShingle = roofType === "tile" || roofType === "shingle";
  const isFoamCoatings = roofType === "foam" || roofType === "coatings";

  return crews.filter((c) => {
    const group = getCrewGroup(c.name);
    if (isTileShingle && group === "tile_shingle") return true;
    if (isFoamCoatings && group === "foam_coatings") return true;
    if (!group) return true;
    return false;
  });
}

// ─── Availability Finder ─────────────────────────────────────────────────────

interface CalendarEvent {
  start_date: string;
  end_date: string | null;
  crew_id: string | null;
  roof_type: string | null;
  squares: number | null;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateToStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function findNextAvailableSlot(
  daysNeeded: number,
  roofType: string,
  eligibleCrewIds: string[],
  events: CalendarEvent[]
): { startDate: Date; crewName: string | null; crewId: string | null } | null {
  const avoidSaturday = roofType === "shingle";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const searchStart = addDays(today, 1);

  const crewBusyDates: Record<string, Set<string>> = {};
  for (const cid of eligibleCrewIds) {
    crewBusyDates[cid] = new Set();
  }

  for (const ev of events) {
    if (!ev.crew_id || !eligibleCrewIds.includes(ev.crew_id)) continue;
    const start = new Date(ev.start_date + "T00:00:00");
    const end = ev.end_date ? new Date(ev.end_date + "T00:00:00") : start;
    let d = new Date(start);
    while (d <= end) {
      crewBusyDates[ev.crew_id]?.add(dateToStr(d));
      d = addDays(d, 1);
    }
  }

  for (const crewId of eligibleCrewIds) {
    const busy = crewBusyDates[crewId] || new Set();

    for (let offset = 0; offset < 120; offset++) {
      const candidateStart = addDays(searchStart, offset);
      if (!isWeekday(candidateStart)) continue;

      let fits = true;
      for (let d = 0; d < daysNeeded; d++) {
        const workDay = addDays(candidateStart, d);
        if (!isWeekday(workDay)) {
          fits = false;
          break;
        }
        if (avoidSaturday && isSaturday(workDay)) {
          fits = false;
          break;
        }
        if (busy.has(dateToStr(workDay))) {
          fits = false;
          break;
        }
      }

      if (fits) {
        return { startDate: candidateStart, crewId, crewName: null };
      }
    }
  }

  return null;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

interface ScheduleData {
  events: CalendarEvent[];
  crews: Crew[];
  summaryByType: Record<string, { count: number; latestDate: string | null }>;
}

async function fetchScheduleData(
  supabase: any
): Promise<ScheduleData> {
  const today = dateToStr(new Date());

  const [eventsRes, crewsRes] = await Promise.all([
    supabase
      .from("production_calendar_events")
      .select("start_date, end_date, crew_id, roof_type, squares")
      .gte("start_date", today)
      .order("start_date", { ascending: true }),
    supabase
      .from("crews")
      .select("id, name")
      .eq("is_active", true),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (crewsRes.error) throw crewsRes.error;

  const events = (eventsRes.data || []) as CalendarEvent[];
  const crews = (crewsRes.data || []) as Crew[];

  const summaryByType: Record<string, { count: number; latestDate: string | null }> = {};
  for (const type of Object.keys(ROOF_TYPE_LABELS)) {
    summaryByType[type] = { count: 0, latestDate: null };
  }

  for (const ev of events) {
    if (!ev.roof_type || !summaryByType[ev.roof_type]) continue;
    summaryByType[ev.roof_type].count++;
    if (!summaryByType[ev.roof_type].latestDate || ev.start_date > summaryByType[ev.roof_type].latestDate!) {
      summaryByType[ev.roof_type].latestDate = ev.start_date;
    }
  }

  return { events, crews, summaryByType };
}

// ─── Response Builders (Availability Queries) ────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildSpecificTypeReply(
  roofType: string,
  squares: number | null,
  data: ScheduleData
): string {
  const label = ROOF_TYPE_LABELS[roofType] || roofType;
  const summary = data.summaryByType[roofType];
  const daysNeeded = getDaysNeeded(roofType, squares);
  const durationNote = getDurationExplanation(roofType, squares, daysNeeded);

  const eligibleCrews = getCrewsForRoofType(roofType, data.crews);
  if (eligibleCrews.length === 0) {
    return `${durationNote} However, I don't see any active crews assigned to ${label} work right now. Check with the production manager.`;
  }

  const crewNames = eligibleCrews.map((c) => c.name).join(" and ");
  const eligibleIds = eligibleCrews.map((c) => c.id);

  const slot = findNextAvailableSlot(daysNeeded, roofType, eligibleIds, data.events);

  if (!slot) {
    return `${durationNote} Crews that handle ${label}: ${crewNames}. Unfortunately, I couldn't find an open ${daysNeeded}-day slot in the next 4 months. The schedule may be very full — check with the production team.`;
  }

  const crew = data.crews.find((c) => c.id === slot.crewId);
  const crewLabel = crew ? crew.name : "an available crew";
  const dateStr = formatDate(slot.startDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((slot.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const weeksOut = Math.max(1, Math.round(diffDays / 7));

  const jobCount = summary?.count || 0;
  const countNote = jobCount > 0
    ? `We currently have ${jobCount} ${label} job${jobCount !== 1 ? "s" : ""} on the schedule. `
    : "";

  const saturdayNote = roofType === "shingle"
    ? " (avoiding Saturdays unless a Friday job rolls over)"
    : "";

  return (
    `${durationNote} ${countNote}` +
    `The next available ${daysNeeded}-day opening${saturdayNote} is with ${crewLabel}, ` +
    `starting ${dateStr}. That's about ${weeksOut} week${weeksOut !== 1 ? "s" : ""} out.`
  );
}

function buildOverviewReply(data: ScheduleData): string {
  const lines: string[] = [];

  for (const [type, label] of Object.entries(ROOF_TYPE_LABELS)) {
    const summary = data.summaryByType[type];
    const eligibleCrews = getCrewsForRoofType(type, data.crews);
    const eligibleIds = eligibleCrews.map((c) => c.id);
    const defaultDays = getDaysNeeded(type, null);
    const slot = findNextAvailableSlot(defaultDays, type, eligibleIds, data.events);

    const count = summary?.count || 0;
    const countStr = `${count} job${count !== 1 ? "s" : ""} scheduled`;

    if (slot) {
      const today = new Date();
      const diffDays = Math.ceil((slot.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const weeksOut = Math.max(1, Math.round(diffDays / 7));
      lines.push(`• ${label}: ${countStr}, ~${weeksOut} week${weeksOut !== 1 ? "s" : ""} out (next opening ${formatDate(slot.startDate)})`);
    } else if (count === 0) {
      lines.push(`• ${label}: No jobs scheduled — could be available soon.`);
    } else {
      lines.push(`• ${label}: ${countStr}, schedule is very full.`);
    }
  }

  return `Here's a quick overview of the production schedule:\n\n${lines.join("\n")}\n\nAsk about a specific type (with squares) for a more precise estimate!`;
}

function buildFallbackReply(message: string, data: ScheduleData): string {
  const roofType = detectRoofType(message);
  const squares = detectSquares(message);
  const wantsAll = detectAllTypesQuery(message);

  if (roofType) {
    return buildSpecificTypeReply(roofType, squares, data);
  }

  if (wantsAll) {
    return buildOverviewReply(data);
  }

  return "I can help with schedule availability or put a job on the schedule! Try:\n\n• \"How far out on tile, 35 squares?\"\n• \"Schedule a new job\"\n• \"Give me an overview of all types\"";
}

// ─── Scheduling Flow ─────────────────────────────────────────────────────────

interface SchedulingCollected {
  title?: string;
  roof_type?: string;
  squares?: number;
}

interface SchedulingState {
  collected: SchedulingCollected;
  asking_for?: string;
}

function processSchedulingMessage(
  message: string,
  currentState: SchedulingState
): SchedulingState {
  const collected = { ...currentState.collected };
  let extractedRoofType = false;
  let extractedSquares = false;

  if (!collected.roof_type) {
    const rt = detectRoofType(message);
    if (rt) {
      collected.roof_type = rt;
      extractedRoofType = true;
    }
  }

  if (!collected.squares) {
    const sq = detectSquares(message);
    if (sq) {
      collected.squares = sq;
      extractedSquares = true;
    }
    if (!sq && currentState.asking_for === "squares") {
      const bareNum = message.trim().match(/^(\d+)$/);
      if (bareNum) {
        collected.squares = parseInt(bareNum[1], 10);
        extractedSquares = true;
      }
    }
  }

  if (!collected.title && currentState.asking_for === "title") {
    if (!extractedRoofType && !extractedSquares) {
      collected.title = message.trim();
    }
  }

  const missing = getSchedulingMissing(collected);
  let asking_for: string | undefined;
  if (missing.includes("roof_type")) asking_for = "roof_type";
  else if (missing.includes("title")) asking_for = "title";
  else if (missing.includes("squares")) asking_for = "squares";

  return { collected, asking_for };
}

function getSchedulingMissing(collected: SchedulingCollected): string[] {
  const missing: string[] = [];
  if (!collected.roof_type) missing.push("roof_type");
  if (!collected.title) missing.push("title");
  if (!collected.squares) missing.push("squares");
  return missing;
}

function getNextQuestion(askingFor: string | undefined): string {
  switch (askingFor) {
    case "roof_type":
      return "What type of roof? (tile, shingle, foam, or coatings)";
    case "title":
      return "What's the job name or address?";
    case "squares":
      return "How many squares is the job?";
    default:
      return "";
  }
}

function buildCollectedSummary(collected: SchedulingCollected): string {
  const parts: string[] = [];
  if (collected.roof_type) {
    parts.push(ROOF_TYPE_LABELS[collected.roof_type] || collected.roof_type);
  }
  if (collected.title) {
    parts.push(`"${collected.title}"`);
  }
  if (collected.squares) {
    parts.push(`${collected.squares} squares`);
  }
  return parts.length > 0 ? parts.join(", ") + "." : "";
}

function buildSchedulingProposal(
  collected: { title: string; roof_type: string; squares: number },
  data: ScheduleData
): { reply: string; event: Record<string, unknown> | null } {
  const { title, roof_type, squares } = collected;
  const label = ROOF_TYPE_LABELS[roof_type] || roof_type;
  const daysNeeded = getDaysNeeded(roof_type, squares);

  const eligibleCrews = getCrewsForRoofType(roof_type, data.crews);
  if (eligibleCrews.length === 0) {
    return {
      reply: `I don't see any active crews for ${label} work right now. You may need to schedule this one manually or check with the production manager.`,
      event: null,
    };
  }

  const eligibleIds = eligibleCrews.map((c) => c.id);
  const slot = findNextAvailableSlot(daysNeeded, roof_type, eligibleIds, data.events);

  if (!slot) {
    return {
      reply: `I couldn't find an open ${daysNeeded}-day slot for ${label} in the next 4 months. The schedule may be very full — you might need to handle this one manually.`,
      event: null,
    };
  }

  const crew = data.crews.find((c) => c.id === slot.crewId);
  const crewName = crew?.name || "Available crew";
  const startDate = slot.startDate;
  const endDate = daysNeeded > 1 ? addDays(startDate, daysNeeded - 1) : null;

  const event = {
    title,
    start_date: dateToStr(startDate),
    end_date: endDate ? dateToStr(endDate) : null,
    crew_id: slot.crewId,
    crew_name: crewName,
    roof_type,
    squares,
    event_category: "new_install",
  };

  const reply =
    `Here's what I've got:\n\n` +
    `• Job: ${title}\n` +
    `• Type: ${label}\n` +
    `• Squares: ${squares}\n` +
    `• Duration: ${daysNeeded} day${daysNeeded !== 1 ? "s" : ""}\n` +
    `• Crew: ${crewName}\n` +
    `• Start: ${formatDate(startDate)}` +
    (endDate ? `\n• End: ${formatDate(endDate)}` : "") +
    `\n\nShall I put this on the schedule?`;

  return { reply, event };
}

async function insertScheduledEvent(
  supabase: any,
  event: Record<string, unknown>
): Promise<{ eventId: string; error?: string }> {
  const { crew_name: _, ...insertData } = event;

  const { data, error } = await supabase
    .from("production_calendar_events")
    .insert({ ...insertData, all_day: true })
    .select("id")
    .single();

  if (error) return { eventId: "", error: error.message };
  return { eventId: data.id };
}

// ─── OpenAI Integration (availability queries only) ──────────────────────────

async function tryOpenAI(message: string, data: ScheduleData): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const contextLines: string[] = [];
  for (const [type, label] of Object.entries(ROOF_TYPE_LABELS)) {
    const summary = data.summaryByType[type];
    const eligibleCrews = getCrewsForRoofType(type, data.crews);
    const crewNames = eligibleCrews.map((c) => c.name).join(", ");
    const eligibleIds = eligibleCrews.map((c) => c.id);

    const slots: string[] = [];
    for (const days of [1, 2, 3]) {
      const slot = findNextAvailableSlot(days, type, eligibleIds, data.events);
      if (slot) {
        const crew = data.crews.find((c) => c.id === slot.crewId);
        slots.push(`${days}-day job: next opening ${formatDate(slot.startDate)} (${crew?.name || "available crew"})`);
      }
    }

    contextLines.push(
      `${label}: ${summary?.count || 0} jobs scheduled. Crews: ${crewNames || "none"}.\n  ` +
      (slots.length ? slots.join("\n  ") : "No openings found in next 4 months.")
    );
  }

  const systemPrompt = `You are a helpful production schedule assistant for TSM Roofing. Today is ${todayStr}.

CURRENT SCHEDULE DATA:
${contextLines.join("\n\n")}

DURATION RULES:
- Concrete Tile: <=25 sq = 1 day, 25-35 sq = 2 days, 35-50 sq = 3 days, 50-60 sq = 4 days
- Asphalt Shingles: <=40 sq (1-2 layers) = 1 day. Avoid Saturdays unless Friday job rolls over.
- Foam: Day 1 cleaning/prep, Day 2 foam + first coat, Day 3 final coat. 20-40 sq = at least 2 days.
- Coatings: Same timeline as Foam.

CREW ASSIGNMENTS:
- Benjamin and Jimmy: Concrete Tile and Asphalt Shingles only (no foam/coatings)
- Arturo: Foam and Coatings only

RULES:
- Use the schedule data above to answer. Do not make up dates.
- If the user mentions squares, calculate duration and find the right opening.
- Be concise and friendly. 2-3 sentences max.
- Include the approximate date and how many weeks out.
- If the user wants to schedule a job, tell them to use the "Schedule a Job" button or say "schedule a job".`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Request Handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { message, scheduling_state, action, event } = body;

    // ── Confirm & insert ──────────────────────────────────────────────────
    if (action === "confirm_schedule" && event) {
      const result = await insertScheduledEvent(supabase, event);
      if (result.error) {
        return jsonResponse({
          reply: `Sorry, I couldn't save that to the schedule: ${result.error}`,
        });
      }
      const crewLabel = event.crew_name || "the assigned crew";
      const startLabel = (() => {
        try { return formatDate(new Date(event.start_date + "T00:00:00")); }
        catch { return event.start_date; }
      })();
      return jsonResponse({
        reply: `Done! "${event.title}" has been added to the schedule starting ${startLabel} with ${crewLabel}.`,
        action: { type: "scheduled", eventId: result.eventId },
      });
    }

    if (!message || typeof message !== "string") {
      return jsonResponse({
        reply: "Please send a message to get started.",
      });
    }

    const data = await fetchScheduleData(supabase);

    // ── Scheduling flow ───────────────────────────────────────────────────
    if (scheduling_state || detectSchedulingIntent(message)) {
      const prevState: SchedulingState = scheduling_state || {
        collected: {},
        asking_for: undefined,
      };

      const newState = processSchedulingMessage(message, prevState);
      const missing = getSchedulingMissing(newState.collected);

      if (missing.length === 0) {
        const proposal = buildSchedulingProposal(
          newState.collected as { title: string; roof_type: string; squares: number },
          data
        );

        if (proposal.event) {
          return jsonResponse({
            reply: proposal.reply,
            action: { type: "confirm", event: proposal.event },
          });
        }
        return jsonResponse({ reply: proposal.reply });
      }

      const question = getNextQuestion(newState.asking_for);
      const summary = buildCollectedSummary(newState.collected);
      const reply = summary
        ? `Got it — ${summary}\n\n${question}`
        : `Let's get this job scheduled! ${question}`;

      return jsonResponse({
        reply,
        action: {
          type: "collect",
          collected: newState.collected,
          asking_for: newState.asking_for,
        },
      });
    }

    // ── Regular availability query ────────────────────────────────────────
    const aiReply = await tryOpenAI(message, data);
    const reply = aiReply || buildFallbackReply(message, data);

    return jsonResponse({ reply });
  } catch (err) {
    console.error("production-schedule-ai error:", err);
    return jsonResponse(
      { reply: "Sorry, I had trouble checking the schedule. Please try again in a moment." },
      500
    );
  }
});
