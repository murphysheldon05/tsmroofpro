import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, FileSpreadsheet, Paperclip, Send, Loader2 } from "lucide-react";
import { CommissionWorksheet } from "./CommissionWorksheet";
import { CommissionAttachments } from "./CommissionAttachments";
import { useCreateCommission, useSalesReps, COMMISSION_TIERS } from "@/hooks/useCommissions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DatePickerField } from "@/components/ui/date-picker-field";

const formSchema = z.object({
  // Job Information
  job_name: z.string().min(1, "Job name is required"),
  job_address: z.string().min(1, "Job address is required"),
  acculynx_job_id: z.string().optional(),
  job_type: z.enum(["insurance", "retail", "hoa"]),
  roof_type: z.enum(["shingle", "tile", "flat", "foam", "other"]),
  contract_date: z.date(),
  install_completion_date: z.date().optional(),
  
  // Sales Rep Info
  sales_rep_name: z.string().min(1, "Sales rep name is required"),
  rep_role: z.enum(["setter", "closer", "hybrid"]),
  commission_tier: z.enum(["15_40_60", "15_45_55", "15_50_50", "custom"]),
  custom_commission_percentage: z.number().optional(),
  
  // Subcontractor variant
  submission_type: z.enum(["employee", "subcontractor"]).default("employee"),
  subcontractor_name: z.string().optional(),
  is_flat_fee: z.boolean().default(false),
  flat_fee_amount: z.number().optional(),
  
  // Worksheet data
  contract_amount: z.number().min(0),
  supplements_approved: z.number().min(0).default(0),
  commission_percentage: z.number().min(0).max(100),
  advances_paid: z.number().min(0).default(0),
});

type FormData = z.infer<typeof formSchema>;

interface CommissionSubmitFormProps {
  variant?: "employee" | "subcontractor";
}

export function CommissionSubmitForm({ variant = "employee" }: CommissionSubmitFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createCommission = useCreateCommission();
  const { data: salesReps } = useSalesReps();
  const [attachments, setAttachments] = useState<File[]>([]);

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
    },
  });

  const isSubcontractor = variant === "subcontractor";
  const watchCommissionTier = form.watch("commission_tier");
  const watchIsFlatFee = form.watch("is_flat_fee");

  // Update commission percentage when tier changes
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
    is_flat_fee: form.watch("is_flat_fee"),
    flat_fee_amount: form.watch("flat_fee_amount"),
  };

  const handleWorksheetChange = (data: Partial<typeof worksheetData>) => {
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof FormData, value as number);
    });
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createCommission.mutateAsync({
        submission_type: variant,
        job_name: data.job_name,
        job_address: data.job_address,
        acculynx_job_id: data.acculynx_job_id || null,
        job_type: data.job_type,
        roof_type: data.roof_type,
        contract_date: data.contract_date.toISOString().split("T")[0],
        install_completion_date: data.install_completion_date?.toISOString().split("T")[0] || null,
        sales_rep_name: isSubcontractor ? null : data.sales_rep_name,
        rep_role: isSubcontractor ? null : data.rep_role,
        commission_tier: isSubcontractor ? null : data.commission_tier,
        custom_commission_percentage: data.commission_tier === "custom" ? data.custom_commission_percentage : null,
        subcontractor_name: isSubcontractor ? data.subcontractor_name : null,
        is_flat_fee: isSubcontractor ? data.is_flat_fee : false,
        flat_fee_amount: isSubcontractor && data.is_flat_fee ? data.flat_fee_amount : null,
        contract_amount: data.contract_amount,
        supplements_approved: data.supplements_approved,
        commission_percentage: data.commission_percentage,
        advances_paid: data.advances_paid,
      });
      
      navigate("/commissions");
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Job Information */}
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
                  <DatePickerField
                    value={field.value instanceof Date ? field.value : field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date)}
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
                    value={field.value instanceof Date ? field.value : field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date)}
                    placeholder="Select completion date"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 2: Sales Rep / Subcontractor Information */}
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                            <SelectItem key={rep.id} value={rep.full_name}>
                              {rep.full_name}
                            </SelectItem>
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

        {/* Section 3: Embedded Commission Worksheet */}
        <CommissionWorksheet
          data={worksheetData}
          onChange={handleWorksheetChange}
          readOnly={false}
        />

        {/* Section 4: Document Attachments */}
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
            <CommissionAttachments
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/commissions")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createCommission.isPending}
            className="min-w-[150px]"
          >
            {createCommission.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Commission
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
