import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TodaysBuildsWidget } from "@/components/command-center/TodaysBuildsWidget";
import { TodaysDeliveriesWidget } from "@/components/command-center/TodaysDeliveriesWidget";
import { ActionRequiredWidget } from "@/components/command-center/ActionRequiredWidget";
import { QuickStatsWidget } from "@/components/command-center/QuickStatsWidget";
import { CommandCenterQuickLinks } from "@/components/command-center/CommandCenterQuickLinks";
import { Navigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

export default function CommandCenter() {
  const { user, role, isAdmin, isManager } = useAuth();

  // Sales role redirects to regular dashboard
  // For now, we check if user has a specific department - this can be enhanced
  // Based on the current role system: admin, manager, employee
  // We'll show Command Center to admin and manager, and regular dashboard for employees
  // unless they're in Production or Office departments

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  // Determine visibility based on role
  const showBuilds = isAdmin || isManager || role === "employee"; // Production users can see
  const showDeliveries = isAdmin || isManager || role === "employee";
  const showActionRequired = isAdmin || isManager;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
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
        </header>

        {/* Quick Stats */}
        <section>
          <QuickStatsWidget />
        </section>

        {/* Main Grid - Today's Builds & Deliveries */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Section 1: Today's Builds (Hero) */}
          {showBuilds && (
            <section>
              <TodaysBuildsWidget />
            </section>
          )}

          {/* Section 2: Today's Deliveries */}
          {showDeliveries && (
            <section>
              <TodaysDeliveriesWidget />
            </section>
          )}
        </div>

        {/* Section 3: Action Required */}
        {showActionRequired && (
          <section>
            <ActionRequiredWidget />
          </section>
        )}

        {/* Section 5: Quick Links */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Links</h2>
          <CommandCenterQuickLinks />
        </section>
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
