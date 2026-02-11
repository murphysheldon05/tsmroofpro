import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AccuLynx API base URL
const ACCULYNX_API_BASE = "https://api.acculynx.com/api/v2";

interface AccuLynxCalendar {
  id: string;
  name: string;
}

interface AccuLynxAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  jobId: string;
  jobName: string;
  location: {
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  eventType: string; // "Personal" | "Initial Appointment" | "Material Order" | "Labor Order"
}

// Use maps.google.com instead of www.google.com to avoid ERR_BLOCKED_BY_RESPONSE
function buildMapUrl(addressFull: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(addressFull)}`;
}

function buildAccuLynxJobUrl(jobId: string): string {
  return `https://app.acculynx.com/jobs/${jobId}`;
}

interface AccuLynxLocationAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: {
    id: number;
    name: string;
    abbreviation: string;
  };
  zipCode?: string;
}

interface AccuLynxJob {
  id: string;
  locationAddress?: AccuLynxLocationAddress;
  jobName?: string;
}

async function fetchJobDetails(apiKey: string, jobId: string): Promise<AccuLynxJob | null> {
  console.log(`Fetching job details for job ${jobId}`);
  
  try {
    const response = await fetch(`${ACCULYNX_API_BASE}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AccuLynx job API error for ${jobId}: ${response.status} - ${errorText}`);
      return null;
    }

    const job = await response.json();
    // Log the entire job object to understand its structure
    console.log(`Job ${jobId} FULL response:`, JSON.stringify(job));
    return job;
  } catch (error) {
    console.error(`Failed to fetch job details for ${jobId}:`, error);
    return null;
  }
}

function extractAddressFromJob(job: AccuLynxJob | null, fallbackTitle: string): string {
  if (!job || !job.locationAddress) {
    console.warn(`No job or locationAddress data, using fallback: ${fallbackTitle}`);
    return fallbackTitle || "Address not available";
  }

  const loc = job.locationAddress;
  const addressParts = [
    loc.street1,
    loc.city,
    loc.state?.abbreviation,
    loc.zipCode,
  ].filter(Boolean);

  if (addressParts.length > 0) {
    const fullAddress = addressParts.join(", ");
    console.log(`Extracted address: ${fullAddress}`);
    return fullAddress;
  }

  console.warn(`Empty address parts for job, using fallback: ${fallbackTitle}`);
  return fallbackTitle || "Address not available";
}

function classifyEventType(eventType: string): "DELIVERY" | "LABOR" | "IGNORE" {
  const type = (eventType || "").toLowerCase();

  // Material Order = Delivery (truck icon in AccuLynx)
  if (type.includes("material") || type.includes("delivery")) {
    return "DELIVERY";
  }

  // Labor Order = Build/Install (hammer icon in AccuLynx)
  if (type.includes("labor") || type.includes("install")) {
    return "LABOR";
  }

  // Ignore Personal and Initial Appointment types
  return "IGNORE";
}

// Get today's date in Phoenix timezone (YYYY-MM-DD format)
// Phoenix is MST (UTC-7) year-round, no daylight saving time
function getTodayPhoenix(): string {
  // Create a date string in Phoenix timezone using Intl API
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Phoenix',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // en-CA format gives us YYYY-MM-DD
  return formatter.format(new Date());
}

