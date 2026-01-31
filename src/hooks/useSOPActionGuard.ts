import { useState, useCallback } from "react";
import { useSOPAcknowledgment } from "./useSOPAcknowledgment";
import { toast } from "sonner";
import type { GovernedAction } from "@/lib/sopMasterConstants";

interface UseSOPActionGuardResult {
  /**
   * Wrap any governed action with this function.
   * If user hasn't acknowledged SOPs, it will block and show prompt.
   * If acknowledged, the action will proceed normally.
   */
  guardAction: <T>(action: () => Promise<T> | T) => Promise<T | null>;
  
  /**
   * Whether the action blocker modal should be shown
   */
  showBlocker: boolean;
  
  /**
   * Close the blocker and optionally open the acknowledgment gate
   */
  onBlockerClose: () => void;
  
  /**
   * Whether to show the full acknowledgment gate
   */
  showAcknowledgmentGate: boolean;
  
  /**
   * Close the acknowledgment gate
   */
  onAcknowledgmentGateClose: () => void;
  
  /**
   * Open the acknowledgment gate from the blocker
   */
  openAcknowledgmentGate: () => void;
  
  /**
   * Pending action to retry after acknowledgment
   */
  retryPendingAction: () => void;
}

export function useSOPActionGuard(actionType?: GovernedAction): UseSOPActionGuardResult {
  const { hasAcknowledged, isLoading } = useSOPAcknowledgment();
  const [showBlocker, setShowBlocker] = useState(false);
  const [showAcknowledgmentGate, setShowAcknowledgmentGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<any> | any) | null>(null);

  const guardAction = useCallback(
    async <T>(action: () => Promise<T> | T): Promise<T | null> => {
      // Still loading, allow action (optimistic)
      if (isLoading) {
        return action();
      }

      // Already acknowledged, proceed
      if (hasAcknowledged) {
        return action();
      }

      // Not acknowledged - block action and show prompt
      setPendingAction(() => action);
      setShowBlocker(true);
      return null;
    },
    [hasAcknowledged, isLoading]
  );

  const onBlockerClose = useCallback(() => {
    setShowBlocker(false);
    setPendingAction(null);
  }, []);

  const openAcknowledgmentGate = useCallback(() => {
    setShowBlocker(false);
    setShowAcknowledgmentGate(true);
  }, []);

  const onAcknowledgmentGateClose = useCallback(() => {
    setShowAcknowledgmentGate(false);
  }, []);

  const retryPendingAction = useCallback(async () => {
    setShowAcknowledgmentGate(false);
    if (pendingAction) {
      try {
        await pendingAction();
        toast.success("Action completed successfully");
      } catch (e: any) {
        toast.error("Action failed: " + e.message);
      }
      setPendingAction(null);
    }
  }, [pendingAction]);

  return {
    guardAction,
    showBlocker,
    onBlockerClose,
    showAcknowledgmentGate,
    onAcknowledgmentGateClose,
    openAcknowledgmentGate,
    retryPendingAction,
  };
}
