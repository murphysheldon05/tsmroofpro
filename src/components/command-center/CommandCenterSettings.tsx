import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CommandCenterWidgets } from "@/hooks/useCommandCenterPreferences";

interface CommandCenterSettingsProps {
  widgets: CommandCenterWidgets;
  onToggle: (key: keyof CommandCenterWidgets) => void;
  onReset: () => void;
}

const WIDGET_LABELS: Record<keyof CommandCenterWidgets, { label: string; description: string }> = {
  companyInfo: {
    label: "My Contact Info",
    description: "Your contact details and manager info",
  },
  companyIdentity: {
    label: "Company Identity",
    description: "Mission, focus, and core values",
  },
  weather: {
    label: "Weather",
    description: "Current weather and forecast",
  },
  quickStats: {
    label: "Quick Stats",
    description: "Summary of builds, deliveries, and approvals",
  },
  todaysBuilds: {
    label: "Today's Builds",
    description: "Scheduled builds for today",
  },
  todaysDeliveries: {
    label: "Today's Deliveries",
    description: "Scheduled deliveries for today",
  },
  actionRequired: {
    label: "Action Required",
    description: "Items needing your attention",
  },
  quickLinks: {
    label: "Quick Links",
    description: "Shortcuts to common actions",
  },
};

export function CommandCenterSettings({
  widgets,
  onToggle,
  onReset,
}: CommandCenterSettingsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Customize Command Center</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Customize Command Center</SheetTitle>
          <SheetDescription>
            Show or hide widgets to personalize your dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {(Object.keys(WIDGET_LABELS) as Array<keyof CommandCenterWidgets>).map(
            (key) => (
              <div
                key={key}
                className="flex items-center justify-between space-x-4 rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {WIDGET_LABELS[key].label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {WIDGET_LABELS[key].description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={widgets[key]}
                  onCheckedChange={() => onToggle(key)}
                />
              </div>
            )
          )}
        </div>

        <Separator className="my-6" />

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </SheetContent>
    </Sheet>
  );
}