// Convert a UTC datetime to Phoenix date (YYYY-MM-DD)
function getPhoenixDate(utcDatetime: string): string {
  const date = new Date(utcDatetime);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Phoenix',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

async function fetchCalendars(apiKey: string): Promise<AccuLynxCalendar[]> {
  console.log("Fetching AccuLynx calendars...");
  
  const response = await fetch(`${ACCULYNX_API_BASE}/calendars`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AccuLynx calendars API error: ${response.status} - ${errorText}`);
    throw new Error(`AccuLynx calendars API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Calendars API response:", JSON.stringify(data));
  
  // Handle both array and object with items property
  const calendars = Array.isArray(data) ? data : (data.items || data.calendars || []);
  console.log(`Found ${calendars.length} calendars`);
  return calendars;
}

async function fetchAppointments(
  apiKey: string,
  calendarId: string,
  startDate: string,
  endDate: string
): Promise<AccuLynxAppointment[]> {
  console.log(`Fetching appointments from calendar ${calendarId} for ${startDate} to ${endDate}`);
  
  const url = `${ACCULYNX_API_BASE}/calendars/${calendarId}/appointments?startDate=${startDate}&endDate=${endDate}&pageSize=50`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AccuLynx appointments API error: ${response.status} - ${errorText}`);
    throw new Error(`AccuLynx appointments API error: ${response.status}`);
  }

  const data = await response.json();
  const appointments = data.items || data || [];
  console.log(`Found ${appointments.length} appointments in calendar ${calendarId}`);
  return appointments;
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

    // Get today's date in Phoenix timezone
    const todayDate = getTodayPhoenix();
    console.log(`Syncing AccuLynx for Phoenix date: ${todayDate}`);

    // Step 1: Fetch all calendars
    const calendars = await fetchCalendars(acculynxApiKey);
    
    if (calendars.length === 0) {
      console.log("No calendars found in AccuLynx");
      return new Response(
        JSON.stringify({ success: true, synced: { labor: 0, deliveries: 0 }, message: "No calendars found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Clear existing data (delete ALL rows in these "today" tables)
    const { error: deleteLaborError } = await supabase
      .from("today_labor")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000"); // Matches all UUIDs

    if (deleteLaborError) {
      console.error("Error clearing today_labor:", deleteLaborError);
    } else {
      console.log("Successfully cleared today_labor table");
    }

    const { error: deleteDeliveryError } = await supabase
      .from("today_deliveries")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000"); // Matches all UUIDs

    if (deleteDeliveryError) {
      console.error("Error clearing today_deliveries:", deleteDeliveryError);
    } else {
      console.log("Successfully cleared today_deliveries table");
    }

    let laborCount = 0;
    let deliveryCount = 0;
    let ignoredCount = 0;

    // Step 3: Fetch appointments from all calendars
    for (const calendar of calendars) {
      try {
        const appointments = await fetchAppointments(acculynxApiKey, calendar.id, todayDate, todayDate);

        for (const appt of appointments) {
          // Filter: Only include appointments scheduled for today (Phoenix time)
          const apptPhoenixDate = getPhoenixDate(appt.start);
          if (apptPhoenixDate !== todayDate) {
            console.log(`Skipping appointment ${appt.id} - scheduled for ${apptPhoenixDate}, not today (${todayDate})`);
            ignoredCount++;
            continue;
          }

          const category = classifyEventType(appt.eventType);

          if (category === "IGNORE") {
            ignoredCount++;
            continue;
          }

          // Skip if no job associated
          if (!appt.jobId) {
            console.log(`Skipping appointment ${appt.id} - no job associated`);
            continue;
          }

          // Fetch full job details to get the complete street address
          const job = await fetchJobDetails(acculynxApiKey, appt.jobId);
          const addressFull = extractAddressFromJob(job, appt.title);
          
          const mapUrl = buildMapUrl(addressFull);
          const acculynxJobUrl = buildAccuLynxJobUrl(appt.jobId);

          if (category === "DELIVERY") {
            const { error } = await supabase.from("today_deliveries").upsert(
              {
                job_id: appt.jobId,
                job_name: appt.jobName || appt.title,
                address_full: addressFull,
                scheduled_datetime: appt.start,
                map_url_primary: mapUrl,
                map_url_google: mapUrl,
                acculynx_job_url: acculynxJobUrl,
                source_event_id: appt.id,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "source_event_id" }
            );

            if (error) {
              console.error(`Error inserting delivery for appointment ${appt.id}:`, error);
            } else {
              deliveryCount++;
            }
          } else if (category === "LABOR") {
            console.log(`Inserting labor: ${appt.jobName || appt.title}, address: ${addressFull}, scheduled: ${appt.start}`);
            const { error } = await supabase.from("today_labor").upsert(
              {
                job_id: appt.jobId,
                job_name: appt.jobName || appt.title,
                address_full: addressFull,
                scheduled_datetime: appt.start,
                roof_type: null,
                squares: null,
                map_url_primary: mapUrl,
                map_url_google: mapUrl,
                acculynx_job_url: acculynxJobUrl,
                source_event_id: appt.id,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "source_event_id" }
            );

            if (error) {
              console.error(`Error inserting labor for appointment ${appt.id}:`, error);
            } else {
              laborCount++;
            }
          }
        }
      } catch (calendarError) {
        console.error(`Error processing calendar ${calendar.name}:`, calendarError);
        // Continue with other calendars
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
        calendarsProcessed: calendars.length,
        date: todayDate,
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
