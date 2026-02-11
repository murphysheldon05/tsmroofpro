import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { CompactCoreIdentity } from "@/components/command-center/CompactCoreIdentity";
import { PlaybookCompletionBanner } from "@/components/command-center/PlaybookCompletionBanner";
import { OnboardingBanner } from "@/components/command-center/OnboardingBanner";
import { QuickActionLinks } from "@/components/command-center/QuickActionLinks";
import { CommissionSummaryWidget } from "@/components/command-center/CommissionSummaryWidget";
import { SalesLeaderboardWidget } from "@/components/command-center/SalesLeaderboardWidget";
import { QuickStatsWidget } from "@/components/command-center/QuickStatsWidget";
import { CompanyInfoWidget } from "@/components/command-center/CompanyInfoWidget";
import { WeatherWidget } from "@/components/command-center/WeatherWidget";
import { ActionRequiredWidget } from "@/components/command-center/ActionRequiredWidget";
import { NeedsAttentionWidget } from "@/components/command-center/NeedsAttentionWidget";
import { LayoutGrid } from "lucide-react";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commandCenterSteps } from "@/components/tutorial/tutorialSteps";

export default function CommandCenter() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-5 px-4 sm:px-0">
        {/* 1. Header greeting */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                Command Center
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                Good {getTimeOfDay()}, {firstName}. Here's your daily overview.
              </p>
            </div>
          </div>
        </header>

        {/* Master Playbook Completion Banner */}
        <PlaybookCompletionBanner />

        {/* Role Onboarding Banner */}
        <OnboardingBanner />

        {/* 2. Core Focus + Core Values (locked) */}
        <CompactCoreIdentity />

        {/* 3. Sales Leaderboard (moved up) */}
        <div data-tutorial="sales-leaderboard">
          <SalesLeaderboardWidget />
        </div>

        {/* 4. Commission summary cards */}
        <div data-tutorial="commission-summary">
          <CommissionSummaryWidget />
        </div>

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

        {/* 7. TSM Roofing LLC contact bar */}
        <CompanyInfoWidget />

        {/* 8. Weather widget */}
        <div data-tutorial="weather-widget">
          <WeatherWidget />
        </div>

        {/* 9. Pending Review (compacted) */}
        <ActionRequiredWidget />

        <GuidedTour pageName="command-center" pageTitle="Command Center" steps={commandCenterSteps} />
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
