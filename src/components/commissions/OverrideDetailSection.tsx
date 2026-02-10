import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRepOverrideTracking } from "@/hooks/useOverrideTracking";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, UserCheck } from "lucide-react";

interface OverrideDetailSectionProps {
  commission: {
    id: string;
    sales_rep_id: string | null;
    net_commission_owed: number;
    override_amount?: number | null;
    override_manager_id?: string | null;
    override_commission_number?: number | null;
    status: string;
  };
}

export function OverrideDetailSection({ commission }: OverrideDetailSectionProps) {
  const { user, role } = useAuth();

  // Check if current user is the sales rep (reps should NOT see override info)
  const isRep = user?.id === commission.sales_rep_id;
  const isAdmin = role === "admin";

  // Check if user is the override manager
  const isOverrideManager = user?.id === commission.override_manager_id;

  // Check if user is a reviewer (accounting)
  const { data: isReviewer } = useQuery({
    queryKey: ["is-reviewer-for-override", user?.id],
    queryFn: async () => {
      if (!user?.email) return false;
      const { data } = await supabase
        .from("commission_reviewers")
        .select("id")
        .eq("user_email", user.email)
        .eq("is_active", true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.email,
  });

  // Only show to admin, accounting, or the override manager — NOT the sales rep
  const canView = !isRep && (isAdmin || isReviewer || isOverrideManager);

  // Get override tracking for the rep
  const { data: tracking } = useRepOverrideTracking(commission.sales_rep_id || undefined);

  // Get manager name
  const { data: managerProfile } = useQuery({
    queryKey: ["override-manager-profile", commission.override_manager_id],
    queryFn: async () => {
      if (!commission.override_manager_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", commission.override_manager_id)
        .single();
      return data;
    },
    enabled: !!commission.override_manager_id,
  });

  if (!canView) return null;

  // If no override data and rep is not in override phase, don't show
  const inOverridePhase = tracking && !tracking.override_phase_complete && tracking.approved_commission_count < 10;
  const hasOverrideData = commission.override_amount && commission.override_amount > 0;

  if (!hasOverrideData && !inOverridePhase) return null;

  const overrideAmount = commission.override_amount || (commission.net_commission_owed * 0.10);
  const commNumber = commission.override_commission_number || (tracking ? tracking.approved_commission_count + 1 : null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  return (
    <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/10 dark:border-purple-800/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
          <TrendingUp className="h-4 w-4" />
          Sales Manager Override
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">10% of Net Commission</span>
            <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {formatCurrency(overrideAmount)}
            </span>
          </div>

          {managerProfile && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Override paid to</span>
              <span className="text-sm font-medium flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                {managerProfile.full_name}
              </span>
            </div>
          )}

          {commNumber && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commission number</span>
              <Badge variant="outline" className="bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300/50">
                #{commNumber} of 10
              </Badge>
            </div>
          )}

          {commission.status === "paid" && hasOverrideData && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              ✓ Override processed with commission payment
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
