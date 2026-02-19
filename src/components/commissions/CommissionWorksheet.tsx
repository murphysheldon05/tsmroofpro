import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorksheetData {
  contract_amount: number;
  supplements_approved: number;
  commission_percentage: number;
  advances_paid: number;
  is_flat_fee?: boolean;
  flat_fee_amount?: number;
}

interface CommissionWorksheetProps {
  data: WorksheetData;
  onChange: (data: Partial<WorksheetData>) => void;
  readOnly?: boolean;
}

export function CommissionWorksheet({ data, onChange, readOnly = false }: CommissionWorksheetProps) {
  // Keep raw typing value while an input is focused to prevent focus/caret loss
  const [editingField, setEditingField] = useState<keyof WorksheetData | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Calculate derived values in real-time
  const calculations = useMemo(() => {
    const totalJobRevenue = (data.contract_amount || 0) + (data.supplements_approved || 0);
    const grossCommission = data.is_flat_fee 
      ? (data.flat_fee_amount || 0)
      : totalJobRevenue * ((data.commission_percentage || 0) / 100);
    const netCommissionOwed = grossCommission - (data.advances_paid || 0);
    
    return {
      totalJobRevenue,
      grossCommission,
      netCommissionOwed,
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const parseNumericInput = (value: string): number => {
    // Allow transient states like "", ".", "10." while typing; on blur we normalize.
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleNumberFocus = (field: keyof WorksheetData, currentValue: number | undefined) => {
    setEditingField(field);
    setEditingValue(currentValue ? String(currentValue) : "");
  };

  const handleNumberChange = (field: keyof WorksheetData, value: string) => {
    setEditingField(field);
    setEditingValue(value);
    // Update calculations live using parsed value, but keep raw typing string in the input
    onChange({ [field]: parseNumericInput(value) });
  };

  const handleNumberBlur = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const getInputValue = (field: keyof WorksheetData, value: number | undefined) => {
    if (editingField === field) return editingValue;
    return value ? String(value) : "";
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Commission Worksheet
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter values below. Calculated fields update automatically.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Field</TableHead>
              <TableHead className="w-[200px]">Value</TableHead>
              <TableHead className="w-[100px] text-center">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Editable: Contract Amount */}
            <TableRow>
              <TableCell className="font-medium">Contract Amount</TableCell>
              <TableCell>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getInputValue("contract_amount", data.contract_amount)}
                    onFocus={() => handleNumberFocus("contract_amount", data.contract_amount)}
                    onBlur={handleNumberBlur}
                    onChange={(e) => handleNumberChange("contract_amount", e.target.value)}
                    disabled={readOnly}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Input</span>
              </TableCell>
            </TableRow>

            {/* Editable: Supplements Approved */}
            <TableRow>
              <TableCell className="font-medium">Supplements Approved</TableCell>
              <TableCell>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getInputValue("supplements_approved", data.supplements_approved)}
                    onFocus={() => handleNumberFocus("supplements_approved", data.supplements_approved)}
                    onBlur={handleNumberBlur}
                    onChange={(e) => handleNumberChange("supplements_approved", e.target.value)}
                    disabled={readOnly}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Input</span>
              </TableCell>
            </TableRow>

            {/* Calculated: Total Job Revenue */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                Total Job Revenue
              </TableCell>
              <TableCell>
                <div className={cn(
                  "px-3 py-2 rounded-md bg-secondary font-mono font-semibold",
                  "text-foreground"
                )}>
                  {formatCurrency(calculations.totalJobRevenue)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1 justify-center">
                  <Lock className="h-3 w-3" />
                  Formula
                </span>
              </TableCell>
            </TableRow>

            {/* Editable/Display: Commission Percentage */}
            <TableRow>
              <TableCell className="font-medium">Commission Percentage</TableCell>
              <TableCell>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getInputValue("commission_percentage", data.commission_percentage)}
                    onFocus={() => handleNumberFocus("commission_percentage", data.commission_percentage)}
                    onBlur={handleNumberBlur}
                    onChange={(e) => handleNumberChange("commission_percentage", e.target.value)}
                    disabled={readOnly}
                    className="pr-7"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Input</span>
              </TableCell>
            </TableRow>

            {/* Calculated: Gross Commission */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                Gross Commission
              </TableCell>
              <TableCell>
                <div className={cn(
                  "px-3 py-2 rounded-md bg-secondary font-mono font-semibold",
                  "text-foreground"
                )}>
                  {formatCurrency(calculations.grossCommission)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1 justify-center">
                  <Lock className="h-3 w-3" />
                  Formula
                </span>
              </TableCell>
            </TableRow>

            {/* Editable: Draws Paid */}
            <TableRow>
              <TableCell className="font-medium">Draws Paid</TableCell>
              <TableCell>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getInputValue("advances_paid", data.advances_paid)}
                    onFocus={() => handleNumberFocus("advances_paid", data.advances_paid)}
                    onBlur={handleNumberBlur}
                    onChange={(e) => handleNumberChange("advances_paid", e.target.value)}
                    disabled={readOnly}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Input</span>
              </TableCell>
            </TableRow>

            {/* Calculated: Net Commission Owed */}
            <TableRow className="bg-primary/10 border-t-2 border-primary/30">
              <TableCell className="font-bold flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                Net Commission Owed
              </TableCell>
              <TableCell>
                <div className={cn(
                  "px-3 py-2 rounded-md font-mono font-bold text-lg",
                  calculations.netCommissionOwed >= 0 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                )}>
                  {formatCurrency(calculations.netCommissionOwed)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1 justify-center">
                  <Lock className="h-3 w-3" />
                  Formula
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Formula Reference */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
          <p><strong>Formulas:</strong></p>
          <p>• Total Job Revenue = Contract Amount + Supplements</p>
          <p>• Gross Commission = Total Job Revenue × Commission %</p>
          <p>• Net Commission Owed = Gross Commission − Draws Paid</p>
        </div>
      </CardContent>
    </Card>
  );
}
