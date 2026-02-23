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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, User, Send, Loader2, AlertTriangle, Ban, ClipboardCheck } from "lucide-react";
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
  sales_rep_name: z.string().min(1, "Sales rep name is required"),
  rep_role: z.enum(["setter", "closer", "hybrid"]),
  commission_tier: z.enum(["15_40_60", "15_45_55", "15_50_50", "custom"]),
  custom_commission_percentage: z.number().optional(),
  contract_amount: z.number().min(0),
  supplements_approved: z.number().min(0).default(0),
  commission_percentage: z.number().min(0).max(100),
  advances_paid: z.number().min(0).default(0),
  draw_amount_requested: z.number().min(0.01, "Draw amount is required"),
});

type FormData = z.infer<typeof formSchema>;

interface DrawRequestSubmitFormProps {
  onCancel?: () => void;
}

export function DrawRequestSubmitForm({ onCancel }: DrawRequestSubmitFormProps) {
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      job_name: "",
      job_address: "",
      acculynx_job_id: "",
      job_type: "insurance",
      roof_type: "shingle",
      sales_rep_name: "",
      rep_role: "hybrid",
      commission_tier: "15_40_60",
      contract_amount: 0,
      supplements_approved: 0,
      commission_percentage: 15,
      advances_paid: 0,
      draw_amount_requested: 0,
    },
  });

  const watchJobNumber = form.watch("acculynx_job_id");
  useEffect(() => {
    if (watchJobNumber && watchJobNumber.length === 4) {
      setEnteredJobNumber(watchJobNumber);
    }
  }, [watchJobNumber]);

  const watchCommissionTier = form.watch("commission_tier");
  useEffect(() => {
    if (watchCommissionTier && watchCommissionTier !== "custom") {
      const percentage = COMMISSION_TIERS[watchCommissionTier] || 15;
      form.setValue("commission_percentage", percentage);
    }
  }, [watchCommissionTier, form]);

  const worksheetData = {
    contract_amount: form.watch("contract_amount"),
    supplements_approved: form.watch("supplements_approved"),
    commission_percentage: form.watch("commission_percentage"),
    advances_paid: form.watch("advances_paid"),
    is_flat_fee: false,
    flat_fee_amount: undefined,
  };

  const totalJobRevenue = (worksheetData.contract_amount || 0) + (worksheetData.supplements_approved || 0);
  const grossCommission = totalJobRevenue * ((worksheetData.commission_percentage || 0) / 100);
  const estimatedCommission = grossCommission - (worksheetData.advances_paid || 0);
  // Max draw = 50% of estimated commission; over $1,500 requires manager approval
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
    // net_commission_owed is a GENERATED column: gross_commission - advances_paid
    // Set advances_paid so that net_commission_owed = draw amount
    const totalRev = (data.contract_amount || 0) + (data.supplements_approved || 0);
    const gross = totalRev * (data.commission_percentage / 100);
    const advancesForDraw = Math.max(0, gross - drawAmountVal);

    try {
      await createCommission.mutateAsync({
        submission_type: "employee",
        is_draw: true,
        job_name: data.job_name,
        job_address: data.job_address,
        acculynx_job_id: data.acculynx_job_id,
        job_type: data.job_type,
        roof_type: data.roof_type,
        contract_date: data.contract_date,
        install_completion_date: data.install_completion_date || null,
        sales_rep_name: data.sales_rep_name,
        rep_role: data.rep_role,
        commission_tier: data.commission_tier,
        custom_commission_percentage: data.commission_tier === "custom" ? data.custom_commission_percentage : null,
        subcontractor_name: null,
        is_flat_fee: false,
        flat_fee_amount: null,
        contract_amount: data.contract_amount,
        supplements_approved: data.supplements_approved,
        commission_percentage: data.commission_percentage,
        advances_paid: advancesForDraw,
        commission_requested: drawAmountVal,
        is_manager_submission: isManagerSubmission,
        ...(isManagerSubmission ? { approval_stage: "pending_admin" } : {}),
      } as any);

      navigate("/commissions");
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Eligibility Checklist - at top */}
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

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Job Information
            </CardTitle>
            <CardDescription>Enter the job details for this draw request</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="job_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name / Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job or customer name" {...field} />
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

        {/* Sales Rep Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Sales Rep Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        {/* Commission Worksheet (for estimated commission) */}
        <CommissionWorksheet data={worksheetData} onChange={handleWorksheetChange} readOnly={false} />

        {/* Draw Amount Requested */}
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

        {/* Document Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Document Attachments</CardTitle>
            <CardDescription>
              Upload required documents: Signed Contract, Approved Supplements, Final Invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
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
        {!allEligibilityChecked && canSubmit === false && (
          <p className="text-center text-sm text-amber-600">
            Please confirm all eligibility requirements before submitting a draw request
          </p>
        )}
      </form>
    </Form>
  );
}
