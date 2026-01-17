import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApplications, useCreateApplication, useUpdateApplication } from "@/hooks/useAppGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Archive, Search } from "lucide-react";

const categoryLabels: Record<string, string> = {
  crm: "CRM",
  accounting: "Accounting",
  communications: "Communications",
  suppliers: "Suppliers",
  financing: "Financing",
  training: "Training",
  marketing: "Marketing",
  storage: "Storage",
  social: "Social Media",
  productivity: "Productivity",
  other: "Other",
};

const accessMethodLabels: Record<string, string> = {
  sso_microsoft: "SSO (Microsoft)",
  sso_google: "SSO (Google)",
  vendor_login: "Vendor Login",
  api_key: "API Key",
  other: "Other",
};

export function ApplicationsTable() {
  const { data: applications, isLoading } = useApplications();
  const createApp = useCreateApplication();
  const updateApp = useUpdateApplication();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newApp, setNewApp] = useState({
    app_name: "",
    category: "other" as const,
    source_of_truth: "",
    description: "",
    access_method: "vendor_login" as const,
    vendor_contact: "",
    notes: "",
  });

  const handleCreate = async () => {
    if (!newApp.app_name) return;
    await createApp.mutateAsync(newApp);
    setNewApp({ app_name: "", category: "other", source_of_truth: "", description: "", access_method: "vendor_login", vendor_contact: "", notes: "" });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingApp) return;
    await updateApp.mutateAsync(editingApp);
    setEditingApp(null);
  };

  const handleArchive = async (app: any) => {
    await updateApp.mutateAsync({ id: app.id, status: "archived" });
  };

  const filteredApps = applications?.filter(app => 
    app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Application</DialogTitle>
              <DialogDescription>Add a new company application to track</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application Name *</Label>
                <Input
                  value={newApp.app_name}
                  onChange={(e) => setNewApp({ ...newApp, app_name: e.target.value })}
                  placeholder="e.g., AccuLynx"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newApp.category}
                    onValueChange={(v: any) => setNewApp({ ...newApp, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Method</Label>
                  <Select
                    value={newApp.access_method}
                    onValueChange={(v: any) => setNewApp({ ...newApp, access_method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(accessMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Source of Truth URL</Label>
                <Input
                  value={newApp.source_of_truth}
                  onChange={(e) => setNewApp({ ...newApp, source_of_truth: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newApp.description}
                  onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                  placeholder="Brief description of the application"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor Contact</Label>
                <Input
                  value={newApp.vendor_contact}
                  onChange={(e) => setNewApp({ ...newApp, vendor_contact: e.target.value })}
                  placeholder="Support email or phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newApp.app_name || createApp.isPending}>
                Add Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Access Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredApps?.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{app.app_name}</div>
                  {app.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-xs">{app.description}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{categoryLabels[app.category] || app.category}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {accessMethodLabels[app.access_method || ""] || app.access_method}
              </TableCell>
              <TableCell>
                <Badge variant={app.status === "active" ? "default" : "secondary"}>
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditingApp(app)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {app.status === "active" && (
                    <Button variant="ghost" size="icon" onClick={() => handleArchive(app)}>
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application Name *</Label>
                <Input
                  value={editingApp.app_name}
                  onChange={(e) => setEditingApp({ ...editingApp, app_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingApp.category}
                    onValueChange={(v) => setEditingApp({ ...editingApp, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Method</Label>
                  <Select
                    value={editingApp.access_method}
                    onValueChange={(v) => setEditingApp({ ...editingApp, access_method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(accessMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingApp.description || ""}
                  onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Source of Truth URL</Label>
                <Input
                  value={editingApp.source_of_truth || ""}
                  onChange={(e) => setEditingApp({ ...editingApp, source_of_truth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingApp.notes || ""}
                  onChange={(e) => setEditingApp({ ...editingApp, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApp(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateApp.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
