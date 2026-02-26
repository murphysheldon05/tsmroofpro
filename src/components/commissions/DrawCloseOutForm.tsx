import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { CommissionWorksheet } from "./CommissionWorksheet";
import { CommissionSubmission, useCloseOutDraw } from "@/hooks/useCommissions";
import { DatePickerField } from "@/components/ui/date-picker-field";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

const formSchema = z.object({
  contract_amount: z.number().min(0),
  supplements_approved: z.number().min(0).default(0),
  commission_percentage: z.number().min(0).max(100),
  advances_paid: z.number().min(0).default(0),
  install_completion_date: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DrawCloseOutFormProps {
  submission: CommissionSubmission;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DrawCloseOutForm({ submission, onSuccess, onCancel }: DrawCloseOutFormProps) {
  const closeOut = useCloseOutDraw();
  const drawAmountPaid = submission.commission_requested ?? submission.net_commission_owed ?? 0;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_amount: submission.contract_amount || 0,
      supplements_approved: submission.supplements_approved || 0,
      commission_percentage: submission.commission_percentage || 15,
      advances_paid: drawAmountPaid,
      install_completion_date: submission.install_completion_date || "",
    },
  });

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
  const finalCommission = grossCommission - (worksheetData.advances_paid || 0);
  const balanceDue = finalCommission;

  const handleWorksheetChange = (data: Partial<typeof worksheetData>) => {
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof FormData, value as number);
    });
  };

  const onSubmit = async (data: FormData) => {
    try {
      await closeOut.mutateAsync({
        id: submission.id,
        data: {
          contract_amount: data.contract_amount,
          supplements_approved: data.supplements_approved,
          commission_percentage: data.commission_percentage,
          advances_paid: data.advances_paid,
          install_completion_date: data.install_completion_date || null,
        },
      });
      onSuccess();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Final Commission Close-Out header */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Final Commission Close-Out
            </CardTitle>
            <CardDescription>
              Your draw of {formatCurrency(drawAmountPaid)} has been paid. Enter the final job amounts from AccuLynx and submit to request your remaining commission. This will go through the full approval chain: Rep &rarr; Compliance &rarr; Accounting &rarr; Paid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Draw Paid</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">{formatCurrency(drawAmountPaid)}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Final Commission</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(grossCommission)}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance Due</p>
                <p className="text-lg font-bold text-primary mt-1">{formatCurrency(balanceDue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Balance Due = Final Commission &minus; Draw Already Paid (included in Advances)
            </p>
          </CardContent>
        </Card>

        {/* Commission Worksheet — editable for final amounts */}
        <CommissionWorksheet data={worksheetData} onChange={handleWorksheetChange} readOnly={false} />

        {/* Install Completion Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Completion</CardTitle>
            <CardDescription>
              When was the job completed?
            </CardDescription>
          </CardHeader>
          <CardContent>
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

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={closeOut.isPending}
            className="min-w-[180px] bg-emerald-600 hover:bg-emerald-700"
          >
            {closeOut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Final Commission
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
