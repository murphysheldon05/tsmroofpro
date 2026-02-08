import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tsm_sidebar_order";

// Default order of main navigation items
const DEFAULT_ORDER = [
  "Command Center",
  "Commissions",
  "Production", 
  "Playbook Library",
  "Training",
  "Who to Contact",
  "Tools & Systems",
  "Forms & Requests",
  "Subs & Vendors",
];

export function useSidebarOrder() {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new items were added
        const merged = [...parsed];
        DEFAULT_ORDER.forEach((item) => {
          if (!merged.includes(item)) {
            merged.push(item);
          }
        });
        // Remove items that no longer exist
        return merged.filter((item) => DEFAULT_ORDER.includes(item));
      }
    } catch (e) {
      console.error("Failed to load sidebar order:", e);
    }
    return DEFAULT_ORDER;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch (e) {
      console.error("Failed to save sidebar order:", e);
    }
  }, [order]);

  const reorder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
  }, []);

  const resetToDefaults = useCallback(() => {
    setOrder(DEFAULT_ORDER);
  }, []);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setOrder((prev) => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      return newOrder;
    });
  }, []);

  return {
    order,
    reorder,
    resetToDefaults,
    moveItem,
  };
}
