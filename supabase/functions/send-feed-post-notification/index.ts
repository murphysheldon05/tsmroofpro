import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://tsmroofpro.com";

function buildTitle(postType: string, authorName: string) {
  switch (postType) {
    case "win":
      return `${authorName} shared a new win`;
    case "announcement":
      return `${authorName} posted an announcement`;
    default:
      return `${authorName} shared a team update`;
  }
}

function buildExcerpt(content: string) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const postId = body?.post_id as string | undefined;

    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing post_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: post, error: postError } = await serviceClient
      .from("feed_posts")
      .select(
        `
          id,
          author_id,
          post_type,
          content,
          author:profiles!feed_posts_author_id_fkey(full_name)
        `
      )
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw postError ?? new Error("Feed post not found");
    }

    if (post.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authorName = post.author?.full_name?.trim() || "A teammate";
    const title = buildTitle(post.post_type, authorName);
    const message = buildExcerpt(post.content);
    const targetUrl = `${APP_URL}/command-center#feed-post-${post.id}`;

    const { data: profiles, error: profilesError } = await serviceClient
      .from("profiles")
      .select("id, employee_status, is_approved")
      .neq("id", post.author_id);

    if (profilesError) throw profilesError;

    const recipientIds = (profiles ?? [])
      .filter((profile) => profile.employee_status !== "inactive" && profile.is_approved !== false)
      .map((profile) => profile.id);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, recipients: 0 }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const notificationRows = recipientIds.map((recipientId) => ({
      user_id: recipientId,
      notification_type: "feed_post",
      title,
      message,
      entity_type: "feed_post",
      entity_id: post.id,
    }));

    const { error: notificationError } = await serviceClient
      .from("user_notifications")
      .insert(notificationRows);

    if (notificationError) throw notificationError;

    const publicVapidKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateVapidKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (publicVapidKey && privateVapidKey) {
      webpush.setVapidDetails("mailto:info@tsmroofing.com", publicVapidKey, privateVapidKey);

      const { data: subscriptions, error: subscriptionError } = await serviceClient
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .in("user_id", recipientIds);

      if (subscriptionError) throw subscriptionError;

      const staleSubscriptionIds: string[] = [];
      const pushPayload = JSON.stringify({
        title,
        body: message,
        url: targetUrl,
        tag: `feed-post-${post.id}`,
      });

      await Promise.allSettled(
        (subscriptions ?? []).map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              pushPayload
            );
          } catch (error) {
            console.error("push delivery failed:", error);
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              staleSubscriptionIds.push(subscription.id);
            }
          }
        })
      );

      if (staleSubscriptionIds.length > 0) {
        await serviceClient.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
      }
    }

    return new Response(JSON.stringify({ success: true, recipients: recipientIds.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-feed-post-notification error:", error);
    return new Response(JSON.stringify({ error: "Failed to send feed notifications" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
