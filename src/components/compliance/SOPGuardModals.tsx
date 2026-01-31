import { SOPAcknowledgmentGate } from "./SOPAcknowledgmentGate";
import { SOPActionBlocker } from "./SOPActionBlocker";

interface SOPGuardModalsProps {
  showBlocker: boolean;
  onBlockerClose: () => void;
  openAcknowledgmentGate: () => void;
  showAcknowledgmentGate: boolean;
  onAcknowledgmentGateClose: () => void;
  onAcknowledged?: () => void;
}

/**
 * Renders both the action blocker and acknowledgment gate modals.
 * Use this component alongside useSOPActionGuard hook.
 * 
 * @example
 * ```tsx
 * const guard = useSOPActionGuard();
 * 
 * const handleSubmit = async () => {
 *   await guard.guardAction(async () => {
 *     // Your governed action here
 *     await submitCommission(data);
 *   });
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleSubmit}>Submit</Button>
 *     <SOPGuardModals {...guard} onAcknowledged={guard.retryPendingAction} />
 *   </>
 * );
 * ```
 */
export function SOPGuardModals({
  showBlocker,
  onBlockerClose,
  openAcknowledgmentGate,
  showAcknowledgmentGate,
  onAcknowledgmentGateClose,
  onAcknowledged,
}: SOPGuardModalsProps) {
  return (
    <>
      <SOPActionBlocker
        open={showBlocker}
        onClose={onBlockerClose}
        onAcknowledgeNow={openAcknowledgmentGate}
      />
      <SOPAcknowledgmentGate
        open={showAcknowledgmentGate}
        onClose={onAcknowledgmentGateClose}
        onAcknowledged={onAcknowledged}
      />
    </>
  );
}
