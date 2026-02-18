import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Pencil, Trash2, Link2, Unlink, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useCommissionReps, useCommissionPayTypes,
  useCreateRep, useUpdateRep, useDeleteRep,
  useCreatePayType, useUpdatePayType, useDeletePayType,
  type CommissionRep, type CommissionPayType,
} from "@/hooks/useCommissionEntries";
import { supabase } from "@/integrations/supabase/client";

export function TrackerSettingsDrawer() {
  const { data: reps = [] } = useCommissionReps();
  const { data: payTypes = [] } = useCommissionPayTypes();
  const createRep = useCreateRep();
  const updateRep = useUpdateRep();
  const deleteRep = useDeleteRep();
  const createPayType = useCreatePayType();
  const updatePayTypeMut = useUpdatePayType();
  const deletePayType = useDeletePayType();

  const [open, setOpen] = useState(false);

  // Pay type form
  const [ptFormOpen, setPtFormOpen] = useState(false);
  const [ptEditing, setPtEditing] = useState<CommissionPayType | null>(null);
  const [ptName, setPtName] = useState("");
  const [ptBg, setPtBg] = useState("#dcfce7");
  const [ptText, setPtText] = useState("#166534");
  const [ptBorder, setPtBorder] = useState("#86efac");

  // Pay type delete
  const [ptDeleteTarget, setPtDeleteTarget] = useState<CommissionPayType | null>(null);
  const [ptReplacement, setPtReplacement] = useState("");
  const [ptEntryCount, setPtEntryCount] = useState(0);

  // Rep form
  const [repFormOpen, setRepFormOpen] = useState(false);
  const [repEditing, setRepEditing] = useState<CommissionRep | null>(null);
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");

  // ——— Pay Type handlers ———
  const openPtForm = (pt?: CommissionPayType) => {
    if (pt) {
      setPtEditing(pt);
      setPtName(pt.name);
      setPtBg(pt.badge_bg);
      setPtText(pt.badge_text);
      setPtBorder(pt.badge_border);
    } else {
      setPtEditing(null);
      setPtName("");
      setPtBg("#dcfce7");
      setPtText("#166534");
      setPtBorder("#86efac");
    }
    setPtFormOpen(true);
  };

  const savePt = () => {
    if (!ptName.trim()) return;
    if (ptEditing) {
      updatePayTypeMut.mutate({ id: ptEditing.id, name: ptName, badge_bg: ptBg, badge_text: ptText, badge_border: ptBorder }, {
        onSuccess: () => { toast.success("Pay type updated"); setPtFormOpen(false); },
      });
    } else {
      createPayType.mutate({ name: ptName, badge_bg: ptBg, badge_text: ptText, badge_border: ptBorder }, {
        onSuccess: () => { toast.success("Pay type created"); setPtFormOpen(false); },
      });
    }
  };

  const startDeletePt = async (pt: CommissionPayType) => {
    const { count } = await supabase.from("commission_entries").select("id", { count: "exact", head: true }).eq("pay_type_id", pt.id);
    setPtEntryCount(count || 0);
    setPtDeleteTarget(pt);
    setPtReplacement("");
  };

  const confirmDeletePt = () => {
    if (!ptDeleteTarget) return;
    if (ptEntryCount > 0 && !ptReplacement) { toast.error("Select a replacement pay type"); return; }
    deletePayType.mutate({ id: ptDeleteTarget.id, replacementId: ptReplacement || ptDeleteTarget.id }, {
      onSuccess: () => { toast.success("Pay type deleted"); setPtDeleteTarget(null); },
    });
  };

  // ——— Rep handlers ———
  const openRepForm = (rep?: CommissionRep) => {
    if (rep) {
      setRepEditing(rep);
      setRepName(rep.name);
      setRepEmail(rep.email || "");
      setRepPhone(rep.phone || "");
    } else {
      setRepEditing(null);
      setRepName("");
      setRepEmail("");
      setRepPhone("");
    }
    setRepFormOpen(true);
  };

  const saveRep = () => {
    if (!repName.trim()) return;
    if (repEditing) {
      updateRep.mutate({ id: repEditing.id, name: repName.toUpperCase(), email: repEmail || null, phone: repPhone || null }, {
        onSuccess: () => { toast.success("Rep updated"); setRepFormOpen(false); },
      });
    } else {
      createRep.mutate({ name: repName, email: repEmail, phone: repPhone }, {
        onSuccess: () => { toast.success("Rep added"); setRepFormOpen(false); },
      });
    }
  };

  const handleDeleteRep = (rep: CommissionRep) => {
    if (!confirm(`Delete ${rep.name}? This will also delete all their commission entries.`)) return;
    deleteRep.mutate(rep.id, { onSuccess: () => toast.success("Rep deleted") });
  };

  const unlinkRep = (rep: CommissionRep) => {
    updateRep.mutate({ id: rep.id, user_id: null } as any, {
      onSuccess: () => toast.success("Rep unlinked from user account"),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tracker Settings</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Pay Types */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Pay Types</h3>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => openPtForm()}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {payTypes.map((pt) => (
                  <div key={pt.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                    <Badge style={{ backgroundColor: pt.badge_bg, color: pt.badge_text, borderColor: pt.badge_border }} className="border text-xs">
                      {pt.name}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openPtForm(pt)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => startDeletePt(pt)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Sales Reps</h3>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => openRepForm()}>
                  <Plus className="h-3 w-3" /> Add Rep
                </Button>
              </div>
              <div className="space-y-2">
                {reps.map((rep) => (
                  <div key={rep.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rep.color }} />
                      <div>
                        <div className="text-sm font-medium">{rep.name}</div>
                        {rep.email && <div className="text-xs text-muted-foreground">{rep.email}</div>}
                      </div>
                      {rep.user_id ? (
                        <Badge variant="secondary" className="text-[10px] h-5 gap-1"><Link2 className="h-2.5 w-2.5" /> Linked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Not linked</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openRepForm(rep)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {rep.user_id && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unlinkRep(rep)}>
                          <Unlink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRep(rep)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {reps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No reps added yet</p>}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Type Form Dialog */}
      <Dialog open={ptFormOpen} onOpenChange={setPtFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ptEditing ? "Edit Pay Type" : "New Pay Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="e.g. Commission" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Badge BG</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={ptBg} onChange={(e) => setPtBg(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={ptBg} onChange={(e) => setPtBg(e.target.value)} className="text-xs h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Text</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={ptText} onChange={(e) => setPtText(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={ptText} onChange={(e) => setPtText(e.target.value)} className="text-xs h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Border</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={ptBorder} onChange={(e) => setPtBorder(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={ptBorder} onChange={(e) => setPtBorder(e.target.value)} className="text-xs h-8" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Preview</Label>
              <Badge style={{ backgroundColor: ptBg, color: ptText, borderColor: ptBorder }} className="border mt-1">{ptName || "Preview"}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtFormOpen(false)}>Cancel</Button>
            <Button onClick={savePt} disabled={!ptName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Type Delete Confirmation */}
      <Dialog open={!!ptDeleteTarget} onOpenChange={() => setPtDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{ptDeleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          {ptEntryCount > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This pay type is used on <strong>{ptEntryCount}</strong> entries. Select a replacement:
              </p>
              <Select value={ptReplacement} onValueChange={setPtReplacement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select replacement..." />
                </SelectTrigger>
                <SelectContent>
                  {payTypes.filter((p) => p.id !== ptDeleteTarget?.id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No entries use this pay type. It can be safely deleted.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeletePt} disabled={ptEntryCount > 0 && !ptReplacement}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rep Form Dialog */}
      <Dialog open={repFormOpen} onOpenChange={setRepFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{repEditing ? "Edit Rep" : "Add Rep"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="FIRST LAST" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={repEmail} onChange={(e) => setRepEmail(e.target.value)} placeholder="rep@tsmroofing.com" type="email" />
              <p className="text-xs text-muted-foreground mt-1">Auto-links to Hub account when user signs up with this email</p>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={repPhone} onChange={(e) => setRepPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepFormOpen(false)}>Cancel</Button>
            <Button onClick={saveRep} disabled={!repName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
