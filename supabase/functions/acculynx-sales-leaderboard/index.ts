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

interface SalesOwner {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

async function fetchAllJobs(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<AccuLynxJob[]> {
  const allJobs: AccuLynxJob[] = [];
  let pageStart = 0;
  const pageSize = 25;
  let hasMore = true;

  while (hasMore) {
    const url = `${ACCULYNX_API_BASE}/jobs?startDate=${startDate}&endDate=${endDate}&pageSize=${pageSize}&pageStartIndex=${pageStart}&sortBy=CreatedDate&sortOrder=Descending`;

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
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        pageStart += pageSize;
        if (pageStart > 10000) hasMore = false;
      }
    }
  }

  return allJobs;
}

async function fetchSalesOwner(apiKey: string, jobId: string): Promise<SalesOwner | null> {
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}/representatives/sales-owner`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`Sales owner fetch failed for job ${jobId}: ${response.status} - ${text.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    console.log(`Sales owner for job ${jobId}: ${JSON.stringify(data)}`);
    return data as SalesOwner;
  } catch (e) {
    console.log(`Sales owner exception for job ${jobId}: ${e}`);
    return null;
  }
}

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

    const jobs = await fetchAllJobs(acculynxApiKey, startDate, endDate);

    console.log(`Found ${jobs.length} jobs from AccuLynx`);

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

    // Aggregate by sales owner email
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

    // Fetch sales owner and financials for each job in parallel (batched)
    const BATCH_SIZE = 10;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (job) => {
          const [salesOwner, financialAmount] = await Promise.all([
            fetchSalesOwner(acculynxApiKey, job.id),
            fetchJobFinancials(acculynxApiKey, job.id),
          ]);
          return { job, salesOwner, financialAmount };
        })
      );

      for (const { job, salesOwner, financialAmount } of results) {
        const spEmail = salesOwner?.email?.toLowerCase();
        if (!spEmail) {
          unmatchedJobs++;
          continue;
        }

        const profile = emailToProfile.get(spEmail);
        if (!profile) {
          console.log(`Unmatched sales owner email: ${spEmail}`);
          unmatchedJobs++;
          continue;
        }

        const amount = financialAmount || job.contractAmount || job.totalContractAmount || 0;

        const existing = repTotals.get(profile.id);
        if (existing) {
          existing.total += amount;
        }
        matchedJobs++;
      }
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
