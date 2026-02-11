import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useTutorial(pageName: string) {
  const { user } = useAuth();
  const userId = user?.id || "anon";
  const storageKey = `tutorial_completed_${pageName}_${userId}`;

  const [isCompleted, setIsCompleted] = useState(true); // default true to avoid flash
  const [isActive, setIsActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === "true";
    setIsCompleted(completed);

    if (!completed) {
      const timer = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setIsActive(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(storageKey, "true");
    setIsCompleted(true);
  }, [storageKey]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, "true");
    setIsCompleted(true);
  }, [storageKey]);

  const restartTour = useCallback(() => {
    setShowWelcome(false);
    setIsActive(true);
  }, []);

  return {
    isCompleted,
    isActive,
    showWelcome,
    startTour,
    dismissWelcome,
    completeTour,
    restartTour,
  };
}
