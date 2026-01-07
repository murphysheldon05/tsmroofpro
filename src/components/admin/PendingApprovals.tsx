import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PendingUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export function PendingApprovals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingUser[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("User approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error("Failed to approve user: " + error.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reject and delete ${userName || "this user"}? This cannot be undone.`)) {
      return;
    }

    setRejectingId(userId);
    try {
      // Delete user via edge function
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (error) throw error;

      toast.success("User rejected and removed");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error("Failed to reject user: " + error.message);
    } finally {
      setRejectingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserPlus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p>No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
          <Clock className="w-3 h-3" />
          {pendingUsers.length} Pending
        </Badge>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                User
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                Signed Up
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((pendingUser, index) => (
              <tr
                key={pendingUser.id}
                className={index < pendingUsers.length - 1 ? "border-b border-border/30" : ""}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    {pendingUser.full_name || "—"}
                  </p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {pendingUser.email}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-sm">
                  {new Date(pendingUser.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={approvingId === pendingUser.id || rejectingId === pendingUser.id}
                    >
                      {approvingId === pendingUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleReject(pendingUser.id, pendingUser.full_name || pendingUser.email || "")}
                      disabled={approvingId === pendingUser.id || rejectingId === pendingUser.id}
                    >
                      {rejectingId === pendingUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
