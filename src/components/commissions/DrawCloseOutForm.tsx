import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { CommissionWorksheet } from "./CommissionWorksheet";
import { CommissionSubmission, useCloseOutDraw } from "@/hooks/useCommissions";
import { DatePickerField } from "@/components/ui/date-picker-field";

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
        {/* Close Out Job — Request Final Commission */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Close Out Job — Request Final Commission
            </CardTitle>
            <CardDescription>
              Your draw of ${drawAmountPaid.toLocaleString()} has been paid. Enter the final job amounts and submit to request your remaining commission. This will go through the full approval chain: Rep → Compliance → Accounting → Paid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Draw paid: ${drawAmountPaid.toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-1">
                Enter the final contract amount, supplements, and advances below. The advances should include the draw amount ({drawAmountPaid.toLocaleString()}).
              </p>
            </div>
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
