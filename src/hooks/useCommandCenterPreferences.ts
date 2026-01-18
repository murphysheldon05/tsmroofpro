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

const STORAGE_KEY = "command-center-widgets";

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error("Failed to save command center preferences", e);
    }
  }, [widgets]);

  const toggleWidget = (key: keyof CommandCenterWidgets) => {
    setWidgets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetToDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  return {
    widgets,
    toggleWidget,
    resetToDefaults,
  };
}
