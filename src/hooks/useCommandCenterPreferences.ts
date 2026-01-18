import { useState, useEffect } from "react";

export interface CommandCenterWidgets {
  companyInfo: boolean;
  companyIdentity: boolean;
  weather: boolean;
  quickStats: boolean;
  todaysBuilds: boolean;
  todaysDeliveries: boolean;
  actionRequired: boolean;
  quickLinks: boolean;
}

export type WidgetKey = keyof CommandCenterWidgets;

const DEFAULT_WIDGETS: CommandCenterWidgets = {
  companyInfo: true,
  companyIdentity: true,
  weather: true,
  quickStats: true,
  todaysBuilds: true,
  todaysDeliveries: true,
  actionRequired: true,
  quickLinks: true,
};

export const DEFAULT_WIDGET_ORDER: WidgetKey[] = [
  "companyInfo",
  "companyIdentity",
  "weather",
  "quickStats",
  "todaysBuilds",
  "todaysDeliveries",
  "actionRequired",
  "quickLinks",
];

const STORAGE_KEY = "command-center-widgets";
const ORDER_STORAGE_KEY = "command-center-widget-order";

export function useCommandCenterPreferences() {
  const [widgets, setWidgets] = useState<CommandCenterWidgets>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_WIDGETS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load command center preferences", e);
    }
    return DEFAULT_WIDGETS;
  });

  const [widgetOrder, setWidgetOrder] = useState<WidgetKey[]>(() => {
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      if (stored) {
        const parsedOrder = JSON.parse(stored) as WidgetKey[];
        // Ensure all widgets are in the order (handle new widgets added in updates)
        const allKeys = new Set(DEFAULT_WIDGET_ORDER);
        const existingKeys = new Set(parsedOrder.filter(key => allKeys.has(key)));
        const missingKeys = DEFAULT_WIDGET_ORDER.filter(key => !existingKeys.has(key));
        return [...parsedOrder.filter(key => allKeys.has(key)), ...missingKeys];
      }
    } catch (e) {
      console.error("Failed to load command center widget order", e);
    }
    return DEFAULT_WIDGET_ORDER;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error("Failed to save command center preferences", e);
    }
  }, [widgets]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(widgetOrder));
    } catch (e) {
      console.error("Failed to save command center widget order", e);
    }
  }, [widgetOrder]);

  const toggleWidget = (key: WidgetKey) => {
    setWidgets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const reorderWidgets = (newOrder: WidgetKey[]) => {
    setWidgetOrder(newOrder);
  };

  const resetToDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
  };

  return {
    widgets,
    widgetOrder,
    toggleWidget,
    reorderWidgets,
    resetToDefaults,
  };
}
