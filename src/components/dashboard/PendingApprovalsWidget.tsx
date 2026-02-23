import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDisplayName } from "@/lib/displayName";
import { formatDistanceToNow } from "date-fns";

const requestTypeLabels: Record<string, string> = {
  sop_update: "SOP Update",
  it_access: "IT Access",
  hr: "HR Request",
};

export function PendingApprovalsWidget() {
  const { user } = useAuth();

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_role", { _user_id: user?.id });
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["pendingRequests"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch profiles for submitters
      const submitterIds = [...new Set(requests?.map((r) => r.submitted_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", submitterIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return requests?.map((r) => {
        const p = profileMap.get(r.submitted_by);
        return {
          ...r,
          submitter_name: formatDisplayName(p?.full_name, p?.email) || "Unknown",
        };
      });
    },
    enabled: userRole === "admin" || userRole === "manager",
  });

  // Only show for managers and admins, and only when there are pending items
  if (userRole !== "admin" && userRole !== "manager") {
    return null;
  }

  // Don't show the widget at all if there are no pending requests
  const pendingCount = pendingRequests?.length || 0;
  if (!isLoading && pendingCount === 0) {
    return null;
  }

  return (
    <Card variant="neon">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
            <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-primary/15 text-primary border border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {pendingRequests?.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-primary/10 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{request.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{requestTypeLabels[request.type] || request.type}</span>
                      <span>•</span>
                      <span>{request.submitter_name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="neon" size="sm" className="w-full" asChild>
              <Link to="/requests" className="flex items-center gap-2">
                View all requests
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
