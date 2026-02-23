import { WidgetKey } from "@/hooks/useCommandCenterPreferences";
import { CompanyInfoWidget } from "./CompanyInfoWidget";
import { WeatherWidget } from "./WeatherWidget";
import { QuickStatsWidget } from "./QuickStatsWidget";
import { TodaysBuildsWidgetV2 } from "./TodaysBuildsWidgetV2";
import { TodaysDeliveriesWidgetV2 } from "./TodaysDeliveriesWidgetV2";
import { CommandCenterQuickLinks } from "./CommandCenterQuickLinks";
import { SalesLeaderboardWidget } from "./SalesLeaderboardWidget";
interface WidgetRendererProps {
  widgetKey: WidgetKey;
  isVisible: boolean;
  isAdmin: boolean;
  isManager: boolean;
  role: string | null;
}

export function WidgetRenderer({
  widgetKey,
  isVisible,
  isAdmin,
  isManager,
  role,
}: WidgetRendererProps) {
  if (!isVisible) return null;

  // Role-based visibility checks
  const showBuilds = isAdmin || isManager || role === "employee";
  const showDeliveries = isAdmin || isManager || role === "employee";

  switch (widgetKey) {
    case "companyInfo":
      return (
        <section>
          <CompanyInfoWidget />
        </section>
      );
    case "weather":
      return (
        <section>
          <WeatherWidget />
        </section>
      );
    case "quickStats":
      return (
        <section>
          <QuickStatsWidget />
        </section>
      );
    case "slaSnapshot":
      return null;
    case "todaysBuilds":
      return showBuilds ? (
        <section>
          <TodaysBuildsWidgetV2 />
        </section>
      ) : null;
    case "todaysDeliveries":
      return showDeliveries ? (
        <section>
          <TodaysDeliveriesWidgetV2 />
        </section>
      ) : null;
    case "quickLinks":
      return (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Quick Links
          </h2>
          <CommandCenterQuickLinks />
        </section>
      );
    case "salesLeaderboard":
      return (
        <section>
          <SalesLeaderboardWidget />
        </section>
      );
    default:
      return null;
  }
}
