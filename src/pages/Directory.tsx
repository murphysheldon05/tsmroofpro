import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubcontractors, useDeleteSubcontractor } from "@/hooks/useSubcontractors";
import { useVendors, useDeleteVendor } from "@/hooks/useVendors";
import { useProspects, useDeleteProspect } from "@/hooks/useProspects";
import { SubcontractorForm } from "@/components/directory/SubcontractorForm";
import { VendorForm } from "@/components/directory/VendorForm";
import { ProspectForm } from "@/components/directory/ProspectForm";
import { ComplianceRequestForm } from "@/components/directory/ComplianceRequestForm";
import { TRADE_TYPES, VENDOR_TYPES, getStatusColor, getDocStatusColor } from "@/lib/directoryConstants";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, Send, Edit, Trash2, Phone, Mail, Building2,
  CheckCircle, XCircle, Upload, FileText, AlertTriangle, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ComplianceStatus = "approved" | "pending" | "potential";

function getComplianceStatus(entity: { coi_status?: string | null; w9_status?: string | null; ic_agreement_status?: string | null; status?: string }): ComplianceStatus {
  if (entity.status === "do_not_use") return "potential";
  const coiOk = entity.coi_status === "received";
  const w9Ok = entity.w9_status === "received";
  const icOk = entity.ic_agreement_status === "received";
  if (coiOk && w9Ok && icOk) return "approved";
  if (coiOk || w9Ok || icOk) return "pending";
  return "potential";
}

const complianceStatusConfig: Record<ComplianceStatus, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  potential: { label: "Potential", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
};

