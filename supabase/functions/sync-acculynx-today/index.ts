import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AccuLynx API base URL
const ACCULYNX_API_BASE = "https://api.acculynx.com/api/v2";

interface AccuLynxEvent {
  id: string;
  jobId: string;
  scheduledDateTime: string;
  icon?: string;
  eventIcon?: string;
  type?: string;
  category?: string;
  title?: string;
}

interface AccuLynxJob {
  id: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
}

function buildMapUrl(addressFull: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFull)}`;
}

function buildAccuLynxJobUrl(jobId: string): string {
  return `https://app.acculynx.com/jobs/${jobId}`;
}

function classifyByIcon(event: AccuLynxEvent): "DELIVERY" | "LABOR" | "IGNORE" {
  const icon = (event.icon || event.eventIcon || "").toLowerCase();
  const type = (event.type || event.category || "").toLowerCase();

  if (icon.includes("truck") || type.includes("delivery")) {
    return "DELIVERY";
  }

  if (icon.includes("hammer") || type.includes("labor") || type.includes("install")) {
    return "LABOR";
  }

  return "IGNORE";
}

// Get today's date range in Phoenix timezone
function getTodayRangePhoenix(): { start: string; end: string } {
  // Phoenix is UTC-7 (no DST)
  const now = new Date();
  const phoenixOffset = -7 * 60; // minutes
  const localOffset = now.getTimezoneOffset();
  const phoenixTime = new Date(now.getTime() + (localOffset + phoenixOffset) * 60 * 1000);

  const year = phoenixTime.getFullYear();
  const month = String(phoenixTime.getMonth() + 1).padStart(2, "0");
  const day = String(phoenixTime.getDate()).padStart(2, "0");

  return {
    start: `${year}-${month}-${day}T00:00:00`,
    end: `${year}-${month}-${day}T23:59:59`,
  };
}

async function fetchAccuLynxEvents(apiKey: string, dateStart: string, dateEnd: string): Promise<AccuLynxEvent[]> {
  console.log(`Fetching AccuLynx events from ${dateStart} to ${dateEnd}`);
  
  const response = await fetch(
    `${ACCULYNX_API_BASE}/scheduler/events?startDate=${encodeURIComponent(dateStart)}&endDate=${encodeURIComponent(dateEnd)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AccuLynx API error: ${response.status} - ${errorText}`);
    throw new Error(`AccuLynx API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Fetched ${data.length || 0} events from AccuLynx`);
  return data || [];
}

async function fetchAccuLynxJob(apiKey: string, jobId: string): Promise<AccuLynxJob | null> {
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch job ${jobId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const acculynxApiKey = Deno.env.get("ACCULYNX_API_KEY");
    if (!acculynxApiKey) {
      console.error("ACCULYNX_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AccuLynx API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date range in Phoenix timezone
    const { start: todayStart, end: todayEnd } = getTodayRangePhoenix();
    console.log(`Syncing AccuLynx for Phoenix date range: ${todayStart} to ${todayEnd}`);

    // Fetch events from AccuLynx
    const events = await fetchAccuLynxEvents(acculynxApiKey, todayStart, todayEnd);

    // Clear existing data for today
    const { error: deleteLaborError } = await supabase
      .from("today_labor")
      .delete()
      .gte("scheduled_datetime", todayStart)
      .lte("scheduled_datetime", todayEnd);

    if (deleteLaborError) {
      console.error("Error clearing today_labor:", deleteLaborError);
    }

    const { error: deleteDeliveryError } = await supabase
      .from("today_deliveries")
      .delete()
      .gte("scheduled_datetime", todayStart)
      .lte("scheduled_datetime", todayEnd);

    if (deleteDeliveryError) {
      console.error("Error clearing today_deliveries:", deleteDeliveryError);
    }

    let laborCount = 0;
    let deliveryCount = 0;
    let ignoredCount = 0;

    // Process each event
    for (const event of events) {
      const category = classifyByIcon(event);

      if (category === "IGNORE") {
        ignoredCount++;
        continue;
      }

      // Fetch job details
      const job = await fetchAccuLynxJob(acculynxApiKey, event.jobId);
      if (!job) {
        console.warn(`Skipping event ${event.id} - could not fetch job ${event.jobId}`);
        continue;
      }

      const addressFull = `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.zip}`;
      const mapUrl = buildMapUrl(addressFull);
      const acculynxJobUrl = buildAccuLynxJobUrl(event.jobId);

      if (category === "DELIVERY") {
        const { error } = await supabase.from("today_deliveries").upsert(
          {
            job_id: event.jobId,
            job_name: job.name,
            address_full: addressFull,
            scheduled_datetime: event.scheduledDateTime,
            map_url: mapUrl,
            acculynx_job_url: acculynxJobUrl,
            source_event_id: event.id,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "source_event_id" }
        );

        if (error) {
          console.error(`Error inserting delivery for event ${event.id}:`, error);
        } else {
          deliveryCount++;
        }
      } else if (category === "LABOR") {
        const { error } = await supabase.from("today_labor").upsert(
          {
            job_id: event.jobId,
            job_name: job.name,
            address_full: addressFull,
            scheduled_datetime: event.scheduledDateTime,
            roof_type: null,
            squares: null,
            map_url: mapUrl,
            acculynx_job_url: acculynxJobUrl,
            source_event_id: event.id,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "source_event_id" }
        );

        if (error) {
          console.error(`Error inserting labor for event ${event.id}:`, error);
        } else {
          laborCount++;
        }
      }
    }

    console.log(`Sync complete: ${laborCount} labor, ${deliveryCount} deliveries, ${ignoredCount} ignored`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          labor: laborCount,
          deliveries: deliveryCount,
          ignored: ignoredCount,
        },
        dateRange: { start: todayStart, end: todayEnd },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
