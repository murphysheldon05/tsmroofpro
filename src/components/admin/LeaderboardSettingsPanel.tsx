import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function LeaderboardSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: isEnabled, isLoading } = useQuery({
    queryKey: ["app-settings", "show_sales_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "show_sales_leaderboard")
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value === true || data?.setting_value === "true";
    },
  });

  const handleToggle = async (checked: boolean) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ setting_value: checked, updated_at: new Date().toISOString() })
      .eq("setting_key", "show_sales_leaderboard");

    if (error) {
      toast.error("Failed to update setting");
      return;
    }

    toast.success(checked ? "Leaderboard enabled" : "Leaderboard disabled");
    queryClient.invalidateQueries({ queryKey: ["app-settings", "show_sales_leaderboard"] });
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
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="leaderboard-toggle" className="flex flex-col gap-1">
            <span className="font-medium">Show Sales Leaderboard</span>
            <span className="text-xs text-muted-foreground">
              When disabled, the leaderboard widget is hidden for all users.
            </span>
          </Label>
          <Switch
            id="leaderboard-toggle"
            checked={isEnabled ?? true}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
