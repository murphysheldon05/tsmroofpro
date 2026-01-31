import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Mail,
  RefreshCw,
  Users,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { SOPMASTER_VERSION, SOPMASTER_SUMMARY } from "@/lib/sopMasterConstants";

// Fetch all active users with their acknowledgment status
function useAcknowledgmentStatus() {
  return useQuery({
    queryKey: ["acknowledgment-status", SOPMASTER_VERSION],
    queryFn: async () => {
      // Get all active users with department info
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          email, 
          role_title, 
          last_login_at,
          departments:department_id (name)
        `)
        .eq("employee_status", "active")
        .order("full_name");

      if (usersError) throw usersError;

      // Get all acknowledgments for current version
      const { data: acks, error: acksError } = await supabase
        .from("sop_acknowledgments")
        .select("user_id, acknowledged_at, version, method")
        .eq("sop_key", "SOPMASTER")
        .eq("version", SOPMASTER_VERSION);

      if (acksError) throw acksError;

      const ackMap = new Map(acks?.map((a) => [a.user_id, a]) || []);

      const acknowledged: Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        department: string | null;
        acknowledged_at: string;
        version: string;
        method: string;
      }> = [];

      const unacknowledged: Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        department: string | null;
        last_login_at: string | null;
      }> = [];

      users?.forEach((user) => {
        const ack = ackMap.get(user.id);
        const deptName = (user.departments as any)?.name || null;
        
        if (ack) {
          acknowledged.push({
            id: user.id,
            full_name: user.full_name || "Unknown",
            email: user.email || "",
            role: user.role_title || "user",
            department: deptName,
            acknowledged_at: ack.acknowledged_at,
            version: ack.version,
            method: ack.method,
          });
        } else {
          unacknowledged.push({
            id: user.id,
            full_name: user.full_name || "Unknown",
            email: user.email || "",
            role: user.role_title || "user",
            department: deptName,
            last_login_at: user.last_login_at,
          });
        }
      });

      return {
        acknowledged,
        unacknowledged,
        totalUsers: users?.length || 0,
      };
    },
  });
}

export function AcknowledgmentsTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAcknowledgmentStatus();
  const [confirmVersionOpen, setConfirmVersionOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!data) return { total: 0, acknowledged: 0, pending: 0, percentage: 0 };
    const total = data.totalUsers;
    const acknowledged = data.acknowledged.length;
    const pending = data.unacknowledged.length;
    const percentage = total > 0 ? Math.round((acknowledged / total) * 100) : 0;
    return { total, acknowledged, pending, percentage };
  }, [data]);

  const handleSendReminder = async (userId: string, email: string) => {
    setSendingReminder(userId);
    try {
      // Here you could integrate with an email notification system
      // For now, we'll just show a toast that the reminder would be sent
      toast.success(`Reminder would be sent to ${email}`);
      
      // Log the action
      await supabase.from("compliance_audit_log").insert({
        action: "send_sop_reminder",
        target_type: "user",
        target_id: userId,
        metadata: { email, sop_version: SOPMASTER_VERSION },
      });
    } catch (error: any) {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleIncrementVersion = async () => {
    // This would need to be handled server-side or through admin config
    // For now, we show a toast explaining the limitation
    toast.info(
      "Version management requires a code deployment. Contact system administrator to update SOPMASTER_VERSION."
    );
    setConfirmVersionOpen(false);
    
    // Log the attempt
    await supabase.from("compliance_audit_log").insert({
      action: "attempt_version_increment",
      target_type: "sop",
      target_id: "SOPMASTER",
      metadata: { current_version: SOPMASTER_VERSION },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.acknowledged}{" "}
                  <span className="text-sm font-normal">({stats.percentage}%)</span>
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unacknowledged Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            Unacknowledged Users ({data?.unacknowledged.length || 0})
          </CardTitle>
          <CardDescription>
            Users who have not yet acknowledged SOPMASTER version {SOPMASTER_VERSION}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.unacknowledged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-muted-foreground">All users have acknowledged!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.unacknowledged.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department || "—"}</TableCell>
                      <TableCell>
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(user.id, user.email)}
                          disabled={sendingReminder === user.id}
                        >
                          {sendingReminder === user.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Reminder</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acknowledged Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Acknowledged Users ({data?.acknowledged.length || 0})
          </CardTitle>
          <CardDescription>
            Users who have acknowledged the current SOPMASTER version
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.acknowledged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mb-2" />
              <p className="text-muted-foreground">No users have acknowledged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Acknowledged At</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.acknowledged
                    .sort(
                      (a, b) =>
                        new Date(b.acknowledged_at).getTime() -
                        new Date(a.acknowledged_at).getTime()
                    )
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.acknowledged_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.version}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{user.method}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Management - Admin Only */}
      {isAdmin && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Version Management
            </CardTitle>
            <CardDescription>
              Manage SOPMASTER version to require re-acknowledgment from all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Version</p>
                <p className="text-lg font-mono font-bold">{SOPMASTER_VERSION}</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmVersionOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Increment Version
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Incrementing the version will invalidate all previous acknowledgments and
              require ALL users to re-acknowledge the SOPs before performing governed actions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmVersionOpen} onOpenChange={setConfirmVersionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Increment SOPMASTER Version?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action will require <strong>ALL</strong> users to re-acknowledge
                the Master SOPs before they can perform any governed actions.
              </p>
              <p>
                Governed actions include: commission submissions, approvals,
                production scheduling, supplement/invoice processing, and job status changes.
              </p>
              <p className="font-medium text-destructive">
                This cannot be undone. Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIncrementVersion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Increment Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
