import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInHours } from "date-fns";

export function OnboardingOversightTab() {
  // All active users
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["compliance-onboarding-oversight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_status, created_at")
        .eq("employee_status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All master SOP acknowledgments
  const { data: acks } = useQuery({
    queryKey: ["compliance-master-sop-acks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_sop_acknowledgments")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Role onboarding completions
  const { data: roleCompletions } = useQuery({
    queryKey: ["compliance-role-completions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_onboarding_completions")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const userProgress = useMemo(() => {
    if (!profiles) return [];
    return profiles.map(p => {
      const userAcks = (acks || []).filter(a => a.user_id === p.id);
      const sopCount = userAcks.length;
      const isComplete = sopCount >= 10;
      const roleCompletion = (roleCompletions || []).find(r => r.user_id === p.id);
      const hoursSinceCreated = differenceInHours(new Date(), new Date(p.created_at));
      const isOverdue48 = !isComplete && hoursSinceCreated > 48;
      
      // Check if stalled (last ack > 72h ago and not complete)
      const lastAckTime = userAcks.length > 0 
        ? Math.max(...userAcks.map(a => new Date(a.acknowledged_at).getTime()))
        : 0;
      const hoursSinceLastAck = lastAckTime ? differenceInHours(new Date(), new Date(lastAckTime)) : 0;
      const isStalled = !isComplete && sopCount > 0 && hoursSinceLastAck > 72;

      return {
        ...p,
        sopCount,
        isComplete,
        roleSopSigned: !!roleCompletion,
        isOverdue48,
        isStalled,
      };
    });
  }, [profiles, acks, roleCompletions]);

  const behindSchedule = userProgress.filter(u => u.isOverdue48 || u.isStalled).length;
  const completedCount = userProgress.filter(u => u.isComplete).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{profiles?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Playbook Complete</p>
          </CardContent>
        </Card>
        <Card className={behindSchedule > 0 ? "border-amber-300" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{behindSchedule}</p>
            <p className="text-xs text-muted-foreground">Behind Schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{userProgress.filter(u => u.roleSopSigned).length}</p>
            <p className="text-xs text-muted-foreground">Role SOP Signed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Master Playbook</TableHead>
                <TableHead>Role SOP</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : userProgress.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : (
                userProgress.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isComplete ? "outline" : "secondary"} className={u.isComplete ? "bg-green-50 text-green-700 border-green-300" : ""}>
                        {u.sopCount}/10 {u.isComplete && "✓"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.roleSopSigned ? "outline" : "secondary"} className={u.roleSopSigned ? "bg-green-50 text-green-700 border-green-300" : ""}>
                        {u.roleSopSigned ? "Signed" : "Not Signed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.isOverdue48 && <Badge variant="destructive" className="text-xs">48h+ No Start</Badge>}
                        {u.isStalled && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">Stalled 72h+</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}