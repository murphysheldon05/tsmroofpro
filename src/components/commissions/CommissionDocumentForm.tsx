import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCurrencyInput } from "@/lib/commissionDocumentCalculations";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Lock, Save, Send, ArrowLeft, AlertTriangle, Printer, Plus, Trash2, 
  DollarSign, Calculator, FileText, ChevronDown, Info, Sparkles, CheckCircle2, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  calculateAllFields,
  formatCurrency,
  formatTierPercent,
  validateCommissionDocument,
  PROFIT_SPLIT_OPTIONS,
  OP_PERCENT_OPTIONS,
  getProfitSplitFromLabel,
  generateProfitSplitOptions,
  filterOpPercentOptions,
  type CommissionDocumentData,
} from "@/lib/commissionDocumentCalculations";
import { 
  useCreateCommissionDocument, 
  useUpdateCommissionDocument,
  type CommissionDocument 
} from "@/hooks/useCommissionDocuments";
import { useUserCommissionTier } from "@/hooks/useCommissionTiers";
import { useAutoSave } from "@/hooks/useAutoSave";
import { CommissionPreviewModal } from "./CommissionPreviewModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommissionDocumentFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

// Shared input classes — h-12 = 48px touch targets on all devices
const inputBaseClasses = "h-12 text-base px-4 rounded-xl transition-all duration-200 ease-out bg-background border-border/60 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md";
const numberInputClasses = `font-mono text-base tracking-wide tabular-nums ${inputBaseClasses}`;
const calculatedInputClasses = "h-12 px-4 rounded-xl font-mono text-base tracking-wide tabular-nums bg-primary/5 border-primary/20 text-primary";

// ─── Section Header ──────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  icon: React.ElementType;
  color?: "default" | "destructive" | "success";
  isOpen: boolean;
  onToggle: () => void;
  badge?: number;
}

function SectionHeader({ title, icon: Icon, color = "default", isOpen, onToggle, badge }: SectionHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-all duration-200",
          "hover:bg-muted/30 border-b border-border/50",
          isOpen && "bg-muted/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            color === "destructive" && "bg-destructive/10",
            color === "success" && "bg-emerald-500/10",
            color === "default" && "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-4 h-4",
              color === "destructive" && "text-destructive",
              color === "success" && "text-emerald-500",
              color === "default" && "text-primary"
            )} />
          </div>
          <span className="font-semibold text-sm uppercase tracking-wider">{title}</span>
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className={cn(
              "text-xs",
              color === "destructive" && "bg-destructive/10 text-destructive",
              color === "success" && "bg-emerald-500/10 text-emerald-500",
              color === "default" && "bg-primary/10 text-primary"
            )}>
              {badge}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
    </CollapsibleTrigger>
  );
}

// ─── Form Row ──────────────────────────────────────────────
interface FormRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
  variant?: "default" | "negative" | "positive" | "calculated";
  highlight?: boolean;
}

