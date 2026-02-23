import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function useAppSetting(key: string) {
  return useQuery({
    queryKey: ["app-settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", key)
        .maybeSingle();
      if (error) throw error;
      // If no row exists yet, default OFF (leaderboard hidden until AccuLynx API is confirmed)
      if (!data) return false;
      return data.setting_value === true || data.setting_value === "true";
    },
  });
}

export function LeaderboardSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: isEnabled, isLoading } = useAppSetting("show_sales_leaderboard");
  const { data: showProfit, isLoading: profitLoading } = useAppSetting("show_profit_on_leaderboard");

  const handleToggle = async (key: string, checked: boolean, label: string) => {
    // Try update first, then upsert if no row exists
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("setting_key", key)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("app_settings")
        .update({ setting_value: checked, updated_at: new Date().toISOString() })
        .eq("setting_key", key));
    } else {
      ({ error } = await supabase
        .from("app_settings")
        .insert({ setting_key: key, setting_value: checked }));
    }

    if (error) {
      toast.error("Failed to update setting");
      return;
    }

    toast.success(`${label} ${checked ? "enabled" : "disabled"}`);
    queryClient.invalidateQueries({ queryKey: ["app-settings", key] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">Leaderboard Settings</CardTitle>
        </div>
        <CardDescription>
          Control the Sales Leaderboard widget visibility on the Command Center for all users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="leaderboard-toggle" className="flex flex-col gap-1">
            <span className="font-medium">Show Sales Leaderboard</span>
            <span className="text-xs text-muted-foreground">
              When disabled, the leaderboard widget is hidden for all users.
            </span>
          </Label>
          <Switch
            id="leaderboard-toggle"
            checked={isEnabled ?? false}
            onCheckedChange={(v) => handleToggle("show_sales_leaderboard", v, "Leaderboard")}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="profit-toggle" className="flex flex-col gap-1">
            <span className="font-medium">Show Profit Tab</span>
            <span className="text-xs text-muted-foreground">
              Show the Profit tab on the leaderboard. Profit data comes from pay run job values.
            </span>
          </Label>
          <Switch
            id="profit-toggle"
            checked={showProfit ?? true}
            onCheckedChange={(v) => handleToggle("show_profit_on_leaderboard", v, "Profit tab")}
            disabled={profitLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
