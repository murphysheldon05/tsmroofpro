import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useWalkthrough } from "@/hooks/useWalkthrough";
import { AppWalkthrough } from "@/components/walkthrough/AppWalkthrough";

interface WalkthroughContextType {
  startTour: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hasAutoLaunched = useRef(false);
  const {
    isActive,
    startTour,
    endTour,
    markCompleted,
    shouldAutoLaunch,
  } = useWalkthrough();

  // Auto-launch for first-time users when they land on a protected route
  useEffect(() => {
    if (!shouldAutoLaunch || hasAutoLaunched.current) return;
    const isProtectedRoute = !["/", "/auth", "/signup", "/landing"].includes(location.pathname);
    if (isProtectedRoute) {
      hasAutoLaunched.current = true;
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoLaunch, location.pathname, startTour]);

  const handleComplete = useCallback(() => {
    markCompleted();
  }, [markCompleted]);

  const handleSkip = useCallback(() => {
    endTour();
  }, [endTour]);

  return (
    <WalkthroughContext.Provider value={{ startTour }}>
      {children}
      <AppWalkthrough
        isActive={isActive}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </WalkthroughContext.Provider>
  );
}

export function useWalkthroughContext() {
  const ctx = useContext(WalkthroughContext);
  if (ctx === undefined) {
    throw new Error("useWalkthroughContext must be used within WalkthroughProvider");
  }
  return ctx;
}
