import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Clock, RefreshCw, Loader2, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useAdminAuditLog, AUDIT_ACTIONS, OBJECT_TYPES } from "@/hooks/useAdminAuditLog";

interface PendingInvite {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  employee_status: string | null;
}

export function PendingInvites() {
  const queryClient = useQueryClient();
  const { logAction } = useAdminAuditLog();
  const [resendingTo, setResendingTo] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch users who were invited but haven't logged in yet (pending status, no login)
  const { data: pendingInvites, isLoading, refetch } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, employee_status, last_login_at")
        .is("last_login_at", null)
        .eq("employee_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PendingInvite[];
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const handleResendInvite = async (email: string) => {
    setResendingTo(email);
    try {
      const { error } = await supabase.functions.invoke("resend-invite", {
        body: { email },
      });

      if (error) throw error;

      // Audit log - use INVITE_SENT for resent invites too
      logAction.mutate({
        action_type: AUDIT_ACTIONS.INVITE_SENT,
        object_type: OBJECT_TYPES.USER,
        object_id: email,
        new_value: { email },
        notes: `Invite resent to ${email}`,
      });

      toast.success(`Invite resent to ${email}`);
    } catch (error: any) {
      toast.error("Failed to resend invite: " + error.message);
    } finally {
      setResendingTo(null);
    }
  };

  const handleDeleteInvite = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the pending invite for ${email}? This will remove the user account.`)) {
      return;
    }

    setDeletingId(userId);
    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (error) throw error;

      // Audit log
      logAction.mutate({
        action_type: AUDIT_ACTIONS.USER_DELETED,
        object_type: OBJECT_TYPES.USER,
        object_id: userId,
        previous_value: { email },
        notes: `Pending invite deleted for ${email}`,
      });

      toast.success("Pending invite deleted");
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    } catch (error: any) {
      toast.error("Failed to delete invite: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Sent Invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const inviteCount = pendingInvites?.length || 0;

  if (inviteCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="text-sm">No sent invites</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Sent Invites
            <Badge variant="secondary" className="ml-2">
              {inviteCount}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Users who received an invite but haven't logged in yet
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvites?.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {invite.full_name || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvite(invite.email!)}
                      disabled={resendingTo === invite.email}
                      title="Resend invite"
                    >
                      {resendingTo === invite.email ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInvite(invite.id, invite.email!)}
                      disabled={deletingId === invite.id}
                      className="text-destructive hover:text-destructive"
                      title="Delete invite"
                    >
                      {deletingId === invite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