function EnhancedFormRow({ label, children, hint, variant = "default", highlight }: FormRowProps) {
  return (
    <div className={cn(
      "py-3.5 border-b border-border/20 transition-colors",
      variant === "negative" && "hover:bg-destructive/5",
      variant === "positive" && "hover:bg-emerald-500/5",
      variant === "calculated" && "bg-primary/5 rounded-xl my-1.5 border-none px-4 py-3.5",
      highlight && "bg-primary/10 rounded-xl my-2 border-none p-4 ring-1 ring-primary/20"
    )}>
      <Label className={cn(
        "text-[13px] font-semibold tracking-wide uppercase mb-1.5 flex items-center gap-1.5",
        variant === "negative" && "text-destructive",
        variant === "positive" && "text-emerald-500",
        variant === "calculated" && "text-primary",
        variant === "default" && "text-muted-foreground"
      )}>
        {label}
        {variant === "calculated" && <Lock className="w-3 h-3 text-muted-foreground/60" />}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/80 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CommissionDocumentForm({ document: existingDoc, readOnly = false }: CommissionDocumentFormProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();
  
  // Fetch user profile for auto-populating sales rep name
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch the current user's commission tier
  const { data: userTier, isLoading: tierLoading } = useUserCommissionTier(user?.id);
  const isPrivileged = isAdmin || isManager;

  // Get allowed options based on user's tier (admins/managers see all options)
  const { availableOpOptions, availableProfitSplitOptions, defaultProfitSplit } = useMemo(() => {
    if (isPrivileged) {
      return {
        availableOpOptions: OP_PERCENT_OPTIONS,
        availableProfitSplitOptions: PROFIT_SPLIT_OPTIONS,
        defaultProfitSplit: PROFIT_SPLIT_OPTIONS[1],
      };
    }
    if (userTier?.tier) {
      const tier = userTier.tier;
      const opOptions = filterOpPercentOptions(tier.allowed_op_percentages);
      const profitSplitOptions = generateProfitSplitOptions(
        tier.allowed_op_percentages,
        tier.allowed_profit_splits
      );
      return {
        availableOpOptions: opOptions,
        availableProfitSplitOptions: profitSplitOptions,
        defaultProfitSplit: profitSplitOptions[0] || PROFIT_SPLIT_OPTIONS[1],
      };
    }
    return {
      availableOpOptions: OP_PERCENT_OPTIONS,
      availableProfitSplitOptions: PROFIT_SPLIT_OPTIONS,
      defaultProfitSplit: PROFIT_SPLIT_OPTIONS[1],
    };
  }, [userTier, isPrivileged]);

  // ── Form state (identical field set to current) ──
  const [formData, setFormData] = useState(() => ({
    job_name_id: existingDoc?.job_name_id ?? "",
    job_date: existingDoc?.job_date ?? "",
    sales_rep: existingDoc?.sales_rep ?? "",
    sales_rep_id: existingDoc?.sales_rep_id ?? user?.id ?? null,
    gross_contract_total: existingDoc?.gross_contract_total ?? 0,
    op_percent: existingDoc?.op_percent ?? 0.15,
    material_cost: existingDoc?.material_cost ?? 0,
    labor_cost: existingDoc?.labor_cost ?? 0,
    neg_exp_1: existingDoc?.neg_exp_1 ?? 0,
    neg_exp_2: existingDoc?.neg_exp_2 ?? 0,
    neg_exp_3: existingDoc?.neg_exp_3 ?? 0,
    neg_exp_4: existingDoc?.neg_exp_4 ?? existingDoc?.supplement_fees_expense ?? 0,
    pos_exp_1: existingDoc?.pos_exp_1 ?? 0,
    pos_exp_2: existingDoc?.pos_exp_2 ?? 0,
    pos_exp_3: existingDoc?.pos_exp_3 ?? 0,
    pos_exp_4: existingDoc?.pos_exp_4 ?? 0,
    profit_split_label: existingDoc?.profit_split_label ?? "15/40/60",
    rep_profit_percent: existingDoc?.rep_profit_percent ?? 0.40,
    company_profit_percent: existingDoc?.company_profit_percent ?? 0.60,
    advance_total: existingDoc?.advance_total ?? 0,
    notes: existingDoc?.notes ?? "",
  }));

  // ── NEW: Dynamic additional negative expenses ──
  const [additionalNegExpenses, setAdditionalNegExpenses] = useState<number[]>([]);

  // ── Preview modal state ──
  const [showPreview, setShowPreview] = useState(false);

  // ── Collapsible section state ──
  const [openSections, setOpenSections] = useState({
    job: true,
    contract: true,
    negExpenses: true,
    posExpenses: false,
    profitSplit: true,
    summary: true,
    notes: false,
  });
  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Auto-populate sales rep name (only for new documents) ──
  useEffect(() => {
    if (!existingDoc && userProfile?.full_name && !formData.sales_rep) {
      setFormData(prev => ({
        ...prev,
        sales_rep: userProfile.full_name,
        sales_rep_id: user?.id ?? null,
      }));
    }
  }, [userProfile, existingDoc, user]);

  // ── Set default profit split from tier (only for new documents) ──
  useEffect(() => {
    if (!existingDoc && !tierLoading && defaultProfitSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: defaultProfitSplit.label,
        op_percent: defaultProfitSplit.op,
        rep_profit_percent: defaultProfitSplit.rep,
        company_profit_percent: defaultProfitSplit.company,
      }));
    }
  }, [defaultProfitSplit, tierLoading, existingDoc]);

  // ── Profit split change handler ──
  const handleProfitSplitChange = (label: string) => {
    const dynamicSplit = availableProfitSplitOptions.find(opt => opt.label === label);
    if (dynamicSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: label,
        op_percent: dynamicSplit.op,
        rep_profit_percent: dynamicSplit.rep,
        company_profit_percent: dynamicSplit.company,
      }));
      return;
    }
    const staticSplit = getProfitSplitFromLabel(label);
    if (staticSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: label,
        op_percent: staticSplit.op,
        rep_profit_percent: staticSplit.rep,
        company_profit_percent: staticSplit.company,
      }));
    }
  };

  const handleOpPercentChange = (value: string) => {
    setFormData(prev => ({ ...prev, op_percent: parseFloat(value) }));
  };

  // ── Calculations (exact same formulas + additional neg expenses) ──
  const additionalNegTotal = additionalNegExpenses.reduce((sum, exp) => sum + (exp || 0), 0);

  const calculated = useMemo(() => {
    const inputData: CommissionDocumentData = {
      gross_contract_total: formData.gross_contract_total,
      op_percent: formData.op_percent,
      material_cost: formData.material_cost,
      labor_cost: formData.labor_cost,
      neg_exp_1: formData.neg_exp_1,
      neg_exp_2: formData.neg_exp_2,
      neg_exp_3: formData.neg_exp_3,
      neg_exp_4: formData.neg_exp_4 + additionalNegTotal,
      pos_exp_1: formData.pos_exp_1,
      pos_exp_2: formData.pos_exp_2,
      pos_exp_3: formData.pos_exp_3,
      pos_exp_4: formData.pos_exp_4,
      rep_profit_percent: formData.rep_profit_percent,
      advance_total: formData.advance_total,
    };
    return calculateAllFields(inputData);
  }, [formData, additionalNegTotal]);

  // ── Money input editing (per-field tracking for continuous entry) ──
  const [rawValues, setRawValues] = useState<Record<string, string>>({});

  const handleMoneyFocus = (field: string, currentValue: number) => {
    setRawValues(prev => ({ ...prev, [field]: currentValue ? String(currentValue) : "" }));
  };
  const handleMoneyChange = (field: string, value: string) => {
    setRawValues(prev => ({ ...prev, [field]: value }));
  };
  const commitMoneyValue = (field: keyof typeof formData) => {
    const raw = rawValues[field] ?? "";
    const numValue = parseCurrencyInput(raw);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setRawValues(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };
  const commitAdditionalExpenseValue = (index: number) => {
    const fieldKey = `addl_neg_${index}`;
    const raw = rawValues[fieldKey] ?? "";
    const numValue = parseCurrencyInput(raw);
    setAdditionalNegExpenses(prev => {
      const updated = [...prev];
      updated[index] = numValue;
      return updated;
    });
    setRawValues(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };
  const getMoneyInputValue = (field: string, numericValue: number) => {
    if (field in rawValues) return rawValues[field];
    return numericValue ? formatCurrency(numericValue) : "";
  };

  // ── Build payload helper ──
  const buildPayload = useCallback((submit: boolean = false) => ({
    job_name_id: formData.job_name_id,
    job_date: formData.job_date,
    sales_rep: formData.sales_rep,
    sales_rep_id: null,
    gross_contract_total: formData.gross_contract_total,
    op_percent: formData.op_percent,
    material_cost: formData.material_cost,
    labor_cost: formData.labor_cost,
    neg_exp_1: formData.neg_exp_1,
    neg_exp_2: formData.neg_exp_2,
    neg_exp_3: formData.neg_exp_3,
    neg_exp_4: formData.neg_exp_4 + additionalNegTotal,
    supplement_fees_expense: formData.neg_exp_4 + additionalNegTotal,
    pos_exp_1: formData.pos_exp_1,
    pos_exp_2: formData.pos_exp_2,
    pos_exp_3: formData.pos_exp_3,
    pos_exp_4: formData.pos_exp_4,
    profit_split_label: formData.profit_split_label,
    rep_profit_percent: formData.rep_profit_percent,
    company_profit_percent: formData.company_profit_percent,
    commission_rate: formData.rep_profit_percent,
    advance_total: formData.advance_total,
    notes: formData.notes,
    status: submit ? 'submitted' as const : 'draft' as const,
    approved_by: null,
    approved_at: null,
    approval_comment: null,
    starting_claim_amount: null,
    final_claim_amount: null,
  }), [formData, additionalNegTotal]);

  // ── Determine editability first (needed for auto-save) ──
  const canEdit = !readOnly && (!existingDoc || existingDoc.status === 'draft' || existingDoc.status === 'revision_required');

  // ── Auto-save for drafts ──
  const [autoSaveDocId, setAutoSaveDocId] = useState<string | null>(existingDoc?.id ?? null);

  const handleAutoSave = useCallback(async () => {
    // Only auto-save if we have a document ID (already saved once) or minimal required fields
    if (!formData.job_name_id && !autoSaveDocId) return;

    const payload = buildPayload(false);
    
    try {
      if (autoSaveDocId) {
        await updateMutation.mutateAsync({ id: autoSaveDocId, ...payload });
      } else if (formData.job_name_id) {
        // Create new draft on first auto-save if job name exists
        const result = await createMutation.mutateAsync(payload);
        if (result?.id) {
          setAutoSaveDocId(result.id);
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [formData, additionalNegTotal, autoSaveDocId, buildPayload, updateMutation, createMutation]);

  const { lastSavedAt, isSaving: isAutoSaving, hasUnsavedChanges } = useAutoSave({
    data: { formData, additionalNegExpenses },
    onSave: handleAutoSave,
    interval: 30000, // 30 seconds
    enabled: canEdit && (!!autoSaveDocId || !!formData.job_name_id),
    debounceMs: 3000, // 3 seconds after changes
  });

  // ── Save / Submit handlers ──
  const handleSave = async (submit: boolean = false) => {
    const validation = validateCommissionDocument({
      ...formData,
      job_name_id: formData.job_name_id,
      job_date: formData.job_date,
      sales_rep: formData.sales_rep,
      profit_split_label: formData.profit_split_label,
    });
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    const payload = buildPayload(submit);

    if (autoSaveDocId || existingDoc?.id) {
      await updateMutation.mutateAsync({ id: autoSaveDocId || existingDoc!.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate('/commission-documents');
  };

  const handleSubmitClick = () => {
    const validation = validateCommissionDocument({
      ...formData,
      job_name_id: formData.job_name_id,
      job_date: formData.job_date,
      sales_rep: formData.sales_rep,
      profit_split_label: formData.profit_split_label,
    });
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    await handleSave(true);
    setShowPreview(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const negExpenseCount = [formData.neg_exp_1, formData.neg_exp_2, formData.neg_exp_3, formData.neg_exp_4, ...additionalNegExpenses].filter(e => e > 0).length;

  // ── Render helper for money inputs (inline, not a component) ──
  const renderMoneyInput = (field: keyof typeof formData, disabled?: boolean) => (
    <Input
      key={field}
      type="text"
      inputMode="decimal"
      value={getMoneyInputValue(field, formData[field] as number)}
      onChange={(e) => handleMoneyChange(field, e.target.value)}
      onFocus={() => handleMoneyFocus(field, formData[field] as number)}
      onBlur={() => commitMoneyValue(field)}
      onWheel={(e) => e.currentTarget.blur()}
      disabled={disabled ?? !canEdit}
      className={numberInputClasses}
      placeholder="$0.00"
    />
  );

  // ═══════════════════════ RENDER ═══════════════════════
  return (
    <div className="space-y-4 pb-48 sm:pb-6 px-4 sm:px-0">
      {/* Header with auto-save status */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/commission-documents')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          {/* Auto-save status indicator */}
          {canEdit && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isAutoSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-500">Unsaved changes</span>
              ) : null}
            </div>
          )}
          {existingDoc?.id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/commission-documents/${existingDoc.id}/print`)}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          )}
        </div>
      </div>

      {/* Tier Banner */}
      {userTier?.tier && (
        <div className="glass-card rounded-xl p-4 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-1">
                {userTier.tier.name}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {userTier.tier.description || 'Your profit split options are based on your assigned tier.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Missing tier warning */}
      {!isPrivileged && !tierLoading && !userTier?.tier && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Commission Tier Assigned</AlertTitle>
          <AlertDescription>
            Please contact your manager to have your tier set up before submitting commissions.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Main Card ── */}
      <Card className="overflow-hidden border-border/50">
        <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 text-center border-b border-border/50">
          <h1 className="text-xl font-bold gradient-text mb-1">TSM Roofing LLC</h1>
          <p className="text-sm text-muted-foreground">Official Commission Document</p>
          {existingDoc?.status && (
            <Badge
              variant={existingDoc.status === 'approved' || existingDoc.status === 'paid' ? 'default' : existingDoc.status === 'rejected' ? 'destructive' : 'secondary'}
              className="mt-3"
            >
              {existingDoc.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          )}
        </div>

        <CardContent className="p-0">

          {/* ── Job Information ── */}
          <div data-tutorial="job-info">
          <Collapsible open={openSections.job} onOpenChange={() => toggleSection('job')}>
            <SectionHeader title="Job Information" icon={FileText} isOpen={openSections.job} onToggle={() => toggleSection('job')} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Job Name & ID">
                  <Input value={formData.job_name_id} onChange={(e) => setFormData(prev => ({ ...prev, job_name_id: e.target.value }))} disabled={!canEdit} className={inputBaseClasses} placeholder="e.g., Smith Residence - 4521" />
                </EnhancedFormRow>
                <EnhancedFormRow label="Job Date">
                  <Input type="date" value={formData.job_date} onChange={(e) => setFormData(prev => ({ ...prev, job_date: e.target.value }))} disabled={!canEdit} className={inputBaseClasses} />
                </EnhancedFormRow>
                <EnhancedFormRow label="Sales Rep" hint={isPrivileged ? "Managers can edit" : "Auto-populated from your profile"}>
                  <Input value={formData.sales_rep} onChange={(e) => setFormData(prev => ({ ...prev, sales_rep: e.target.value }))} disabled={!canEdit || !isPrivileged} className={cn(inputBaseClasses, !isPrivileged && "bg-muted/50")} />
                </EnhancedFormRow>
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* ── Contract & Costs ── */}
          <div data-tutorial="gross-contract">
          <Collapsible open={openSections.contract} onOpenChange={() => toggleSection('contract')}>
            <SectionHeader title="Contract & Costs" icon={Calculator} isOpen={openSections.contract} onToggle={() => toggleSection('contract')} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Contract Total (Gross)">{renderMoneyInput("gross_contract_total")}</EnhancedFormRow>
                <EnhancedFormRow label="O&P %" hint="Based on your tier">
                  <Select value={formData.op_percent.toString()} onValueChange={handleOpPercentChange} disabled={!canEdit || tierLoading}>
                    <SelectTrigger className={cn(inputBaseClasses, "font-mono")}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableOpOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </EnhancedFormRow>
                <EnhancedFormRow label="O&P $ Amount" variant="calculated"><Input value={formatCurrency(calculated.op_amount)} disabled className={calculatedInputClasses} /></EnhancedFormRow>
                <EnhancedFormRow label="Contract Total (Net)" variant="calculated"><Input value={formatCurrency(calculated.contract_total_net)} disabled className={calculatedInputClasses} /></EnhancedFormRow>
                <EnhancedFormRow label="Material Cost">{renderMoneyInput("material_cost")}</EnhancedFormRow>
                <EnhancedFormRow label="Labor Cost">{renderMoneyInput("labor_cost")}</EnhancedFormRow>
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* ── Negative Expenses ── */}
          <div data-tutorial="expenses">
          <Collapsible open={openSections.negExpenses} onOpenChange={() => toggleSection('negExpenses')}>
            <SectionHeader title="Additional Expenses (−)" icon={DollarSign} color="destructive" isOpen={openSections.negExpenses} onToggle={() => toggleSection('negExpenses')} badge={negExpenseCount} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Expense #1" variant="negative" hint="Will calls, lumber, Home Depot, misc.">{renderMoneyInput("neg_exp_1")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #2" variant="negative">{renderMoneyInput("neg_exp_2")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #3" variant="negative">{renderMoneyInput("neg_exp_3")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #4 (Supplement Fees)" variant="negative">{renderMoneyInput("neg_exp_4")}</EnhancedFormRow>

                {/* Dynamic additional negative expenses */}
                {additionalNegExpenses.map((expense, index) => {
                  const fieldKey = `addl_neg_${index}`;
                  return (
                    <EnhancedFormRow key={fieldKey} label={`Expense #${index + 5}`} variant="negative">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={getMoneyInputValue(fieldKey, expense)}
                          onChange={(e) => handleMoneyChange(fieldKey, e.target.value)}
                          onFocus={() => handleMoneyFocus(fieldKey, expense)}
                          onBlur={() => commitAdditionalExpenseValue(index)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={!canEdit}
                          className={numberInputClasses}
                          placeholder="$0.00"
                        />
                        {canEdit && (
                          <Button type="button" variant="ghost" size="icon"
                            onClick={() => setAdditionalNegExpenses(prev => prev.filter((_, i) => i !== index))}
                            className="shrink-0 h-12 w-12 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </EnhancedFormRow>
                  );
                })}

                {canEdit && (
                  <Button type="button" variant="outline"
                    onClick={() => setAdditionalNegExpenses(prev => [...prev, 0])}
                    className="w-full mt-4 h-12 border-dashed border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50">
                    <Plus className="h-4 w-4 mr-2" /> Add Expense
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* ── Positive Expenses ── */}
          <Collapsible open={openSections.posExpenses} onOpenChange={() => toggleSection('posExpenses')}>
            <SectionHeader title="Additional Expenses (+)" icon={DollarSign} color="success" isOpen={openSections.posExpenses} onToggle={() => toggleSection('posExpenses')} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Expense #1" variant="positive" hint="Returns added back if rep returns materials">{renderMoneyInput("pos_exp_1")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #2" variant="positive">{renderMoneyInput("pos_exp_2")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #3" variant="positive">{renderMoneyInput("pos_exp_3")}</EnhancedFormRow>
                <EnhancedFormRow label="Expense #4" variant="positive">{renderMoneyInput("pos_exp_4")}</EnhancedFormRow>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Profit Split ── */}
          <Collapsible open={openSections.profitSplit} onOpenChange={() => toggleSection('profitSplit')}>
            <SectionHeader title="Profit Split" icon={Calculator} isOpen={openSections.profitSplit} onToggle={() => toggleSection('profitSplit')} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Profit Split" hint={`Based on your ${userTier?.tier?.name || 'tier'}`}>
                  <Select value={formData.profit_split_label} onValueChange={handleProfitSplitChange} disabled={!canEdit || tierLoading}>
                    <SelectTrigger className={cn(inputBaseClasses, "font-mono")}><SelectValue placeholder="Select profit split" /></SelectTrigger>
                    <SelectContent>
                      {availableProfitSplitOptions.map((opt) => (<SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </EnhancedFormRow>
                <EnhancedFormRow label="Rep Profit %" variant="calculated">
                  <Input value={formatTierPercent(formData.rep_profit_percent)} disabled className={calculatedInputClasses} />
                </EnhancedFormRow>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Commission Summary ── */}
          <div data-tutorial="commission-calc">
          <Collapsible open={openSections.summary} onOpenChange={() => toggleSection('summary')}>
            <SectionHeader title="Commission Summary" icon={DollarSign} isOpen={openSections.summary} onToggle={() => toggleSection('summary')} />
            <CollapsibleContent>
              <div className="p-4 space-y-1">
                <EnhancedFormRow label="Net Profit" variant="calculated" hint="Commissionable profit after O&P is removed">
                  <Input value={formatCurrency(calculated.net_profit)} disabled className={calculatedInputClasses} />
                </EnhancedFormRow>
                <EnhancedFormRow label="Rep Commission" variant="calculated" highlight hint="Total dollars paid to you">
                  <Input value={formatCurrency(calculated.rep_commission)} disabled className={cn(calculatedInputClasses, "text-xl font-bold h-14")} />
                </EnhancedFormRow>
                <EnhancedFormRow label="Draw Total">{renderMoneyInput("advance_total")}</EnhancedFormRow>
                {isPrivileged && (
                  <EnhancedFormRow label="Company Profit" variant="calculated" hint="Total company profit (manager view only)">
                    <Input value={formatCurrency(calculated.company_profit)} disabled className={calculatedInputClasses} />
                  </EnhancedFormRow>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* ── Notes ── */}
          <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
            <SectionHeader title="Notes" icon={FileText} isOpen={openSections.notes} onToggle={() => toggleSection('notes')} />
            <CollapsibleContent>
              <div className="p-4">
                <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} disabled={!canEdit} className={cn(inputBaseClasses, "min-h-[100px]")} placeholder="Optional notes..." />
              </div>
            </CollapsibleContent>
          </Collapsible>

        </CardContent>
      </Card>

      {/* ── Mobile Floating Commission Summary ── */}
      <div className="fixed bottom-20 left-4 right-4 sm:hidden z-10">
        <Card className="bg-card/95 backdrop-blur-lg border-primary/30 shadow-xl rounded-2xl">
          <CardContent className="py-3.5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Your Commission</p>
                <p className="text-2xl font-bold text-primary font-mono tracking-tight">
                  {formatCurrency(calculated.rep_commission)}
                </p>
              </div>
              {formData.advance_total > 0 && (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">After Draw</p>
                  <p className="text-lg font-semibold font-mono tracking-tight">
                    {formatCurrency(calculated.rep_commission - formData.advance_total)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Action Buttons ── */}
      {canEdit && (
        <div data-tutorial="submit-btn" className="fixed bottom-0 left-0 right-0 sm:relative sm:mt-6 bg-background/95 backdrop-blur sm:bg-transparent border-t sm:border-0 border-border/50 p-4 sm:p-0 flex gap-3 z-20">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading || isAutoSaving} className="flex-1 h-12 sm:h-10">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={handleSubmitClick} disabled={isLoading} className="flex-1 h-12 sm:h-10">
            <Send className="h-4 w-4 mr-2" /> Review & Submit
          </Button>
        </div>
      )}

      {/* ── Preview Modal ── */}
      <CommissionPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirmSubmit={handleConfirmSubmit}
        isSubmitting={isLoading}
        formData={formData}
        additionalNegExpenses={additionalNegExpenses}
        calculated={calculated}
        tierName={userTier?.tier?.name}
      />
    </div>
  );
}
