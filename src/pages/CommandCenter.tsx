import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { CompanyInfoWidget } from "@/components/command-center/CompanyInfoWidget";
import { CompanyIdentityWidget } from "@/components/command-center/CompanyIdentityWidget";
import { TodaysBuildsWidget } from "@/components/command-center/TodaysBuildsWidget";
import { TodaysDeliveriesWidget } from "@/components/command-center/TodaysDeliveriesWidget";
import { ActionRequiredWidget } from "@/components/command-center/ActionRequiredWidget";
import { QuickStatsWidget } from "@/components/command-center/QuickStatsWidget";
import { CommandCenterQuickLinks } from "@/components/command-center/CommandCenterQuickLinks";
import { WeatherWidget } from "@/components/command-center/WeatherWidget";
import { CommandCenterSettings } from "@/components/command-center/CommandCenterSettings";
import { useCommandCenterPreferences } from "@/hooks/useCommandCenterPreferences";
import { LayoutGrid } from "lucide-react";

export default function CommandCenter() {
  const { user, role, isAdmin, isManager } = useAuth();
  const { widgets, toggleWidget, resetToDefaults } = useCommandCenterPreferences();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  // Determine visibility based on role
  const showBuilds = isAdmin || isManager || role === "employee";
  const showDeliveries = isAdmin || isManager || role === "employee";
  const showActionRequired = isAdmin || isManager;

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
              onToggle={toggleWidget}
              onReset={resetToDefaults}
            />
          </div>
        </header>

        {/* My Contact Info */}
        {widgets.companyInfo && (
          <section>
            <CompanyInfoWidget />
          </section>
        )}

        {/* Company Identity - Mission & Values */}
        {widgets.companyIdentity && (
          <section>
            <CompanyIdentityWidget />
          </section>
        )}

        {/* Weather - Outdoor Work Conditions */}
        {widgets.weather && (
          <section>
            <WeatherWidget />
          </section>
        )}

        {/* Quick Stats */}
        {widgets.quickStats && (
          <section>
            <QuickStatsWidget />
          </section>
        )}

        {/* Main Grid - Today's Builds & Deliveries */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Section 1: Today's Builds (Hero) */}
          {showBuilds && widgets.todaysBuilds && (
            <section>
              <TodaysBuildsWidget />
            </section>
          )}

          {/* Section 2: Today's Deliveries */}
          {showDeliveries && widgets.todaysDeliveries && (
            <section>
              <TodaysDeliveriesWidget />
            </section>
          )}
        </div>

        {/* Section 3: Action Required */}
        {showActionRequired && widgets.actionRequired && (
          <section>
            <ActionRequiredWidget />
          </section>
        )}

        {/* Section 4: Quick Links */}
        {widgets.quickLinks && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Links</h2>
            <CommandCenterQuickLinks />
          </section>
        )}
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
