import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDrawSettings, useUpdateDrawSettings } from "@/hooks/useDraws";
import { DollarSign, Clock, AlertTriangle, Loader2 } from "lucide-react";

export function DrawSettingsManager() {
  const { data: settings, isLoading } = useDrawSettings();
  const updateSetting = useUpdateDrawSettings();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const settingsConfig = [
    { key: "max_draw_amount", label: "Maximum Draw Amount", icon: DollarSign, prefix: "$", description: "No rep can have more than this outstanding at any time" },
    { key: "max_duration_weeks", label: "Maximum Duration (Weeks)", icon: Clock, prefix: "", description: "Warning notification triggered if balance exceeds threshold after this many weeks" },
    { key: "warning_balance_threshold", label: "Warning Balance Threshold", icon: AlertTriangle, prefix: "$", description: "If remaining balance stays above this amount past max duration, alerts are sent" },
  ];

  const handleSave = (key: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    updateSetting.mutate({ key, value: val });
    setEditing(null);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Draw / Advance Settings</h3>
        <p className="text-sm text-muted-foreground">Configure draw caps and warning thresholds</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {settingsConfig.map(({ key, label, icon: Icon, prefix, description }) => (
          <Card key={key} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              {editing === key ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleSave(key)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    {prefix}{settings?.[key]?.toLocaleString() ?? "—"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(key);
                      setEditValue(String(settings?.[key] ?? ""));
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
