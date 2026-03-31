import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScheduleSummary {
  roof_type: string;
  label: string;
  upcoming_count: number;
  earliest_date: string | null;
  latest_date: string | null;
}

const ROOF_TYPE_LABELS: Record<string, string> = {
  tile: "Concrete Tile",
  shingle: "Asphalt Shingles",
  foam: "Foam",
  coatings: "Coatings",
};

const ROOF_TYPE_KEYWORDS: Record<string, string[]> = {
  tile: ["tile", "concrete", "concrete tile"],
  shingle: ["shingle", "shingles", "asphalt", "asphalt shingle", "asphalt shingles"],
  foam: ["foam", "spray foam", "spf"],
  coatings: ["coating", "coatings", "coat"],
};

function detectRoofType(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [type, keywords] of Object.entries(ROOF_TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return type;
    }
  }
  return null;
}

function detectAllTypesQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("all") ||
    lower.includes("everything") ||
    lower.includes("each") ||
    lower.includes("every type") ||
    lower.includes("overview") ||
    lower.includes("summary")
  );
}

async function getScheduleSummaries(
  supabase: ReturnType<typeof createClient>,
  roofType?: string | null
): Promise<ScheduleSummary[]> {
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("production_calendar_events")
    .select("roof_type, start_date")
    .gte("start_date", today)
    .not("roof_type", "is", null)
    .order("start_date", { ascending: true });

  if (roofType) {
    query = query.eq("roof_type", roofType);
  }

  const { data: events, error } = await query;
  if (error) throw error;

  const grouped: Record<
    string,
    { count: number; earliest: string | null; latest: string | null }
  > = {};

  for (const type of Object.keys(ROOF_TYPE_LABELS)) {
    grouped[type] = { count: 0, earliest: null, latest: null };
  }

  for (const event of events || []) {
    const rt = event.roof_type as string;
    if (!grouped[rt]) continue;
    grouped[rt].count++;
    if (!grouped[rt].earliest || event.start_date < grouped[rt].earliest!) {
      grouped[rt].earliest = event.start_date;
    }
    if (!grouped[rt].latest || event.start_date > grouped[rt].latest!) {
      grouped[rt].latest = event.start_date;
    }
  }

  return Object.entries(grouped).map(([type, data]) => ({
    roof_type: type,
    label: ROOF_TYPE_LABELS[type] || type,
    upcoming_count: data.count,
    earliest_date: data.earliest,
    latest_date: data.latest,
  }));
}

// ─── Placeholder logic: replace with custom rules per product type ───
// The user will provide specific scheduling logic for each roof type.
// For now, we use a simple "last scheduled date + buffer" approach.
function computeApproximateDate(summary: ScheduleSummary): string {
  if (summary.upcoming_count === 0) {
    return "There are no upcoming jobs scheduled — we could potentially fit one in soon.";
  }

  const latest = new Date(summary.latest_date!);
  const today = new Date();
  const diffDays = Math.ceil(
    (latest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksOut = Math.ceil(diffDays / 7);

  const nextAvailable = new Date(latest);
  nextAvailable.setDate(nextAvailable.getDate() + 2);
  const formatted = nextAvailable.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    `We have ${summary.upcoming_count} ${summary.label} job${summary.upcoming_count !== 1 ? "s" : ""} ` +
    `on the schedule. We're currently booked about ${weeksOut} week${weeksOut !== 1 ? "s" : ""} out. ` +
    `The earliest available slot for a new ${summary.label} job would be approximately ${formatted}.`
  );
}
// ─── End placeholder logic ───

function buildFallbackReply(
  message: string,
  summaries: ScheduleSummary[]
): string {
  const specificType = detectRoofType(message);
  const wantsAll = detectAllTypesQuery(message);

  if (specificType) {
    const summary = summaries.find((s) => s.roof_type === specificType);
    if (!summary) return `I don't have schedule data for that product type.`;
    return computeApproximateDate(summary);
  }

  if (wantsAll || !specificType) {
    const lines = summaries.map((s) => {
      if (s.upcoming_count === 0) return `• **${s.label}**: No jobs scheduled — available now.`;
      const latest = new Date(s.latest_date!);
      const today = new Date();
      const weeksOut = Math.ceil(
        (latest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      return `• **${s.label}**: ${s.upcoming_count} job${s.upcoming_count !== 1 ? "s" : ""} scheduled, ~${weeksOut} week${weeksOut !== 1 ? "s" : ""} out.`;
    });
    return `Here's a quick overview of the production schedule:\n\n${lines.join("\n")}\n\nAsk about a specific type for more detail!`;
  }

  return "I can help with schedule availability! Try asking about a specific roof type: tile, shingle, foam, or coatings.";
}

async function tryOpenAI(
  message: string,
  summaries: ScheduleSummary[]
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const scheduleContext = summaries
    .map((s) => {
      if (s.upcoming_count === 0) return `${s.label}: 0 jobs scheduled.`;
      return `${s.label}: ${s.upcoming_count} jobs, earliest ${s.earliest_date}, latest ${s.latest_date}.`;
    })
    .join("\n");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
          {
            role: "system",
            content: `You are a helpful production schedule assistant for TSM Roofing. Today is ${today}.

Current production schedule data:
${scheduleContext}

Rules:
- Answer questions about how far out we are on each product type.
- Give approximate dates for the next available slot (latest scheduled date + a small buffer).
- Be concise, friendly, and professional.
- If the user asks about a type with 0 jobs, let them know we could potentially schedule soon.
- Do not make up data; only use what's provided above.
- Keep responses to 2-3 sentences max.`,
          },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ reply: "Please send a message to get started." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summaries = await getScheduleSummaries(supabase);

    // Try OpenAI first, fall back to keyword-based logic
    const aiReply = await tryOpenAI(message, summaries);
    const reply = aiReply || buildFallbackReply(message, summaries);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("production-schedule-ai error:", err);
    return new Response(
      JSON.stringify({
        reply:
          "Sorry, I had trouble checking the schedule. Please try again in a moment.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
