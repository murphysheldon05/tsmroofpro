import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SOPMASTER_VERSION, SOPMASTER_CONTENT } from "@/lib/sopMasterConstants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock, Search, AlertTriangle } from "lucide-react";

type FilterStatus = "all" | "completed" | "in_progress" | "not_started";

export function PlaybookCompletionStatus() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const totalSOPs = SOPMASTER_CONTENT.length;

  // Fetch all active users
  const { data: users } = useQuery({
    queryKey: ["playbook-status-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all acknowledgments for current version
  const { data: acknowledgments } = useQuery({
    queryKey: ["playbook-status-acks", SOPMASTER_VERSION],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_sop_acknowledgments")
        .select("user_id, sop_number")
        .eq("sop_version", SOPMASTER_VERSION);
      if (error) throw error;
      return data || [];
    },
  });

  // Build user completion map
  const userCompletions = (users || []).map((user) => {
    const count = (acknowledgments || []).filter(
      (a) => a.user_id === user.id
    ).length;
    return {
      ...user,
      completedCount: count,
      status: count === 0 ? "not_started" : count >= totalSOPs ? "completed" : "in_progress",
    };
  });

  // Apply filters
  const filtered = userCompletions
    .filter((u) => filter === "all" || u.status === filter)
    .filter(
      (u) =>
        !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

  const completedCount = userCompletions.filter((u) => u.status === "completed").length;
  const inProgressCount = userCompletions.filter((u) => u.status === "in_progress").length;
  const notStartedCount = userCompletions.filter((u) => u.status === "not_started").length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/20 text-center">
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/20 text-center">
          <div className="text-2xl font-bold text-amber-600">{inProgressCount}</div>
          <div className="text-xs text-muted-foreground">In Progress</div>
        </div>
        <div className="p-3 rounded-lg border bg-red-500/10 border-red-500/20 text-center">
          <div className="text-2xl font-bold text-red-600">{notStartedCount}</div>
          <div className="text-xs text-muted-foreground">Not Started</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.map((user) => {
          const pct = totalSOPs > 0 ? (user.completedCount / totalSOPs) * 100 : 0;
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0">
                {user.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : user.status === "in_progress" ? (
                  <Clock className="h-5 w-5 text-amber-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {user.full_name || user.email}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      user.status === "completed"
                        ? "text-green-600 border-green-500/30"
                        : user.status === "in_progress"
                        ? "text-amber-600 border-amber-500/30"
                        : "text-red-600 border-red-500/30"
                    }
                  >
                    {user.completedCount}/{totalSOPs}
                  </Badge>
                </div>
                <Progress value={pct} className="h-1.5 mt-1.5" />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No users match the current filter.
          </p>
        )}
      </div>
    </div>
  );
}
