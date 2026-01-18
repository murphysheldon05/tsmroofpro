import { WidgetKey } from "@/hooks/useCommandCenterPreferences";
import { CompanyInfoWidget } from "./CompanyInfoWidget";
import { CompanyIdentityWidget } from "./CompanyIdentityWidget";
import { WeatherWidget } from "./WeatherWidget";
import { QuickStatsWidget } from "./QuickStatsWidget";
import { TodaysBuildsWidget } from "./TodaysBuildsWidget";
import { TodaysDeliveriesWidget } from "./TodaysDeliveriesWidget";
import { ActionRequiredWidget } from "./ActionRequiredWidget";
import { CommandCenterQuickLinks } from "./CommandCenterQuickLinks";

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
  // Action Required widget is now visible to all users (shows different content based on role)
  const showActionRequired = true;

  switch (widgetKey) {
    case "companyInfo":
      return (
        <section>
          <CompanyInfoWidget />
        </section>
      );
    case "companyIdentity":
      return (
        <section>
          <CompanyIdentityWidget />
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
    case "todaysBuilds":
      return showBuilds ? (
        <section>
          <TodaysBuildsWidget />
        </section>
      ) : null;
    case "todaysDeliveries":
      return showDeliveries ? (
        <section>
          <TodaysDeliveriesWidget />
        </section>
      ) : null;
    case "actionRequired":
      return showActionRequired ? (
        <section>
          <ActionRequiredWidget />
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
    default:
      return null;
  }
}
