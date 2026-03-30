import { useAuth } from "@/contexts/AuthContext";

import { CompactCoreIdentity } from "@/components/command-center/CompactCoreIdentity";
import { QuickActionLinks } from "@/components/command-center/QuickActionLinks";

import { SalesLeaderboardWidget } from "@/components/command-center/SalesLeaderboardWidget";
import { QuickStatsWidget } from "@/components/command-center/QuickStatsWidget";
import { useLeaderboardSetting } from "@/hooks/useSalesLeaderboard";
import { CompanyInfoWidget } from "@/components/command-center/CompanyInfoWidget";
import { WeatherWidget } from "@/components/command-center/WeatherWidget";
import { NeedsAttentionWidget } from "@/components/command-center/NeedsAttentionWidget";
import { CommandCenterSettings } from "@/components/command-center/CommandCenterSettings";
import { useCommandCenterPreferences } from "@/hooks/useCommandCenterPreferences";
import { MessageBoard } from "@/components/command-center/feed/MessageBoard";
import { LayoutGrid } from "lucide-react";
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

  return (
    <div className="max-w-7xl mx-auto space-y-5 px-4 sm:px-0">
        {/* 1. Header greeting */}
        <header className="pt-4 lg:pt-0" data-tutorial="command-center-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                Command Center
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                Welcome Back, {firstName}! Here's your daily overview.
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
        </header>

        {/* 2. Core Focus + Core Values */}
        <CompactCoreIdentity />

        {/* 3. Sales Leaderboard — only when admin has enabled it (default OFF during AccuLynx debug) */}
        {showSalesLeaderboard && (
          <div data-tutorial="sales-leaderboard">
            <SalesLeaderboardWidget />
          </div>
        )}

        {/* 5. Quick Links row */}
        <div data-tutorial="quick-links">
          <QuickActionLinks />
        </div>

        {/* 6. Stat boxes (clickable) */}
        <div data-tutorial="quick-stats">
          <QuickStatsWidget />
        </div>

        {/* Needs Your Attention - Manager/Admin only */}
        <NeedsAttentionWidget />

        {/* Team Feed / Message Board */}
        <MessageBoard />

        {/* 7. TSM Roofing LLC contact bar */}
        <CompanyInfoWidget />

        {/* 8. Weather widget */}
        <div data-tutorial="weather-widget">
          <WeatherWidget />
        </div>

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
