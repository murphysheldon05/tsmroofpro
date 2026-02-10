import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACCULYNX_API_BASE = "https://api.acculynx.com/api/v2";

interface AccuLynxJob {
  id: string;
  jobName?: string;
  milestone?: string;
  salesPerson?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  contractAmount?: number;
  totalContractAmount?: number;
  createdDate?: string;
  milestoneDate?: string;
}

interface JobsResponse {
  items?: AccuLynxJob[];
  totalCount?: number;
}

async function fetchAllJobs(
  apiKey: string,
  startDate: string,
  endDate: string,
  milestones: string
): Promise<AccuLynxJob[]> {
  const allJobs: AccuLynxJob[] = [];
  let pageStart = 0;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `${ACCULYNX_API_BASE}/jobs?startDate=${startDate}&endDate=${endDate}&dateFilterType=CreatedDate&milestones=${milestones}&pageSize=${pageSize}&pageStartIndex=${pageStart}&sortBy=CreatedDate&sortOrder=Descending`;

    console.log(`Fetching jobs page at index ${pageStart}...`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
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
      pageStart += pageSize;
      // Safety limit
      if (pageStart > 10000) hasMore = false;
    }
  }

  return allJobs;
}

// Try to get financials for a job to get contract amount
async function fetchJobFinancials(apiKey: string, jobId: string): Promise<number> {
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}/financials`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return 0;

    const data = await response.json();
    // contractAmount or totalContractAmount from financials
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

    // Fetch approved/completed/invoiced/closed jobs (milestones that represent sold jobs)
    const jobs = await fetchAllJobs(
      acculynxApiKey,
      startDate,
      endDate,
      "approved,completed,invoiced,closed"
    );

    console.log(`Found ${jobs.length} jobs from AccuLynx`);

    // Log first job to see the structure
    if (jobs.length > 0) {
      console.log("Sample job structure:", JSON.stringify(jobs[0]));
    }

    // Get profiles from supabase for email matching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("employee_status", "active");

    // Build email -> profile map
    const emailToProfile = new Map<string, { id: string; name: string }>();
    (profiles || []).forEach((p) => {
      if (p.email) {
        emailToProfile.set(p.email.toLowerCase(), {
          id: p.id,
          name: p.full_name || p.email,
        });
      }
    });

    // Aggregate by sales person email
    const repTotals = new Map<string, { repId: string; repName: string; total: number }>();

    // Initialize all profiles with 0
    emailToProfile.forEach((profile) => {
      repTotals.set(profile.id, {
        repId: profile.id,
        repName: profile.name,
        total: 0,
      });
    });

    let matchedJobs = 0;
    let unmatchedJobs = 0;

    for (const job of jobs) {
      const spEmail = job.salesPerson?.email?.toLowerCase();
      if (!spEmail) {
        unmatchedJobs++;
        continue;
      }

      const profile = emailToProfile.get(spEmail);
      if (!profile) {
        unmatchedJobs++;
        continue;
      }

      // Use contractAmount or totalContractAmount from the job object
      const amount = job.contractAmount || job.totalContractAmount || 0;

      const existing = repTotals.get(profile.id);
      if (existing) {
        existing.total += amount;
      } else {
        repTotals.set(profile.id, {
          repId: profile.id,
          repName: profile.name,
          total: amount,
        });
      }
      matchedJobs++;
    }

    console.log(`Matched ${matchedJobs} jobs, unmatched ${unmatchedJobs}`);

    // Sort descending
    const entries = Array.from(repTotals.values()).sort((a, b) => b.total - a.total);

    return new Response(
      JSON.stringify({
        success: true,
        entries,
        totalJobs: jobs.length,
        matchedJobs,
        unmatchedJobs,
      }),
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
