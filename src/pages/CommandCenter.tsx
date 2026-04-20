import { useAuth } from "@/contexts/AuthContext";

import { CompactCoreIdentity } from "@/components/command-center/CompactCoreIdentity";
import { QuickActionLinks } from "@/components/command-center/QuickActionLinks";

import { SalesLeaderboardWidget } from "@/components/command-center/SalesLeaderboardWidget";
import { QuickStatsWidget } from "@/components/command-center/QuickStatsWidget";
import { useLeaderboardSetting } from "@/hooks/useSalesLeaderboard";
import { WeatherWidget } from "@/components/command-center/WeatherWidget";
import { CommandCenterSettings } from "@/components/command-center/CommandCenterSettings";
import { useCommandCenterPreferences } from "@/hooks/useCommandCenterPreferences";
import { MessageBoard } from "@/components/command-center/feed/MessageBoard";
import { LayoutGrid, MessageSquare, Sparkles } from "lucide-react";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commandCenterSteps } from "@/components/tutorial/tutorialSteps";
import { formatDisplayName } from "@/lib/displayName";

export default function CommandCenter() {
  const { user } = useAuth();
  const { widgets, widgetOrder, toggleWidget, reorderWidgets, resetToDefaults } = useCommandCenterPreferences();
  const { data: showSalesLeaderboard = false } = useLeaderboardSetting();
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = formatDisplayName(fullName, user?.email);
  const firstName = displayName !== "Unknown" ? displayName.trim().split(/\s+/)[0] : "there";

  const stagger = (i: number) => ({ animationDelay: `${i * 80}ms` });

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-0">
        <header className="pt-4 lg:pt-0 animate-stagger-up" style={stagger(0)} data-tutorial="command-center-header">
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background px-5 py-5 shadow-sm sm:px-6">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Your team pulse for today
                </div>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                      Good {getTimeOfDay()}, {firstName}
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                      Wins, updates, and the team conversation are front and center so everyone can move fast.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 lg:self-start">
                <div className="hidden rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm shadow-sm sm:block">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Team Feed spotlight
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Post wins, updates, and announcements where everyone sees them.
                  </p>
                </div>
                <div data-tutorial="cc-settings-gear">
                  <CommandCenterSettings
                    widgets={widgets}
                    widgetOrder={widgetOrder}
                    onToggle={toggleWidget}
                    onReorder={reorderWidgets}
                    onReset={resetToDefaults}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <div className="space-y-5">
            <div className="animate-stagger-up" style={stagger(1)}>
              <MessageBoard />
            </div>
          </div>

          <div className="space-y-5">
            <div className="animate-stagger-up" style={stagger(2)} data-tutorial="quick-stats">
              <QuickStatsWidget />
            </div>

            <div className="animate-stagger-up" style={stagger(3)} data-tutorial="quick-links">
              <QuickActionLinks />
            </div>

            <div className="animate-stagger-up" style={stagger(4)} data-tutorial="weather-widget">
              <WeatherWidget />
            </div>
          </div>
        </section>

        <div className="animate-stagger-up" style={stagger(5)}>
          <CompactCoreIdentity />
        </div>

        {showSalesLeaderboard && (
          <div className="animate-stagger-up" style={stagger(6)} data-tutorial="sales-leaderboard">
            <SalesLeaderboardWidget />
          </div>
        )}

        <GuidedTour pageName="command-center" pageTitle="Command Center" steps={commandCenterSteps} />
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
