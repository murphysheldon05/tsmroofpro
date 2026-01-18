import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommandCenterSettings } from "@/components/command-center/CommandCenterSettings";
import { WidgetRenderer } from "@/components/command-center/WidgetRenderer";
import { useCommandCenterPreferences } from "@/hooks/useCommandCenterPreferences";
import { LayoutGrid } from "lucide-react";

export default function CommandCenter() {
  const { user, role, isAdmin, isManager } = useAuth();
  const { widgets, widgetOrder, toggleWidget, reorderWidgets, resetToDefaults } =
    useCommandCenterPreferences();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Command Center
                </h1>
                <p className="text-sm text-muted-foreground">
                  Good {getTimeOfDay()}, {firstName}. Here's your daily overview.
                </p>
              </div>
            </div>
            <CommandCenterSettings
              widgets={widgets}
              widgetOrder={widgetOrder}
              onToggle={toggleWidget}
              onReorder={reorderWidgets}
              onReset={resetToDefaults}
            />
          </div>
        </header>

        {/* Dynamic Widget Rendering Based on User Order */}
        {widgetOrder.map((widgetKey) => (
          <WidgetRenderer
            key={widgetKey}
            widgetKey={widgetKey}
            isVisible={widgets[widgetKey]}
            isAdmin={isAdmin}
            isManager={isManager}
            role={role}
          />
        ))}
      </div>
    </AppLayout>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
