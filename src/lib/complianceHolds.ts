// Compliance Hold Checking System
// 
// This module provides hold validation for governed actions.
// 
// USAGE EXAMPLES:
//
// 1. Check for holds before an action:
// ```tsx
// import { useHoldGuardedAction } from "@/hooks/useHoldGuardedAction";
// 
// const { guardCommissionAction } = useHoldGuardedAction();
// 
// const handleSubmit = async () => {
//   const result = await guardCommissionAction(
//     () => submitCommission(data),
//     jobId,
//     userId
//   );
//   // result is null if blocked, otherwise the action result
// };
// ```
//
// 2. Display hold warnings on a page:
// ```tsx
// import { useJobHoldsCheck } from "@/hooks/useComplianceHoldCheck";
// import { HoldWarningBanner } from "@/components/compliance/HoldWarningBanner";
// 
// const { data: holds } = useJobHoldsCheck(jobId);
// 
// return (
//   <>
//     <HoldWarningBanner holds={holds || []} context="commission" />
//     {/* rest of page */}
//   </>
// );
// ```
//
// 3. Check holds manually before enabling a button:
// ```tsx
// import { checkCommissionHold } from "@/hooks/useComplianceHoldCheck";
// 
// const [isBlocked, setIsBlocked] = useState(false);
// 
// useEffect(() => {
//   checkCommissionHold(jobId, userId).then(result => {
//     setIsBlocked(result.blocked);
//   });
// }, [jobId, userId]);
// 
// return <Button disabled={isBlocked}>Submit</Button>;
// ```

export {
  checkCommissionHold,
  checkInvoiceHold,
  checkSchedulingHold,
  checkAccessHold,
  useAccessHoldCheck,
  useJobHoldsCheck,
  useUserHoldsCheck,
  type HoldCheckResult,
} from "@/hooks/useComplianceHoldCheck";

export { useHoldGuardedAction } from "@/hooks/useHoldGuardedAction";

export { HoldWarningBanner, HoldIndicator } from "@/components/compliance/HoldWarningBanner";
export { AccessHoldScreen } from "@/components/compliance/AccessHoldScreen";
