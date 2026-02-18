import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCommissionPayRuns, useCreatePayRun, useCompletePayRun,
  useCommissionEntries, formatUSD, type CommissionPayRun,
} from "@/hooks/useCommissionEntries";

export function PayRunsTab() {
  const { data: payRuns = [] } = useCommissionPayRuns();
  const { data: entries = [] } = useCommissionEntries();
  const createPayRun = useCreatePayRun();
  const completePayRun = useCompletePayRun();

  const [newRunDate, setNewRunDate] = useState<Date>();
  const [showNewRun, setShowNewRun] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState<CommissionPayRun | null>(null);

  const handleCreate = () => {
    if (!newRunDate) return;
    createPayRun.mutate(format(newRunDate, "yyyy-MM-dd"), {
      onSuccess: () => { toast.success("Pay run created"); setShowNewRun(false); setNewRunDate(undefined); },
    });
  };

  const handleComplete = () => {
    if (!confirmComplete) return;
    completePayRun.mutate(confirmComplete.id, {
      onSuccess: () => { toast.success("Pay run marked complete"); setConfirmComplete(null); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-muted-foreground">{payRuns.length} pay runs</h3>
        <Button size="sm" className="gap-1" onClick={() => setShowNewRun(true)}>
          <Plus className="h-4 w-4" /> New Pay Run
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Run Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead>Completed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payRuns.map((run) => {
              const runEntries = entries.filter((e) => e.pay_run_id === run.id);
              const totalPaid = runEntries.reduce((s, e) => s + e.amount_paid, 0);
              return (
                <TableRow key={run.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{format(parseISO(run.run_date), "MM/dd/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={run.status === "completed" ? "default" : "secondary"} className={run.status === "completed" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-700 border-amber-300"}>
                      {run.status === "completed" ? "Completed" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{runEntries.length}</TableCell>
                  <TableCell className="text-right font-mono">{formatUSD(totalPaid)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.completed_at ? format(parseISO(run.completed_at), "MM/dd/yyyy h:mm a") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.status === "open" && (
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setConfirmComplete(run)}>
                        <CheckCircle2 className="h-3 w-3" /> Mark Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {payRuns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pay runs yet. Create one to start tracking pay periods.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Pay Run Dialog */}
      <Dialog open={showNewRun} onOpenChange={setShowNewRun}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pay Run</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newRunDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newRunDate ? format(newRunDate, "PPP") : "Select pay run date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={newRunDate} onSelect={setNewRunDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRun(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newRunDate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Complete Dialog */}
      <Dialog open={!!confirmComplete} onOpenChange={() => setConfirmComplete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Pay Run Complete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the {confirmComplete ? format(parseISO(confirmComplete.run_date), "MM/dd/yyyy") : ""} pay run as completed. This action updates the sales leaderboard on Command Center.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmComplete(null)}>Cancel</Button>
            <Button onClick={handleComplete}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
