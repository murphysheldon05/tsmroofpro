import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCommissionReps, useCommissionPayTypes, type CommissionRep, type CommissionPayType } from "@/hooks/useCommissionEntries";
import * as XLSX from "xlsx";

// Expected column headers (case-insensitive matching)
const COLUMN_MAP: Record<string, string> = {
  rep: "rep_name",
  "rep name": "rep_name",
  "sales rep": "rep_name",
  "rep_name": "rep_name",
  job: "job",
  "job #": "job",
  "job number": "job",
  customer: "customer",
  "customer name": "customer",
  "approved date": "approved_date",
  "approved_date": "approved_date",
  "approval date": "approved_date",
  "job value": "job_value",
  "job_value": "job_value",
  "contract value": "job_value",
  "amount paid": "amount_paid",
  "amount_paid": "amount_paid",
  amount: "amount_paid",
  paid: "amount_paid",
  "paid date": "paid_date",
  "paid_date": "paid_date",
  "pay date": "paid_date",
  date: "paid_date",
  "check type": "check_type",
  "check_type": "check_type",
  "payment method": "check_type",
  notes: "notes",
  "pay type": "pay_type_name",
  "pay_type": "pay_type_name",
  type: "pay_type_name",
  "earned comm": "earned_comm",
  "earned_comm": "earned_comm",
  "earned commission": "earned_comm",
  commission: "earned_comm",
  "applied bank": "applied_bank",
  "applied_bank": "applied_bank",
  "draw applied": "applied_bank",
  bank: "applied_bank",
};

interface ParsedRow {
  rep_name?: string;
  job?: string;
  customer?: string;
  approved_date?: string;
  job_value?: number;
  amount_paid?: number;
  paid_date?: string;
  check_type?: string;
  notes?: string;
  pay_type_name?: string;
  earned_comm?: number;
  applied_bank?: number;
}

interface ValidationResult {
  row: number;
  errors: string[];
  data: ParsedRow;
  rep?: CommissionRep;
  payType?: CommissionPayType;
}

