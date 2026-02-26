import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, User, Send, Loader2, AlertTriangle, Ban, ClipboardCheck, Paperclip } from "lucide-react";
import { CommissionWorksheet } from "./CommissionWorksheet";
import { CommissionAttachments } from "./CommissionAttachments";
import { useCreateCommission, useSalesReps, COMMISSION_TIERS } from "@/hooks/useCommissions";
import { useIsJobNumberDenied } from "@/hooks/useGovernedCommissionWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { toast } from "sonner";
import { DatePickerField } from "@/components/ui/date-picker-field";

const DRAW_ELIGIBILITY_ITEMS = [
  "Signed contract received",
  "Deposit received from homeowner",
  "Job number assigned in AccuLynx",
  "Job is on the build schedule",
  "Meet-for-color completed",
  "Full scope and estimate completed",
] as const;

const formSchema = z.object({
  job_name: z.string().min(1, "Job name is required"),
  job_address: z.string().min(1, "Job address is required"),
  acculynx_job_id: z.string()
    .min(4, "AccuLynx Job Number must be exactly 4 digits")
    .max(4, "AccuLynx Job Number must be exactly 4 digits")
    .regex(/^\d{4}$/, "Must be exactly 4 digits"),
  job_type: z.enum(["insurance", "retail", "hoa"]),
  roof_type: z.enum(["shingle", "tile", "flat", "foam", "other"]),
  contract_date: z.string().min(1, "Contract date is required"),
  install_completion_date: z.string().optional(),
  sales_rep_name: z.string().optional(),
  rep_role: z.enum(["setter", "closer", "hybrid"]),
  commission_tier: z.enum(["15_40_60", "15_45_55", "15_50_50", "custom"]),
  custom_commission_percentage: z.number().optional(),
  submission_type: z.enum(["employee", "subcontractor"]).default("employee"),
  subcontractor_name: z.string().optional(),
  is_flat_fee: z.boolean().default(false),
  flat_fee_amount: z.number().optional(),
  contract_amount: z.number().min(0),
  supplements_approved: z.number().min(0).default(0),
  commission_percentage: z.number().min(0).max(100),
  advances_paid: z.number().min(0).default(0),
  draw_amount_requested: z.number().min(0.01, "Draw amount is required"),
  draw_request_notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.submission_type === "employee") return !!(data.sales_rep_name && data.sales_rep_name.trim());
    return true;
  },
  { message: "Sales rep name is required", path: ["sales_rep_name"] }
).refine(
  (data) => {
    if (data.submission_type === "subcontractor") return !!(data.subcontractor_name && data.subcontractor_name.trim());
    return true;
  },
  { message: "Subcontractor name is required", path: ["subcontractor_name"] }
);

type FormData = z.infer<typeof formSchema>;

interface DrawRequestSubmitFormProps {
  onCancel?: () => void;
  variant?: "employee" | "subcontractor";
}

