import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const NEON_GREEN = "#39FF14";

export function useWalkthrough() {
  const { user } = useAuth();
  const userId = user?.id;

  const [walkthroughCompleted, setWalkthroughCompleted] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("walkthrough_completed")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setWalkthroughCompleted(data.walkthrough_completed ?? false);
      }
      setLoading(false);
    };

    fetchStatus();
  }, [userId]);

  const markCompleted = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ walkthrough_completed: true })
      .eq("id", userId);
    setWalkthroughCompleted(true);
    setIsActive(false);
  }, [userId]);

  const startTour = useCallback(() => {
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    walkthroughCompleted,
    isActive,
    loading,
    startTour,
    endTour,
    markCompleted,
    shouldAutoLaunch: !loading && !walkthroughCompleted && !!userId,
  };
}

export { NEON_GREEN };
