import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubcontractors, useDeleteSubcontractor } from "@/hooks/useSubcontractors";
import { useVendors, useDeleteVendor } from "@/hooks/useVendors";
import { useProspects, useDeleteProspect } from "@/hooks/useProspects";
import { SubcontractorForm } from "@/components/directory/SubcontractorForm";
import { VendorForm } from "@/components/directory/VendorForm";
import { ProspectForm } from "@/components/directory/ProspectForm";
import { ComplianceRequestForm } from "@/components/directory/ComplianceRequestForm";
import { getStatusColor, getDocStatusColor, getStageColor, TRADE_TYPES, VENDOR_TYPES, PROSPECT_STAGES } from "@/lib/directoryConstants";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Send, Edit, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Directory() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canEdit = isAdmin || isManager;

  const [search, setSearch] = useState("");
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [complianceFormOpen, setComplianceFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [editingProspect, setEditingProspect] = useState<any>(null);

  const { data: subcontractors = [], isLoading: subsLoading } = useSubcontractors();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: prospects = [], isLoading: prospectsLoading } = useProspects();
  const deleteSub = useDeleteSubcontractor();
  const deleteVendor = useDeleteVendor();
  const deleteProspect = useDeleteProspect();

  const filteredSubs = subcontractors.filter(s => 
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    s.primary_contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
    v.primary_contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProspects = prospects.filter(p => 
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  // Compliance stats
  const coiMissing = subcontractors.filter(s => s.coi_status === "missing").length;
  const w9Missing = subcontractors.filter(s => s.w9_status === "missing").length;
  const icMissing = subcontractors.filter(s => s.ic_agreement_status === "missing").length;
  const coiExpiringSoon = subcontractors.filter(s => {
    if (!s.coi_expiration_date) return false;
    const expDate = new Date(s.coi_expiration_date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expDate <= thirtyDays && expDate >= new Date();
  }).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Subcontractors + Vendors</h1>
            <p className="text-muted-foreground">Manage your directory and compliance documents</p>
          </div>
          {canEdit && (
            <Button onClick={() => setComplianceFormOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              Request Compliance Docs
            </Button>
          )}
        </div>

        {/* Compliance Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">COI Missing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{coiMissing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">COI Expiring (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{coiExpiringSoon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">W-9 Missing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{w9Missing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">IC Agreement Missing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{icMissing}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Tabs defaultValue="subcontractors">
          <TabsList>
            <TabsTrigger value="subcontractors">Subcontractors ({subcontractors.length})</TabsTrigger>
            <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({prospects.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="subcontractors" className="space-y-4">
            {canEdit && (
              <Button onClick={() => { setEditingSub(null); setSubFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Subcontractor
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>COI</TableHead>
                  <TableHead>W-9</TableHead>
                  <TableHead>IC Agreement</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.company_name}</TableCell>
                    <TableCell>{sub.primary_contact_name}</TableCell>
                    <TableCell>{TRADE_TYPES.find(t => t.value === sub.trade_type)?.label}</TableCell>
                    <TableCell><Badge className={getStatusColor(sub.status)}>{sub.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell><Badge className={getDocStatusColor(sub.coi_status)}>{sub.coi_status}</Badge></TableCell>
                    <TableCell><Badge className={getDocStatusColor(sub.w9_status)}>{sub.w9_status}</Badge></TableCell>
                    <TableCell><Badge className={getDocStatusColor(sub.ic_agreement_status)}>{sub.ic_agreement_status}</Badge></TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingSub(sub); setSubFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { deleteSub.mutate(sub.id); toast.success("Deleted"); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            {canEdit && (
              <Button onClick={() => { setEditingVendor(null); setVendorFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Vendor
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>COI</TableHead>
                  <TableHead>W-9</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.primary_contact_name}</TableCell>
                    <TableCell>{VENDOR_TYPES.find(t => t.value === vendor.vendor_type)?.label}</TableCell>
                    <TableCell><Badge className={getStatusColor(vendor.status)}>{vendor.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell><Badge className={getDocStatusColor(vendor.coi_status || "missing")}>{vendor.coi_status || "missing"}</Badge></TableCell>
                    <TableCell><Badge className={getDocStatusColor(vendor.w9_status || "missing")}>{vendor.w9_status || "missing"}</Badge></TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingVendor(vendor); setVendorFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { deleteVendor.mutate(vendor.id); toast.success("Deleted"); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="prospects" className="space-y-4">
            {canEdit && (
              <Button onClick={() => { setEditingProspect(null); setProspectFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Prospect
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Next Follow-Up</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((prospect) => (
                  <TableRow key={prospect.id}>
                    <TableCell className="font-medium">{prospect.company_name}</TableCell>
                    <TableCell>{prospect.contact_name}</TableCell>
                    <TableCell className="capitalize">{prospect.prospect_type}</TableCell>
                    <TableCell><Badge className={getStageColor(prospect.stage)}>{PROSPECT_STAGES.find(s => s.value === prospect.stage)?.label}</Badge></TableCell>
                    <TableCell>{prospect.assigned_owner || "-"}</TableCell>
                    <TableCell>{prospect.next_followup_date ? new Date(prospect.next_followup_date).toLocaleDateString() : "-"}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingProspect(prospect); setProspectFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { deleteProspect.mutate(prospect.id); toast.success("Deleted"); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      <SubcontractorForm open={subFormOpen} onOpenChange={setSubFormOpen} subcontractor={editingSub} />
      <VendorForm open={vendorFormOpen} onOpenChange={setVendorFormOpen} vendor={editingVendor} />
      <ProspectForm open={prospectFormOpen} onOpenChange={setProspectFormOpen} prospect={editingProspect} />
      <ComplianceRequestForm open={complianceFormOpen} onOpenChange={setComplianceFormOpen} />
    </AppLayout>
  );
}