export function DrawRequestSubmitForm({ onCancel, variant = "employee" }: DrawRequestSubmitFormProps) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const createCommission = useCreateCommission();
  const { data: salesReps } = useSalesReps();
  const { data: holds } = useUserHoldsCheck();
  const hasCommissionHold = holds?.some(h => h.hold_type === "commission_hold");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [eligibility, setEligibility] = useState<Record<string, boolean>>(
    DRAW_ELIGIBILITY_ITEMS.reduce((acc, item) => ({ ...acc, [item]: false }), {})
  );
  const [enteredJobNumber, setEnteredJobNumber] = useState<string>("");
  const { data: isJobDenied } = useIsJobNumberDenied(enteredJobNumber);
  const isManagerSubmission = role === "manager" || role === "admin" || role === "sales_manager";
  const isSubcontractor = variant === "subcontractor";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      submission_type: variant,
      job_name: "",
      job_address: "",
      acculynx_job_id: "",
      job_type: "insurance",
      roof_type: "shingle",
      sales_rep_name: "",
      rep_role: "hybrid",
      commission_tier: "15_40_60",
      is_flat_fee: false,
      contract_amount: 0,
      supplements_approved: 0,
      commission_percentage: 15,
      advances_paid: 0,
      draw_amount_requested: 0,
      draw_request_notes: "",
    },
  });

  const watchJobNumber = form.watch("acculynx_job_id");
  useEffect(() => {
    if (watchJobNumber && watchJobNumber.length === 4) {
      setEnteredJobNumber(watchJobNumber);
    }
  }, [watchJobNumber]);

  const watchCommissionTier = form.watch("commission_tier");
  const watchIsFlatFee = form.watch("is_flat_fee");
  useEffect(() => {
    if (!isSubcontractor && watchCommissionTier && watchCommissionTier !== "custom") {
      const percentage = COMMISSION_TIERS[watchCommissionTier] || 15;
      form.setValue("commission_percentage", percentage);
    }
  }, [watchCommissionTier, form, isSubcontractor]);

  const worksheetData = {
    contract_amount: form.watch("contract_amount"),
    supplements_approved: form.watch("supplements_approved"),
    commission_percentage: form.watch("commission_percentage"),
    advances_paid: form.watch("advances_paid"),
    is_flat_fee: form.watch("is_flat_fee"),
    flat_fee_amount: form.watch("flat_fee_amount"),
  };

  const totalJobRevenue = (worksheetData.contract_amount || 0) + (worksheetData.supplements_approved || 0);
  const grossCommission = worksheetData.is_flat_fee
    ? (worksheetData.flat_fee_amount || 0)
    : totalJobRevenue * ((worksheetData.commission_percentage || 0) / 100);
  const estimatedCommission = grossCommission - (worksheetData.advances_paid || 0);
  const maxDrawFromEstimate = estimatedCommission > 0 ? estimatedCommission * 0.5 : 1500;
  const drawAmount = form.watch("draw_amount_requested") || 0;
  const exceedsCap = estimatedCommission > 0 && drawAmount > maxDrawFromEstimate;
  const needsEstimateForOver1500 = drawAmount > 1500 && estimatedCommission <= 0;

  const handleWorksheetChange = (data: Partial<typeof worksheetData>) => {
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof FormData, value as number);
    });
  };

  const allEligibilityChecked = DRAW_ELIGIBILITY_ITEMS.every((item) => eligibility[item]);
  const canSubmit =
    allEligibilityChecked &&
    !hasCommissionHold &&
    !exceedsCap &&
    !needsEstimateForOver1500 &&
    drawAmount > 0;

  const onSubmit = async (data: FormData) => {
    if (!canSubmit) return;
    if (isJobDenied) {
      toast.error("This job has been denied");
      return;
    }
    if (exceedsCap) {
      toast.error("Draw amount exceeds 50% of estimated commission");
      return;
    }
    if (needsEstimateForOver1500) {
      toast.error("Please enter estimated commission to request more than $1,500");
      return;
    }

    const drawAmountVal = data.draw_amount_requested;
    const totalRev = (data.contract_amount || 0) + (data.supplements_approved || 0);
    const gross = data.is_flat_fee
      ? (data.flat_fee_amount || 0)
      : totalRev * (data.commission_percentage / 100);
    const advancesForDraw = Math.max(0, gross - drawAmountVal);

    try {
      await createCommission.mutateAsync({
        submission_type: variant,
        is_draw: true,
        job_name: data.job_name,
        job_address: data.job_address,
        acculynx_job_id: data.acculynx_job_id,
        job_type: data.job_type,
        roof_type: data.roof_type,
        contract_date: data.contract_date,
        install_completion_date: data.install_completion_date || null,
        sales_rep_name: isSubcontractor ? null : (data.sales_rep_name || null),
        rep_role: isSubcontractor ? null : data.rep_role,
        commission_tier: isSubcontractor ? null : data.commission_tier,
        custom_commission_percentage: data.commission_tier === "custom" ? data.custom_commission_percentage : null,
        subcontractor_name: isSubcontractor ? data.subcontractor_name : null,
        is_flat_fee: isSubcontractor ? data.is_flat_fee : false,
        flat_fee_amount: isSubcontractor && data.is_flat_fee ? data.flat_fee_amount : null,
        contract_amount: data.contract_amount,
        supplements_approved: data.supplements_approved,
        commission_percentage: data.commission_percentage,
        advances_paid: advancesForDraw,
        commission_requested: drawAmountVal,
        reviewer_notes: data.draw_request_notes?.trim() || null,
        is_manager_submission: isManagerSubmission,
        ...(isManagerSubmission ? { approval_stage: "pending_admin" } : {}),
      } as any);

      navigate("/commissions");
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Label */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5 text-center">
          <h2 className="text-xl font-bold text-amber-700 dark:text-amber-400">
            Draw Request &mdash; 50% of Projected Commission
          </h2>
          {estimatedCommission > 0 && (
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Projected Commission: <span className="font-bold text-foreground">{formatCurrencyDisplay(estimatedCommission)}</span>
              </span>
              <span className="text-amber-700 dark:text-amber-400">
                Draw Amount (50%): <span className="font-bold">{formatCurrencyDisplay(estimatedCommission * 0.5)}</span>
              </span>
            </div>
          )}
        </div>

        {/* 1. Eligibility Checklist — at top */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ClipboardCheck className="h-5 w-5" />
              Draw Eligibility Checklist
            </CardTitle>
            <CardDescription>
              Confirm all requirements before submitting. All boxes must be checked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {DRAW_ELIGIBILITY_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Checkbox
                    id={`eligibility-${item}`}
                    checked={eligibility[item]}
                    onCheckedChange={(checked) =>
                      setEligibility((prev) => ({ ...prev, [item]: !!checked }))
                    }
                  />
                  <label htmlFor={`eligibility-${item}`} className="text-sm font-medium cursor-pointer select-none">
                    {item}
                  </label>
                </li>
              ))}
            </ul>
            {!allEligibilityChecked && (
              <p className="mt-4 text-sm text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Please confirm all eligibility requirements before submitting a draw request
              </p>
            )}
          </CardContent>
        </Card>

        {hasCommissionHold && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have an active commission hold. Draw requests are blocked.
            </AlertDescription>
          </Alert>
        )}

        {/* 2. Job Information — identical to CommissionSubmitForm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Job Information
            </CardTitle>
            <CardDescription>Enter the job details for this commission</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="job_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name / Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job or customer name" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="job_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acculynx_job_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AccuLynx Job Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="4-digit job number"
                      maxLength={4}
                      {...field}
                      className={isJobDenied ? "border-destructive" : ""}
                    />
                  </FormControl>
                  <FormDescription>Enter the 4-digit AccuLynx Job Number (required)</FormDescription>
                  {isJobDenied && (
                    <Alert variant="destructive" className="mt-2">
                      <Ban className="h-4 w-4" />
                      <AlertDescription>This job has been denied and cannot be resubmitted.</AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="job_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="hoa">HOA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roof_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roof Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select roof type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="shingle">Shingle</SelectItem>
                      <SelectItem value="tile">Tile</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="foam">Foam</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contract_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Date *</FormLabel>
                  <DatePickerField value={field.value} onChange={field.onChange} placeholder="Select contract date" />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="install_completion_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Install Completion Date</FormLabel>
                  <DatePickerField value={field.value} onChange={field.onChange} placeholder="Select completion date" />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 3. Sales Rep / Subcontractor Information — identical to CommissionSubmitForm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isSubcontractor ? "Subcontractor / Referral Partner Information" : "Sales Rep Information"}
            </CardTitle>
            <CardDescription>
              {isSubcontractor
                ? "Enter the subcontractor or referral partner details"
                : "Enter the sales representative details"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isSubcontractor ? (
              <>
                <FormField
                  control={form.control}
                  name="subcontractor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcontractor / Referral Partner Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="is_flat_fee"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label>Use Flat Fee (instead of percentage)</Label>
                      </FormItem>
                    )}
                  />
                </div>
                {watchIsFlatFee && (
                  <FormField
                    control={form.control}
                    name="flat_fee_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat Fee Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              className="pl-7"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="sales_rep_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Rep Name *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sales rep" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesReps?.map((rep) => (
                            <SelectItem key={rep.id} value={rep.full_name}>{rep.full_name}</SelectItem>
                          ))}
                          {(!salesReps || salesReps.length === 0) && (
                            <SelectItem value="manual">Enter manually</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rep_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rep Role *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="setter">Setter</SelectItem>
                          <SelectItem value="closer">Closer</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commission_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Tier *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15_40_60">15 / 40 / 60</SelectItem>
                          <SelectItem value="15_45_55">15 / 45 / 55</SelectItem>
                          <SelectItem value="15_50_50">15 / 50 / 50</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchCommissionTier === "custom" && (
                  <FormField
                    control={form.control}
                    name="custom_commission_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Commission % *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="pr-7"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                form.setValue("commission_percentage", value);
                              }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Commission Worksheet — identical to CommissionSubmitForm */}
        <CommissionWorksheet data={worksheetData} onChange={handleWorksheetChange} readOnly={false} />

        {/* 5. Draw Amount Requested — draw-specific */}
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400">Draw Amount Requested *</CardTitle>
            <CardDescription>
              Maximum is 50% of estimated commission above, capped at $1,500 without manager approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="draw_amount_requested"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  {estimatedCommission > 0 && (
                    <FormDescription>
                      Max draw: ${(estimatedCommission * 0.5).toLocaleString()} (50% of ${estimatedCommission.toLocaleString()} estimated)
                    </FormDescription>
                  )}
                  {exceedsCap && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Amount exceeds 50% of estimated commission
                    </p>
                  )}
                  {needsEstimateForOver1500 && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Enter contract/commission data above to request more than $1,500
                    </p>
                  )}
                  {drawAmount > 1500 && !needsEstimateForOver1500 && !exceedsCap && (
                    <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Draws over $1,500 require Sales Manager approval
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 6. Document Attachments — identical to CommissionSubmitForm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Document Attachments
            </CardTitle>
            <CardDescription>
              Upload required documents: Signed Contract, Approved Supplements, Final Invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
          </CardContent>
        </Card>

        {/* 7. Request / Notes — at bottom */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request / Notes</CardTitle>
            <CardDescription>
              Optional notes or context for this draw request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="draw_request_notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes or context for this draw request..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel || (() => navigate("/commissions"))}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || createCommission.isPending || hasCommissionHold}
            className="min-w-[150px] bg-amber-600 hover:bg-amber-700"
          >
            {createCommission.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Draw Request
              </>
            )}
          </Button>
        </div>
        {!allEligibilityChecked && (
          <p className="text-center text-sm text-amber-600">
            Please confirm all eligibility requirements before submitting a draw request
          </p>
        )}
      </form>
    </Form>
  );
}
