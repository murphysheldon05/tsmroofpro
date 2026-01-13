import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, User, AlertCircle, Save, Loader2 } from "lucide-react";
import { CommissionWorksheet } from "./CommissionWorksheet";
import { CommissionSubmission, useUpdateCommission, useSalesReps, COMMISSION_TIERS } from "@/hooks/useCommissions";
import { toast } from "sonner";
import { DatePickerField } from "@/components/ui/date-picker-field";

const formSchema = z.object({
  job_name: z.string().min(1, "Job name is required"),
  job_address: z.string().min(1, "Job address is required"),
  acculynx_job_id: z.string().optional(),
  job_type: z.enum(["insurance", "retail", "hoa"]),
  roof_type: z.enum(["shingle", "tile", "flat", "foam", "other"]),
  contract_date: z.string().min(1, "Contract date is required"),
  install_completion_date: z.string().optional(),
  sales_rep_name: z.string().optional(),
  rep_role: z.enum(["setter", "closer", "hybrid"]).optional(),
  commission_tier: z.enum(["15_40_60", "15_45_55", "15_50_50", "custom"]).optional(),
  custom_commission_percentage: z.number().optional(),
  subcontractor_name: z.string().optional(),
  is_flat_fee: z.boolean().default(false),
  flat_fee_amount: z.number().optional(),
  contract_amount: z.number().min(0),
  supplements_approved: z.number().min(0).default(0),
  commission_percentage: z.number().min(0).max(100),
  advances_paid: z.number().min(0).default(0),
});

type FormData = z.infer<typeof formSchema>;

interface CommissionEditFormProps {
  submission: CommissionSubmission;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CommissionEditForm({ submission, onSuccess, onCancel }: CommissionEditFormProps) {
  const updateCommission = useUpdateCommission();
  const { data: salesReps } = useSalesReps();
  
  const isSubcontractor = submission.submission_type === "subcontractor";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      job_name: submission.job_name,
      job_address: submission.job_address,
      acculynx_job_id: submission.acculynx_job_id || "",
      job_type: submission.job_type as "insurance" | "retail" | "hoa",
      roof_type: submission.roof_type as "shingle" | "tile" | "flat" | "foam" | "other",
      contract_date: submission.contract_date,
      install_completion_date: submission.install_completion_date || "",
      sales_rep_name: submission.sales_rep_name || "",
      rep_role: (submission.rep_role as "setter" | "closer" | "hybrid") || "hybrid",
      commission_tier: (submission.commission_tier as "15_40_60" | "15_45_55" | "15_50_50" | "custom") || "15_40_60",
      custom_commission_percentage: submission.custom_commission_percentage || undefined,
      subcontractor_name: submission.subcontractor_name || "",
      is_flat_fee: submission.is_flat_fee || false,
      flat_fee_amount: submission.flat_fee_amount || undefined,
      contract_amount: submission.contract_amount,
      supplements_approved: submission.supplements_approved,
      commission_percentage: submission.commission_percentage,
      advances_paid: submission.advances_paid,
    },
  });

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

  const handleWorksheetChange = (data: Partial<typeof worksheetData>) => {
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof FormData, value as number);
    });
  };

  const onSubmit = async (data: FormData) => {
    // Calculate totals
    const totalJobRevenue = data.contract_amount + data.supplements_approved;
    const grossCommission = data.is_flat_fee 
      ? (data.flat_fee_amount || 0)
      : totalJobRevenue * (data.commission_percentage / 100);
    const netCommissionOwed = grossCommission - data.advances_paid;

    try {
      await updateCommission.mutateAsync({
        id: submission.id,
        data: {
          job_name: data.job_name,
          job_address: data.job_address,
          acculynx_job_id: data.acculynx_job_id || null,
          job_type: data.job_type as CommissionSubmission["job_type"],
          roof_type: data.roof_type as CommissionSubmission["roof_type"],
          contract_date: data.contract_date,
          install_completion_date: data.install_completion_date || null,
          sales_rep_name: isSubcontractor ? null : (data.sales_rep_name || null),
          rep_role: isSubcontractor ? null : (data.rep_role || null),
          commission_tier: isSubcontractor ? null : (data.commission_tier || null),
          custom_commission_percentage: data.commission_tier === "custom" ? data.custom_commission_percentage : null,
          subcontractor_name: isSubcontractor ? data.subcontractor_name : null,
          is_flat_fee: isSubcontractor ? data.is_flat_fee : false,
          flat_fee_amount: isSubcontractor && data.is_flat_fee ? data.flat_fee_amount : null,
          contract_amount: data.contract_amount,
          supplements_approved: data.supplements_approved,
          commission_percentage: data.commission_percentage,
          advances_paid: data.advances_paid,
          total_job_revenue: totalJobRevenue,
          gross_commission: grossCommission,
          net_commission_owed: netCommissionOwed,
        },
      });
      onSuccess();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Revision Alert */}
        {submission.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Revision Required:</strong> {submission.rejection_reason}
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
            <CardDescription>Update the job details</CardDescription>
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
                  <FormLabel>AccuLynx Job ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter AccuLynx ID" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select contract date"
                  />
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
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select completion date"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sales Rep / Subcontractor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isSubcontractor ? "Subcontractor Information" : "Sales Rep Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isSubcontractor ? (
              <>
                <FormField
                  control={form.control}
                  name="subcontractor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcontractor Name *</FormLabel>
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label>Use Flat Fee</Label>
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
                              value={field.value || ""}
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
                            <SelectItem key={rep.id} value={rep.full_name}>
                              {rep.full_name}
                            </SelectItem>
                          ))}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                              step="0.1"
                              className="pr-7"
                              placeholder="15" 
                              value={field.value || ""}
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

        {/* Commission Worksheet */}
        <CommissionWorksheet
          data={worksheetData}
          onChange={handleWorksheetChange}
          readOnly={false}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateCommission.isPending} className="gap-2">
            {updateCommission.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save & Resubmit
          </Button>
        </div>
      </form>
    </Form>
  );
}
