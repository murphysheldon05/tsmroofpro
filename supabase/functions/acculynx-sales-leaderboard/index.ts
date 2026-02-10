import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACCULYNX_API_BASE = "https://api.acculynx.com/api/v2";

interface AccuLynxJob {
  id: string;
  jobName?: string;
  currentMilestone?: string;
  contractAmount?: number;
  totalContractAmount?: number;
  createdDate?: string;
  milestoneDate?: string;
}

interface AccuLynxUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Cache user lookups to avoid redundant API calls
const userCache = new Map<string, AccuLynxUser | null>();

async function fetchAllJobs(apiKey: string, startDate: string, endDate: string): Promise<AccuLynxJob[]> {
  const allJobs: AccuLynxJob[] = [];
  let pageStart = 0;
  const pageSize = 25;
  let hasMore = true;

  while (hasMore) {
    const url = `${ACCULYNX_API_BASE}/jobs?startDate=${startDate}&endDate=${endDate}&pageSize=${pageSize}&pageStartIndex=${pageStart}&sortBy=CreatedDate&sortOrder=Descending`;
    console.log(`Fetching jobs page at index ${pageStart}...`);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AccuLynx jobs API error: ${response.status} - ${errorText}`);
      throw new Error(`AccuLynx jobs API error: ${response.status}`);
    }

    const data = await response.json();
    const items: AccuLynxJob[] = data.items || data || [];

    if (items.length === 0) {
      hasMore = false;
    } else {
      allJobs.push(...items);
      if (items.length < pageSize) hasMore = false;
      else {
        pageStart += pageSize;
        if (pageStart > 10000) hasMore = false;
      }
    }
  }
  return allJobs;
}

async function fetchUser(apiKey: string, userId: string): Promise<AccuLynxUser | null> {
  if (userCache.has(userId)) return userCache.get(userId)!;

  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) {
      userCache.set(userId, null);
      return null;
    }
    const data = await response.json();
    const user = data as AccuLynxUser;
    userCache.set(userId, user);
    return user;
  } catch {
    userCache.set(userId, null);
    return null;
  }
}

async function fetchJobRepEmail(apiKey: string, jobId: string): Promise<string | null> {
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}/representatives`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const items = data.items || data || [];
    if (!Array.isArray(items) || items.length === 0) return null;

    // Get the first company representative's user
    const rep = items[0];
    const userLink = rep?.user?._link;
    const userId = rep?.user?.id;

    if (!userId && !userLink) return null;

    // Resolve user to get email
    const resolvedId = userId || userLink?.split("/").pop();
    if (!resolvedId) return null;

    const user = await fetchUser(apiKey, resolvedId);
    if (user?.email) {
      console.log(`Job ${jobId} rep: ${user.firstName} ${user.lastName} <${user.email}>`);
    }
    return user?.email?.toLowerCase() || null;
  } catch {
    return null;
  }
}

async function fetchJobFinancials(apiKey: string, jobId: string): Promise<number> {
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}/financials`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) return 0;
    const data = await response.json();
    return data.contractAmount || data.totalContractAmount || 0;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const acculynxApiKey = Deno.env.get("ACCULYNX_API_KEY");
    if (!acculynxApiKey) {
      return new Response(
        JSON.stringify({ error: "acculynx_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { startDate, endDate } = await req.json();
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "startDate and endDate are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching AccuLynx sales data: ${startDate} to ${endDate}`);
    // Clear user cache per request
    userCache.clear();

    const jobs = await fetchAllJobs(acculynxApiKey, startDate, endDate);
    console.log(`Found ${jobs.length} jobs from AccuLynx`);

    // Get profiles from supabase for email matching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("employee_status", "active");

    const emailToProfile = new Map<string, { id: string; name: string }>();
    (profiles || []).forEach((p) => {
      if (p.email) {
        emailToProfile.set(p.email.toLowerCase(), { id: p.id, name: p.full_name || p.email });
      }
    });

    const repTotals = new Map<string, { repId: string; repName: string; total: number }>();
    emailToProfile.forEach((profile) => {
      repTotals.set(profile.id, { repId: profile.id, repName: profile.name, total: 0 });
    });

    let matchedJobs = 0;
    let unmatchedJobs = 0;

    // Process jobs in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (job) => {
          const [repEmail, financialAmount] = await Promise.all([
            fetchJobRepEmail(acculynxApiKey, job.id),
            fetchJobFinancials(acculynxApiKey, job.id),
          ]);
          return { job, repEmail, financialAmount };
        })
      );

      for (const { job, repEmail, financialAmount } of results) {
        if (!repEmail) {
          unmatchedJobs++;
          continue;
        }

        const profile = emailToProfile.get(repEmail);
        if (!profile) {
          console.log(`Unmatched AccuLynx rep email: ${repEmail}`);
          unmatchedJobs++;
          continue;
        }

        const amount = financialAmount || job.contractAmount || job.totalContractAmount || 0;
        const existing = repTotals.get(profile.id);
        if (existing) existing.total += amount;
        matchedJobs++;
      }
    }

    console.log(`Matched ${matchedJobs} jobs, unmatched ${unmatchedJobs}`);

    const entries = Array.from(repTotals.values()).sort((a, b) => b.total - a.total);

    return new Response(
      JSON.stringify({ success: true, entries, totalJobs: jobs.length, matchedJobs, unmatchedJobs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AccuLynx sales leaderboard error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
