import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeleteUserPayload {
  user_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await anon.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = authData.user;

    // Check if caller is admin
    const { data: isAdmin, error: roleCheckError } = await anon.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleCheckError) {
      console.error("Role check error:", roleCheckError);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: DeleteUserPayload = await req.json();
    const userId = payload.user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Clear manager_id references in other profiles first
    await admin.from("profiles").update({ manager_id: null }).eq("manager_id", userId);
    console.log("Cleared manager references for:", userId);

    // Clear references in requests table
    await admin.from("requests").update({ assigned_to: null }).eq("assigned_to", userId);
    await admin.from("requests").update({ assigned_manager_id: null }).eq("assigned_manager_id", userId);
    await admin.from("requests").update({ submitted_by: null }).eq("submitted_by", userId);
    console.log("Cleared request references for:", userId);

    // Clear references in commission_submissions
    await admin.from("commission_submissions").update({ submitted_by: null }).eq("submitted_by", userId);
    await admin.from("commission_submissions").update({ sales_rep_id: null }).eq("sales_rep_id", userId);
    await admin.from("commission_submissions").update({ approved_by: null }).eq("approved_by", userId);
    await admin.from("commission_submissions").update({ manager_approved_by: null }).eq("manager_approved_by", userId);
    await admin.from("commission_submissions").update({ paid_by: null }).eq("paid_by", userId);
    console.log("Cleared commission submission references for:", userId);

    // Clear references in commission_documents
    await admin.from("commission_documents").update({ created_by: null }).eq("created_by", userId);
    await admin.from("commission_documents").update({ approved_by: null }).eq("approved_by", userId);
    console.log("Cleared commission document references for:", userId);

    // Clear references in warranty_requests if exists
    await admin.from("warranty_requests").update({ submitted_by: null }).eq("submitted_by", userId);
    await admin.from("warranty_requests").update({ assigned_to: null }).eq("assigned_to", userId);
    console.log("Cleared warranty references for:", userId);

    // Clear department_managers
    await admin.from("department_managers").delete().eq("manager_id", userId);
    console.log("Cleared department manager references for:", userId);

    // Delete team_assignments where user is employee or manager
    await admin.from("team_assignments").delete().eq("employee_id", userId);
    await admin.from("team_assignments").delete().eq("manager_id", userId);
    console.log("Deleted team assignments for:", userId);

    // Delete user_commission_tiers
    await admin.from("user_commission_tiers").delete().eq("user_id", userId);
    console.log("Deleted commission tiers for:", userId);

    // Delete user_files
    await admin.from("user_files").delete().eq("user_id", userId);
    console.log("Deleted user files for:", userId);

    // Delete from user_roles
    await admin.from("user_roles").delete().eq("user_id", userId);
    console.log("Deleted user roles for:", userId);

    // Delete from user_permissions
    await admin.from("user_permissions").delete().eq("user_id", userId);
    console.log("Deleted user permissions for:", userId);

    // Delete from pending_approvals (for invited users who haven't completed signup)
    await admin.from("pending_approvals").delete().eq("entity_id", userId);
    console.log("Deleted pending approvals for:", userId);

    // Delete from profiles
    await admin.from("profiles").delete().eq("id", userId);
    console.log("Deleted profile for:", userId);

    // Delete the auth user - don't fail if user doesn't exist in auth
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // Log the error but don't fail - the profile is already deleted
      // This can happen if the auth user was already deleted or never fully created
      console.warn("Auth user delete warning (non-fatal):", deleteError.message);
      
      // Only fail if it's NOT a "user not found" type error
      const errorMsg = deleteError.message?.toLowerCase() || "";
      if (!errorMsg.includes("not found") && !errorMsg.includes("does not exist")) {
        return new Response(JSON.stringify({ error: deleteError.message ?? "Failed to delete user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Successfully deleted user:", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("admin-delete-user error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
