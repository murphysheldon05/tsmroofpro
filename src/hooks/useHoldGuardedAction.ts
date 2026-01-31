import { useCallback } from "react";
import { toast } from "sonner";
import {
  checkCommissionHold,
  checkInvoiceHold,
  checkSchedulingHold,
  type HoldCheckResult,
} from "./useComplianceHoldCheck";

interface UseHoldGuardedActionOptions {
  onBlocked?: (result: HoldCheckResult) => void;
}

/**
 * Hook that wraps actions with hold checks.
 * Returns guarded action functions that check for holds before proceeding.
 */
export function useHoldGuardedAction(options?: UseHoldGuardedActionOptions) {
  const { onBlocked } = options || {};

  /**
   * Guard a commission-related action with hold check
   */
  const guardCommissionAction = useCallback(
    async <T>(
      action: () => Promise<T>,
      jobId?: string | null,
      userId?: string | null
    ): Promise<T | null> => {
      const holdCheck = await checkCommissionHold(jobId, userId);

      if (holdCheck.blocked) {
        toast.error(`Commission blocked: ${holdCheck.reason}. Contact Ops Compliance.`);
        onBlocked?.(holdCheck);
        return null;
      }

      return action();
    },
    [onBlocked]
  );

  /**
   * Guard an invoice-related action with hold check
   */
  const guardInvoiceAction = useCallback(
    async <T>(action: () => Promise<T>, jobId: string): Promise<T | null> => {
      const holdCheck = await checkInvoiceHold(jobId);

      if (holdCheck.blocked) {
        toast.error(`Invoice blocked: ${holdCheck.reason}. Contact Ops Compliance.`);
        onBlocked?.(holdCheck);
        return null;
      }

      return action();
    },
    [onBlocked]
  );

  /**
   * Guard a scheduling-related action with hold check
   */
  const guardSchedulingAction = useCallback(
    async <T>(action: () => Promise<T>, jobId: string): Promise<T | null> => {
      const holdCheck = await checkSchedulingHold(jobId);

      if (holdCheck.blocked) {
        toast.error(`Scheduling blocked: ${holdCheck.reason}. Contact Ops Compliance.`);
        onBlocked?.(holdCheck);
        return null;
      }

      return action();
    },
    [onBlocked]
  );

  /**
   * Run hold check and return result (for manual handling)
   */
  const checkHold = useCallback(
    async (
      holdType: "commission" | "invoice" | "scheduling",
      jobId?: string | null,
      userId?: string | null
    ): Promise<HoldCheckResult> => {
      switch (holdType) {
        case "commission":
          return checkCommissionHold(jobId, userId);
        case "invoice":
          return jobId ? checkInvoiceHold(jobId) : { blocked: false, reason: null, holdId: null, holdType: null };
        case "scheduling":
          return jobId ? checkSchedulingHold(jobId) : { blocked: false, reason: null, holdId: null, holdType: null };
        default:
          return { blocked: false, reason: null, holdId: null, holdType: null };
      }
    },
    []
  );

  return {
    guardCommissionAction,
    guardInvoiceAction,
    guardSchedulingAction,
    checkHold,
  };
}
