import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TutorialStep } from "@/components/tutorial/tutorialSteps";

interface TutorialCompletion {
  page_key: string;
  completed_at: string;
  dismissed: boolean;
  last_step_index: number;
}

export function useTutorial(pageName: string, allSteps: TutorialStep[] = []) {
  const { user, role } = useAuth();
  const userId = user?.id;

  const [isCompleted, setIsCompleted] = useState(true); // default true to avoid flash
  const [isActive, setIsActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [savedStepIndex, setSavedStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter steps by role
  const filteredSteps = allSteps.filter((step) => {
    if (!step.roles || step.roles.length === 0) return true;
    if (!role) return false;
    return step.roles.includes(role);
  });

  // Load completion status from DB
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchCompletion = async () => {
      const { data } = await supabase
        .from("user_tutorial_completions")
        .select("*")
        .eq("user_id", userId)
        .eq("page_key", pageName)
        .maybeSingle();

      if (data) {
        setIsCompleted(true);
        // If they left mid-tutorial and didn't complete, offer resume
        if (!data.dismissed && data.last_step_index > 0 && data.last_step_index < filteredSteps.length - 1) {
          setSavedStepIndex(data.last_step_index);
          setShowResume(true);
        }
      } else {
        setIsCompleted(false);
        // First visit — show welcome after delay
        const timer = setTimeout(() => setShowWelcome(true), 1000);
        setLoading(false);
        return () => clearTimeout(timer);
      }
      setLoading(false);
    };

    fetchCompletion();
  }, [userId, pageName, filteredSteps.length]);

  const saveCompletion = useCallback(
    async (dismissed: boolean, lastStep: number = 0) => {
      if (!userId) return;
      await supabase.from("user_tutorial_completions").upsert(
        {
          user_id: userId,
          page_key: pageName,
          completed_at: new Date().toISOString(),
          dismissed,
          last_step_index: lastStep,
        },
        { onConflict: "user_id,page_key" }
      );
    },
    [userId, pageName]
  );

  const saveProgress = useCallback(
    async (stepIndex: number) => {
      if (!userId) return;
      await supabase.from("user_tutorial_completions").upsert(
        {
          user_id: userId,
          page_key: pageName,
          completed_at: new Date().toISOString(),
          dismissed: false,
          last_step_index: stepIndex,
        },
        { onConflict: "user_id,page_key" }
      );
    },
    [userId, pageName]
  );

  const startTour = useCallback((fromStep = 0) => {
    setShowWelcome(false);
    setShowResume(false);
    setIsActive(true);
    setSavedStepIndex(fromStep);
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    setShowResume(false);
    saveCompletion(true, 0);
    setIsCompleted(true);
  }, [saveCompletion]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    saveCompletion(false, filteredSteps.length);
    setIsCompleted(true);
  }, [saveCompletion, filteredSteps.length]);

  const skipTour = useCallback(
    (currentStep: number) => {
      setIsActive(false);
      saveProgress(currentStep);
      setIsCompleted(true);
    },
    [saveProgress]
  );

  const restartTour = useCallback(() => {
    setShowWelcome(false);
    setShowResume(false);
    setIsActive(true);
    setSavedStepIndex(0);
  }, []);

  return {
    isCompleted,
    isActive,
    showWelcome,
    showResume,
    savedStepIndex,
    startTour,
    dismissWelcome,
    completeTour,
    skipTour,
    restartTour,
    filteredSteps,
    loading,
  };
}