function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  // If it's a string, try to parse it
  const str = String(value).trim();
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Try MM/DD/YYYY or M/D/YYYY
  const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const y = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
    return `${y}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  // Try Date parse as fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return undefined;
}

function parseNumber(value: any): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  // Remove $ and commas
  const cleaned = String(value).replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [defaultPayType, setDefaultPayType] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: reps = [] } = useCommissionReps();
  const { data: payTypes = [] } = useCommissionPayTypes();

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setParsedRows([]);
    setValidationResults([]);
    setImportedCount(0);
    setErrorCount(0);
    setDefaultPayType("");
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (rawData.length === 0) {
        toast.error("No data found in spreadsheet");
        return;
      }

      // Map columns
      const headers = Object.keys(rawData[0]);
      const columnMapping: Record<string, string> = {};
      headers.forEach((h) => {
        const normalized = h.toLowerCase().trim();
        if (COLUMN_MAP[normalized]) {
          columnMapping[h] = COLUMN_MAP[normalized];
        }
      });

      const rows: ParsedRow[] = rawData.map((raw) => {
        const row: any = {};
        Object.entries(raw).forEach(([key, value]) => {
          const mapped = columnMapping[key];
          if (!mapped) return;
          if (mapped === "rep_name" || mapped === "job" || mapped === "customer" || mapped === "check_type" || mapped === "notes" || mapped === "pay_type_name") {
            row[mapped] = value ? String(value).trim() : undefined;
          } else if (mapped === "approved_date" || mapped === "paid_date") {
            row[mapped] = parseExcelDate(value);
          } else {
            row[mapped] = parseNumber(value);
          }
        });
        return row;
      });

      // Filter out empty rows
      const filtered = rows.filter((r) => r.rep_name || r.amount_paid || r.paid_date);
      setParsedRows(filtered);

      // Validate
      const results = validateRows(filtered, reps, payTypes);
      setValidationResults(results);
      setStep("preview");
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Failed to parse file. Make sure it's a valid Excel or CSV file.");
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  function validateRows(rows: ParsedRow[], reps: CommissionRep[], payTypes: CommissionPayType[]): ValidationResult[] {
    return rows.map((data, idx) => {
      const errors: string[] = [];
      let rep: CommissionRep | undefined;
      let payType: CommissionPayType | undefined;

      // Match rep
      if (!data.rep_name) {
        errors.push("Missing rep name");
      } else {
        rep = reps.find((r) => r.name.toLowerCase() === data.rep_name!.toLowerCase());
        if (!rep) errors.push(`Unknown rep: "${data.rep_name}"`);
      }

      // Match pay type
      if (data.pay_type_name) {
        payType = payTypes.find((pt) => pt.name.toLowerCase() === data.pay_type_name!.toLowerCase());
        if (!payType) errors.push(`Unknown pay type: "${data.pay_type_name}"`);
      }

      // Required fields
      if (data.amount_paid == null || isNaN(data.amount_paid)) errors.push("Missing or invalid amount");
      if (!data.paid_date) errors.push("Missing paid date");

      return { row: idx + 2, errors, data, rep, payType };
    });
  }

  const validRows = validationResults.filter((r) => r.errors.length === 0);
  const invalidRows = validationResults.filter((r) => r.errors.length > 0);

  // Re-validate when default pay type changes
  const getPayTypeForRow = (result: ValidationResult): CommissionPayType | undefined => {
    if (result.payType) return result.payType;
    if (defaultPayType) return payTypes.find((pt) => pt.id === defaultPayType);
    return undefined;
  };

  const importableRows = validationResults.filter((r) => {
    if (r.errors.some((e) => e.startsWith("Missing rep") || e.startsWith("Unknown rep") || e.startsWith("Missing or invalid") || e.startsWith("Missing paid"))) return false;
    // Check if pay type resolved
    if (!r.payType && !defaultPayType) return false;
    return true;
  });

  const handleImport = async () => {
    setStep("importing");
    let imported = 0;
    let errors = 0;

    // Batch insert in chunks of 100
    const batchSize = 100;
    const toInsert = importableRows.map((r) => {
      const pt = getPayTypeForRow(r);
      return {
        rep_id: r.rep!.id,
        job: r.data.job || null,
        customer: r.data.customer || null,
        approved_date: r.data.approved_date || null,
        job_value: r.data.job_value ?? null,
        amount_paid: r.data.amount_paid!,
        paid_date: r.data.paid_date!,
        check_type: r.data.check_type || null,
        notes: r.data.notes || null,
        pay_type_id: pt!.id,
        earned_comm: r.data.earned_comm ?? null,
        applied_bank: r.data.applied_bank ?? null,
        has_paid: true,
      };
    });

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("commission_entries").insert(batch);
      if (error) {
        console.error("Import batch error:", error);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    setImportedCount(imported);
    setErrorCount(errors);
    setStep("done");

    queryClient.invalidateQueries({ queryKey: ["commission-entries"] });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-white border-white/20 hover:bg-white/10"
        onClick={() => { reset(); setOpen(true); }}
      >
        <Upload className="h-4 w-4" />
        Import Excel
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Import Commission Entries
            </DialogTitle>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drop an Excel or CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, and .csv files</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Choose File
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Expected columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Rep Name*", "Amount Paid*", "Paid Date*", "Pay Type", "Job #", "Customer", "Job Value", "Approved Date", "Check Type", "Notes", "Earned Comm", "Applied Bank"].map((col) => (
                    <Badge key={col} variant={col.endsWith("*") ? "default" : "secondary"} className="text-[10px]">
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">* = Required. Rep names must match existing reps. Columns are matched by header name (case-insensitive).</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {fileName}
                </Badge>
                <Badge variant="outline">{parsedRows.length} rows</Badge>
                {importableRows.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {importableRows.length} ready
                  </Badge>
                )}
                {invalidRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {invalidRows.length} issues
                  </Badge>
                )}
              </div>

              {/* Default pay type selector for rows missing pay type */}
              {validationResults.some((r) => !r.payType && !r.errors.some((e) => e.startsWith("Unknown pay type"))) && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Some rows have no pay type</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">Select a default to use for these rows:</p>
                  </div>
                  <Select value={defaultPayType} onValueChange={setDefaultPayType}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {payTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Row</th>
                      <th className="px-2 py-1.5 text-left font-medium">Rep</th>
                      <th className="px-2 py-1.5 text-left font-medium">Date</th>
                      <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                      <th className="px-2 py-1.5 text-left font-medium">Type</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {validationResults.slice(0, 50).map((r, i) => {
                      const hasErrors = r.errors.length > 0 && !(r.errors.length === 1 && r.errors[0].startsWith("Unknown pay type") && defaultPayType);
                      const pt = getPayTypeForRow(r);
                      return (
                        <tr key={i} className={hasErrors ? "bg-red-50 dark:bg-red-950/20" : ""}>
                          <td className="px-2 py-1 text-muted-foreground">{r.row}</td>
                          <td className="px-2 py-1">{r.rep?.name || r.data.rep_name || "—"}</td>
                          <td className="px-2 py-1">{r.data.paid_date || "—"}</td>
                          <td className="px-2 py-1 text-right font-mono">{r.data.amount_paid != null ? `$${r.data.amount_paid.toLocaleString()}` : "—"}</td>
                          <td className="px-2 py-1">{pt?.name || r.data.pay_type_name || "—"}</td>
                          <td className="px-2 py-1">
                            {hasErrors ? (
                              <span className="text-red-600 text-[10px]">{r.errors.join("; ")}</span>
                            ) : (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {validationResults.length > 50 && (
                  <div className="text-center py-2 text-xs text-muted-foreground bg-muted/50">
                    Showing first 50 of {validationResults.length} rows
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button variant="outline" onClick={() => { reset(); }}>
                  Upload Different File
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importableRows.length === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {importableRows.length} Entries
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "importing" && (
            <div className="py-12 text-center space-y-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Importing entries...</p>
              <p className="text-xs text-muted-foreground">Please wait, this may take a moment for large files.</p>
            </div>
          )}

          {step === "done" && (
            <div className="py-8 text-center space-y-4">
              {errorCount === 0 ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                  <div>
                    <p className="text-lg font-semibold">Import Complete</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Successfully imported <strong>{importedCount}</strong> commission entries.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-lg font-semibold">Import Finished with Errors</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Imported <strong>{importedCount}</strong> entries. <strong className="text-red-600">{errorCount}</strong> failed.
                    </p>
                  </div>
                </>
              )}
              <DialogFooter className="justify-center">
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
