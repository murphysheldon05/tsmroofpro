import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Share2, BarChart3, FileText, Eye, Clock, CheckCircle, XCircle, Wallet, Plus, Pencil, ExternalLink } from "lucide-react";
import { PayTypeBadge } from "./PayTypeBadge";
import { getRepInitials, useCommissionPayTypes, useCreateCommissionEntry, type EnrichedEntry } from "@/hooks/useCommissionEntries";
import { useCommissionDocuments } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface RepDetailViewProps {
  repId?: string;
  repName: string;
  repColor: string;
  entries: EnrichedEntry[];
  readOnly?: boolean;
  hideBackButton?: boolean;
}

const EMPTY_ENTRY_FORM = {
  amount_paid: "",
  paid_date: "",
  pay_type_id: "",
  job: "",
  customer: "",
  job_value: "",
  approved_date: "",
  check_type: "",
  notes: "",
  earned_comm: "",
  applied_bank: "",
};

export function RepDetailView({ repId, repName, repColor, entries, readOnly, hideBackButton }: RepDetailViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);

  const { data: payTypes = [] } = useCommissionPayTypes();
  const createEntry = useCreateCommissionEntry();
  const isPrestonStuart = repName.toUpperCase().includes("PRESTON STUART");

  // Fetch commission documents filtered to this rep
  const { data: allDocs } = useCommissionDocuments("all");
  const repDocs = useMemo(() => {
    if (!allDocs) return [];
    const repLower = repName.toLowerCase();
    return allDocs.filter((d) => d.sales_rep.toLowerCase() === repLower);
  }, [allDocs, repName]);

  const ytdPaid = entries.filter((e) => e.pay_type_name !== "Training Draw (NR)").reduce((s, e) => s + e.amount_paid, 0);
  const jobCommissions = entries.filter((e) => e.pay_type_name === "Commission");
  const jobCount = jobCommissions.length;
  const totalJobValue = entries.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
  const avgCommPct = totalJobValue > 0 ? (ytdPaid / totalJobValue) * 100 : 0;
  const drawsAdvances = entries.filter((e) => e.pay_type_name !== "Commission" && e.pay_type_name !== "Training Draw (NR)").reduce((s, e) => s + e.amount_paid, 0);

  const drawsTaken = isPrestonStuart ? entries.filter((e) => (e.applied_bank || 0) < 0).reduce((s, e) => s + Math.abs(e.applied_bank || 0), 0) : 0;
  const drawPaybacks = isPrestonStuart ? entries.filter((e) => (e.applied_bank || 0) > 0).reduce((s, e) => s + (e.applied_bank || 0), 0) : 0;
  const drawBalance = isPrestonStuart ? drawsTaken - drawPaybacks : 0;

  const grouped = useMemo(() => {
    const dateMap = new Map<string, EnrichedEntry[]>();
    entries.forEach((e) => {
      if (!dateMap.has(e.paid_date)) dateMap.set(e.paid_date, []);
      dateMap.get(e.paid_date)!.push(e);
    });
    return Array.from(dateMap.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const copyShareLink = () => {
    const slug = repName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    navigator.clipboard.writeText(`${window.location.origin}/commission-tracker/${slug}#share`);
    toast.success("Share link copied to clipboard");
    setShowShareModal(false);
  };

  const resolvedRepId = repId || entries[0]?.rep_id;

  const handleAddEntry = () => {
    if (!resolvedRepId) return;
    const amountPaid = parseFloat(entryForm.amount_paid);
    if (isNaN(amountPaid) || !entryForm.paid_date || !entryForm.pay_type_id) {
      toast.error("Amount Paid, Paid Date, and Pay Type are required");
      return;
    }
    createEntry.mutate(
      {
        rep_id: resolvedRepId,
        amount_paid: amountPaid,
        paid_date: entryForm.paid_date,
        pay_type_id: entryForm.pay_type_id,
        job: entryForm.job || null,
        customer: entryForm.customer || null,
        job_value: entryForm.job_value ? parseFloat(entryForm.job_value) : null,
        approved_date: entryForm.approved_date || null,
        check_type: entryForm.check_type || null,
        notes: entryForm.notes || null,
        earned_comm: entryForm.earned_comm ? parseFloat(entryForm.earned_comm) : null,
        applied_bank: entryForm.applied_bank ? parseFloat(entryForm.applied_bank) : null,
      },
      {
        onSuccess: () => {
          toast.success("Entry added");
          setShowAddEntry(false);
          setEntryForm(EMPTY_ENTRY_FORM);
        },
        onError: (err) => toast.error(`Failed to add entry: ${err.message}`),
      },
    );
  };

  const updateField = (field: keyof typeof EMPTY_ENTRY_FORM, value: string) => {
    setEntryForm((prev) => ({ ...prev, [field]: value }));
  };

  const statCards = [
    { label: "YTD Paid", value: formatCurrency(ytdPaid), color: "border-t-emerald-500" },
    { label: "Job Commissions", value: formatCurrency(jobCommissions.reduce((s, e) => s + e.amount_paid, 0)), sub: `${jobCount} jobs`, color: "border-t-blue-500" },
    { label: "Draws", value: formatCurrency(drawsAdvances), color: "border-t-amber-500" },
    { label: "Total Job Value", value: formatCurrency(totalJobValue), sub: `avg ${avgCommPct.toFixed(1)}%`, color: "border-t-purple-500" },
  ];

  if (isPrestonStuart) {
    statCards.push(
      { label: "Draws Taken", value: formatCurrency(drawsTaken), color: "border-t-red-500" },
      { label: "Draw Paybacks", value: formatCurrency(drawPaybacks), color: "border-t-green-500" },
      { label: "Draw Balance", value: formatCurrency(drawBalance), sub: drawBalance > 0 ? "Owed" : "Paid Off", color: drawBalance > 0 ? "border-t-red-500" : "border-t-green-500" },
    );
  }

  const totalJobVal = entries.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
  const totalPaid = entries.reduce((s, e) => s + e.amount_paid, 0);

  // Parse commission submission ID from tracker entry notes (e.g. "Auto-created from commission submission abc-123")
  const getSubmissionIdFromNotes = (notes: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/commission submission ([a-f0-9-]{36})/i);
    return match ? match[1] : null;
  };

  const NotesCell = ({ entry }: { entry: EnrichedEntry }) => {
    const submissionId = getSubmissionIdFromNotes(entry.notes);
    return (
      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
        {submissionId ? (
          <button
            onClick={() => navigate(`/commissions/${submissionId}`)}
            className="flex items-center gap-1.5 truncate text-left hover:text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{entry.notes || "—"}</span>
          </button>
        ) : (
          <span className="truncate block">{entry.notes || "—"}</span>
        )}
      </TableCell>
    );
  };

  const getDocStatusBadge = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      draft: <FileText className="h-3 w-3" />,
      submitted: <Clock className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      paid: <Wallet className="h-3 w-3" />,
      accounting_approved: <CheckCircle className="h-3 w-3" />,
      manager_approved: <CheckCircle className="h-3 w-3" />,
    };
    const colors: Record<string, string> = {
      approved: "bg-green-100 text-green-800 border-green-300",
      paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
      accounting_approved: "bg-green-100 text-green-800 border-green-300",
      manager_approved: "bg-blue-100 text-blue-800 border-blue-300",
      rejected: "bg-orange-100 text-orange-800 border-orange-300",
      submitted: "bg-amber-100 text-amber-800 border-amber-300",
      draft: "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500",
    };
    return (
      <Badge variant="outline" className={`gap-1 ${colors[status] || ""}`}>
        {icons[status]}
        {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {!hideBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-12 w-12">
          <AvatarFallback style={{ backgroundColor: repColor }} className="text-white text-lg font-bold">
            {getRepInitials(repName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{repName}</h1>
          <p className="text-sm text-muted-foreground">{entries.length} transactions</p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {resolvedRepId && (
              <Button className="gap-2 rounded-xl" onClick={() => { setEntryForm(EMPTY_ENTRY_FORM); setShowAddEntry(true); }}>
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            )}
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowShareModal(true)}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm text-muted-foreground">📋 Read-only view</div>
      )}

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto">
          <TabsTrigger value="history" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <BarChart3 className="h-4 w-4" />
            Commission History
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <FileText className="h-4 w-4" />
            Documents
            {repDocs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{repDocs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-0">
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((c) => (
                <Card key={c.label} className={`border-t-4 ${c.color}`}>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground font-medium mb-1">{c.label}</div>
                    <div className="text-lg font-extrabold">{c.value}</div>
                    {c.sub && <div className="text-[10px] text-muted-foreground">{c.sub}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-8" />
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Job #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Job Value</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    {isPrestonStuart && (
                      <>
                        <TableHead className="text-right">Earned Comm</TableHead>
                        <TableHead className="text-right">Applied to Bank</TableHead>
                      </>
                    )}
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map(({ date, items }, gi) => {
                    const isMulti = items.length > 1;
                    const isExpanded = expandedDates.has(date);
                    const dateJobValue = items.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
                    const datePaid = items.reduce((s, e) => s + e.amount_paid, 0);
                    const bandClass = gi % 2 === 0 ? "" : "bg-blue-50/30 dark:bg-blue-900/5";

                    if (isMulti) {
                      return (
                        <>{/* Summary row */}
                          <TableRow key={`summary-${date}`} className={cn("cursor-pointer hover:bg-muted/20 font-medium", bandClass)} onClick={() => toggleDate(date)}>
                            <TableCell className="w-8 text-center"><ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} /></TableCell>
                            <TableCell className="font-semibold">{format(parseISO(date), "MM/dd/yyyy")}</TableCell>
                            <TableCell colSpan={3} className="text-muted-foreground text-sm">{items.length} items on this pay run</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(dateJobValue)}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{formatCurrency(datePaid)}</TableCell>
                            {isPrestonStuart && <><TableCell /><TableCell /></>}
                            <TableCell />
                          </TableRow>
                          {isExpanded && items.map((entry) => (
                            <TableRow key={entry.id} className={cn("bg-muted/10", bandClass)}>
                              <TableCell />
                              <TableCell className="text-sm pl-8">{format(parseISO(entry.paid_date), "MM/dd/yyyy")}</TableCell>
                              <TableCell className="text-sm font-mono">{entry.job || "—"}</TableCell>
                              <TableCell className="text-sm">{entry.customer || "—"}</TableCell>
                              <TableCell><PayTypeBadge entryId={entry.id} currentPayType={entry.pay_type} repName={repName} readOnly={readOnly} /></TableCell>
                              <TableCell className="text-right text-sm font-mono">{formatCurrency(entry.job_value)}</TableCell>
                              <TableCell className={cn("text-right text-sm font-mono", !entry.has_paid && "text-muted-foreground")}>{entry.has_paid ? formatCurrency(entry.amount_paid) : "—"}</TableCell>
                              {isPrestonStuart && (
                                <>
                                  <TableCell className="text-right text-sm font-mono">{formatCurrency(entry.earned_comm)}</TableCell>
                                  <TableCell className={cn("text-right text-sm font-mono", (entry.applied_bank || 0) < 0 ? "text-red-600" : (entry.applied_bank || 0) > 0 ? "text-green-600" : "")}>
                                    {entry.applied_bank != null ? entry.applied_bank < 0 ? `(${formatCurrency(Math.abs(entry.applied_bank))})` : formatCurrency(entry.applied_bank) : "—"}
                                  </TableCell>
                                </>
                              )}
                              <NotesCell entry={entry} />
                            </TableRow>
                          ))}
                        </>
                      );
                    }

                    const entry = items[0];
                    return (
                      <TableRow key={entry.id} className={cn("hover:bg-muted/20", bandClass)}>
                        <TableCell />
                        <TableCell className="text-sm">{format(parseISO(entry.paid_date), "MM/dd/yyyy")}</TableCell>
                        <TableCell className="text-sm font-mono">{entry.job || "—"}</TableCell>
                        <TableCell className="text-sm">{entry.customer || "—"}</TableCell>
                        <TableCell><PayTypeBadge entryId={entry.id} currentPayType={entry.pay_type} repName={repName} readOnly={readOnly} /></TableCell>
                        <TableCell className="text-right text-sm font-mono">{formatCurrency(entry.job_value)}</TableCell>
                        <TableCell className={cn("text-right text-sm font-mono", !entry.has_paid && "text-muted-foreground")}>{entry.has_paid ? formatCurrency(entry.amount_paid) : "—"}</TableCell>
                        {isPrestonStuart && (
                          <>
                            <TableCell className="text-right text-sm font-mono">{formatCurrency(entry.earned_comm)}</TableCell>
                            <TableCell className={cn("text-right text-sm font-mono", (entry.applied_bank || 0) < 0 ? "text-red-600" : (entry.applied_bank || 0) > 0 ? "text-green-600" : "")}>
                              {entry.applied_bank != null ? entry.applied_bank < 0 ? `(${formatCurrency(Math.abs(entry.applied_bank))})` : formatCurrency(entry.applied_bank) : "—"}
                            </TableCell>
                          </>
                        )}
                        <NotesCell entry={entry} />
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-[#111827] text-white font-bold">
                    <TableCell />
                    <TableCell>TOTAL</TableCell>
                    <TableCell colSpan={3} />
                    <TableCell className="text-right font-mono">{formatCurrency(totalJobVal)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalPaid)}</TableCell>
                    {isPrestonStuart && <><TableCell /><TableCell /></>}
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{repDocs.length} document{repDocs.length !== 1 ? "s" : ""} for {repName}</p>
              {!readOnly && (
                <Button size="sm" onClick={() => navigate("/commission-documents/new")} className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> New Document
                </Button>
              )}
            </div>

            {repDocs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No commission documents for this rep</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Job Name & ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repDocs.map((doc) => (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(doc.status === 'draft' ? `/commission-documents/${doc.id}?edit=true` : `/commission-documents/${doc.id}`)}>
                        <TableCell className="font-medium">{doc.job_name_id}</TableCell>
                        <TableCell>{doc.job_date ? format(parseISO(doc.job_date), "MM/dd/yyyy") : "—"}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">{formatCurrency(doc.rep_commission)}</TableCell>
                        <TableCell>{getDocStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          {doc.status === 'draft' && doc.created_by === user?.id ? (
                            <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${doc.id}?edit=true`); }}>
                              <Pencil className="h-4 w-4" />
                              Continue Draft
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${doc.id}`); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share {repName}'s Commission Report</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Anyone with this link can view a read-only version of this rep's commission data.</p>
          <Button onClick={copyShareLink} className="w-full rounded-xl">Copy Share Link</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Commission Entry for {repName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount Paid *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryForm.amount_paid}
                  onChange={(e) => updateField("amount_paid", e.target.value)}
                />
              </div>
              <div>
                <Label>Paid Date *</Label>
                <Input
                  type="date"
                  value={entryForm.paid_date}
                  onChange={(e) => updateField("paid_date", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Pay Type *</Label>
              <Select value={entryForm.pay_type_id} onValueChange={(v) => updateField("pay_type_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pay type..." />
                </SelectTrigger>
                <SelectContent>
                  {payTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job #</Label>
                <Input
                  placeholder="e.g. 2026-001"
                  value={entryForm.job}
                  onChange={(e) => updateField("job", e.target.value)}
                />
              </div>
              <div>
                <Label>Customer</Label>
                <Input
                  placeholder="Customer name"
                  value={entryForm.customer}
                  onChange={(e) => updateField("customer", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryForm.job_value}
                  onChange={(e) => updateField("job_value", e.target.value)}
                />
              </div>
              <div>
                <Label>Approved Date</Label>
                <Input
                  type="date"
                  value={entryForm.approved_date}
                  onChange={(e) => updateField("approved_date", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check Type</Label>
                <Input
                  placeholder="e.g. Direct Deposit"
                  value={entryForm.check_type}
                  onChange={(e) => updateField("check_type", e.target.value)}
                />
              </div>
              <div>
                <Label>Earned Comm</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryForm.earned_comm}
                  onChange={(e) => updateField("earned_comm", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Applied to Bank</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryForm.applied_bank}
                  onChange={(e) => updateField("applied_bank", e.target.value)}
                />
              </div>
              <div />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={entryForm.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
            <Button
              onClick={handleAddEntry}
              disabled={createEntry.isPending || !entryForm.amount_paid || !entryForm.paid_date || !entryForm.pay_type_id}
            >
              {createEntry.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