function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const config = complianceStatusConfig[status];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function DocCheck({ label, status }: { label: string; status: string | null | undefined }) {
  const received = status === "received";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {received ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
      <span className={received ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// Unified card for both subs and vendors
function EntityCard({
  name, contactName, phone, email, tradeType, status, coiStatus, w9Status, icStatus,
  canEdit, onEdit, onDelete, onViewDetail,
}: {
  name: string; contactName: string; phone: string; email: string;
  tradeType: string; status: string;
  coiStatus?: string | null; w9Status?: string | null; icStatus?: string | null;
  canEdit: boolean; onEdit: () => void; onDelete: () => void; onViewDetail: () => void;
}) {
  const compStatus = getComplianceStatus({ coi_status: coiStatus, w9_status: w9Status, ic_agreement_status: icStatus, status });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={onViewDetail}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            <p className="text-sm text-muted-foreground truncate">{contactName}</p>
          </div>
          <ComplianceStatusBadge status={compStatus} />
        </div>

        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{tradeType}</Badge>
        </div>

        <div className="space-y-1">
          <DocCheck label="W-9" status={w9Status} />
          <DocCheck label="COI" status={coiStatus} />
          <DocCheck label="IC Agreement" status={icStatus} />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border/30">
          {phone && (
            <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Phone className="w-3.5 h-3.5" /> {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground truncate">
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {canEdit && (
            <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Detail View Dialog
function EntityDetailDialog({ open, onOpenChange, entity, type, canVerify }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  entity: any; type: "sub" | "vendor"; canVerify: boolean;
}) {
  if (!entity) return null;
  const name = type === "sub" ? entity.company_name : entity.vendor_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{entity.primary_contact_name}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${entity.phone}`} className="font-medium text-primary">{entity.phone}</a></div>
            <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${entity.email}`} className="font-medium text-primary truncate">{entity.email}</a></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge className={getStatusColor(entity.status)}>{entity.status?.replace("_", " ")}</Badge></div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Compliance Documents</h4>
            <div className="space-y-2">
              <DocCheck label="W-9" status={entity.w9_status} />
              <DocCheck label="Certificate of Insurance (COI)" status={entity.coi_status} />
              {entity.coi_expiration_date && (
                <p className="text-xs text-muted-foreground ml-6">Expires: {new Date(entity.coi_expiration_date).toLocaleDateString()}</p>
              )}
              <DocCheck label="IC Agreement" status={entity.ic_agreement_status} />
            </div>
          </div>

          {entity.notes && (
            <div className="border-t border-border/50 pt-3">
              <h4 className="font-semibold mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground">{entity.notes}</p>
            </div>
          )}

          <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <p>Added: {new Date(entity.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// CSV Import Modal
function CsvImportDialog({ open, onOpenChange, type }: { open: boolean; onOpenChange: (o: boolean) => void; type: "vendor" | "subcontractor" }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      setPreview(rows.slice(0, 6));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        if (rows.length < 2) { toast.error("No data rows found"); setImporting(false); return; }

        const headers = rows[0].map(h => h.toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes("company") || h.includes("name"));
        const contactIdx = headers.findIndex(h => h.includes("contact"));
        const phoneIdx = headers.findIndex(h => h.includes("phone"));
        const emailIdx = headers.findIndex(h => h.includes("email"));

        let imported = 0;
        let skipped = 0;
        const { supabase } = await import("@/integrations/supabase/client");

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nameIdx]?.trim()) { skipped++; continue; }

          const record: any = {
            [type === "vendor" ? "vendor_name" : "company_name"]: row[nameIdx]?.trim() || "Unknown",
            primary_contact_name: row[contactIdx]?.trim() || "",
            phone: row[phoneIdx]?.trim() || "",
            email: row[emailIdx]?.trim() || "",
            status: "active" as const,
          };

          if (type === "vendor") {
            record.vendor_type = "other";
            record.service_areas = ["phoenix_metro"];
          } else {
            record.trade_type = "other";
            record.service_areas = ["phoenix_metro"];
            record.coi_status = "missing";
            record.w9_status = "missing";
            record.ic_agreement_status = "missing";
          }

          const { error } = await supabase.from(type === "vendor" ? "vendors" : "subcontractors").insert(record);
          if (error) { skipped++; } else { imported++; }
        }

        toast.success(`Imported ${imported} contacts. ${skipped} skipped.`);
        setImporting(false);
        onOpenChange(false);
        setFile(null);
        setPreview([]);
      };
      reader.readAsText(file);
    } catch {
      toast.error("Import failed");
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import {type === "vendor" ? "Vendors" : "Subcontractors"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">Upload a CSV file with columns: Company Name, Contact Name, Phone, Email</p>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("csv-upload")?.click()}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{file ? file.name : "Click to upload .csv file"}</p>
            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50">{preview[0]?.map((h, i) => <th key={i} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{preview.slice(1).map((row, ri) => <tr key={ri} className="border-t">{row.map((c, ci) => <td key={ci} className="px-2 py-1">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}

          <Button onClick={handleImport} disabled={!file || importing} className="w-full">
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Directory() {
  const { pathname } = useLocation();
  const subcontractorsOnly = pathname === "/vendors/subcontractors";
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isSalesManager = role === "sales_manager";
  const canEdit = isAdmin || isManager;
  const canView = canEdit || isSalesManager;
  const canImport = isAdmin || isManager;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [complianceFormOpen, setComplianceFormOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvImportType, setCsvImportType] = useState<"vendor" | "subcontractor">("vendor");
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [editingProspect, setEditingProspect] = useState<any>(null);
  const [detailEntity, setDetailEntity] = useState<any>(null);
  const [detailType, setDetailType] = useState<"sub" | "vendor">("sub");

  const { data: subcontractors = [], isLoading: subsLoading } = useSubcontractors();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: prospects = [] } = useProspects();
  const deleteSub = useDeleteSubcontractor();
  const deleteVendor = useDeleteVendor();
  const deleteProspect = useDeleteProspect();

  // Sub-Contractors view: only subs (W9/insurance). Contact List is a separate page.
  const allEntities = useMemo(() => {
    const subs = subcontractors.map(s => ({
      ...s, entityType: "sub" as const, displayName: s.company_name, tradeLabel: TRADE_TYPES.find(t => t.value === s.trade_type)?.label || s.trade_type,
    }));
    if (subcontractorsOnly) return subs;
    const vends = vendors.map(v => ({
      ...v, entityType: "vendor" as const, displayName: v.vendor_name, primary_contact_name: v.primary_contact_name, tradeLabel: VENDOR_TYPES.find(t => t.value === v.vendor_type)?.label || v.vendor_type,
    }));
    return [...subs, ...vends];
  }, [subcontractors, vendors, subcontractorsOnly]);

  const filteredEntities = useMemo(() => {
    let filtered = allEntities;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => e.displayName.toLowerCase().includes(q) || e.primary_contact_name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(e => {
        const cs = getComplianceStatus({ coi_status: e.coi_status, w9_status: e.w9_status, ic_agreement_status: e.ic_agreement_status, status: e.status });
        return cs === statusFilter;
      });
    }
    // Employee/sales_rep can only see approved
    if (!canView) {
      filtered = filtered.filter(e => getComplianceStatus({ coi_status: e.coi_status, w9_status: e.w9_status, ic_agreement_status: e.ic_agreement_status, status: e.status }) === "approved");
    }
    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allEntities, search, statusFilter, canView]);

  const counts = useMemo(() => {
    const all = canView ? allEntities : allEntities.filter(e => getComplianceStatus(e) === "approved");
    return {
      total: all.length,
      approved: all.filter(e => getComplianceStatus(e) === "approved").length,
      pending: all.filter(e => getComplianceStatus(e) === "pending").length,
      potential: all.filter(e => getComplianceStatus(e) === "potential").length,
    };
  }, [allEntities, canView]);

  const isLoading = subsLoading || vendorsLoading;

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {subcontractorsOnly ? "Sub-Contractors" : "Subs & Vendors"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {subcontractorsOnly ? "Crews requiring W9 and insurance docs" : "Manage your directory and compliance"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canImport && (
              <>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { setCsvImportType("subcontractor"); setCsvImportOpen(true); }}>
                  <Upload className="h-4 w-4" /> Import
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setComplianceFormOpen(true)}>
                  <Send className="h-4 w-4" /> Request Docs
                </Button>
              </>
            )}
            {canEdit && (
              <>
                <Button className="gap-2 rounded-xl" onClick={() => { setEditingSub(null); setSubFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> Add Sub
                </Button>
                <Button variant="secondary" className="gap-2 rounded-xl" onClick={() => { setEditingVendor(null); setVendorFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> Add Vendor
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", count: counts.total, className: "" },
            { label: "Approved", count: counts.approved, className: "text-emerald-600" },
            { label: "Pending", count: counts.pending, className: "text-amber-600" },
            { label: "Potential", count: counts.potential, className: "text-blue-600" },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.className}`}>{s.count}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          {canView && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="potential">Potential</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Entity Cards Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEntities.map((entity) => (
              <EntityCard
                key={entity.id}
                name={entity.displayName}
                contactName={entity.primary_contact_name}
                phone={entity.phone}
                email={entity.email}
                tradeType={entity.tradeLabel}
                status={entity.status}
                coiStatus={entity.coi_status}
                w9Status={entity.w9_status}
                icStatus={entity.ic_agreement_status}
                canEdit={canEdit}
                onEdit={() => {
                  if (entity.entityType === "sub") { setEditingSub(entity); setSubFormOpen(true); }
                  else { setEditingVendor(entity); setVendorFormOpen(true); }
                }}
                onDelete={() => {
                  if (!confirm(`Delete ${entity.displayName}?`)) return;
                  if (entity.entityType === "sub") deleteSub.mutate(entity.id);
                  else deleteVendor.mutate(entity.id);
                  toast.success("Deleted");
                }}
                onViewDetail={() => {
                  setDetailEntity(entity);
                  setDetailType(entity.entityType);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SubcontractorForm open={subFormOpen} onOpenChange={setSubFormOpen} subcontractor={editingSub} />
      <VendorForm open={vendorFormOpen} onOpenChange={setVendorFormOpen} vendor={editingVendor} />
      <ProspectForm open={prospectFormOpen} onOpenChange={setProspectFormOpen} prospect={editingProspect} />
      <ComplianceRequestForm open={complianceFormOpen} onOpenChange={setComplianceFormOpen} />
      <CsvImportDialog open={csvImportOpen} onOpenChange={setCsvImportOpen} type={csvImportType} />
      <EntityDetailDialog open={!!detailEntity} onOpenChange={(o) => { if (!o) setDetailEntity(null); }} entity={detailEntity} type={detailType} canVerify={isAdmin} />
    </AppLayout>
  );
}
