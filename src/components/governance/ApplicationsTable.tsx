import { useState } from "react";
import { useApplications, useCreateApplication, useUpdateApplication } from "@/hooks/useApplications";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["crm", "accounting", "communications", "suppliers", "financing", "training", "marketing", "storage", "social", "productivity", "other"];
const accessMethods = ["sso_microsoft", "sso_google", "vendor_login", "api_key", "other"];

interface ApplicationFormData {
  app_name: string;
  category: string;
  source_of_truth: string;
  description: string;
  access_method: string;
  vendor_contact: string;
  notes: string;
  status: string;
}

const defaultFormData: ApplicationFormData = {
  app_name: "",
  category: "other",
  source_of_truth: "",
  description: "",
  access_method: "vendor_login",
  vendor_contact: "",
  notes: "",
  status: "active",
};

export function ApplicationsTable() {
  const { data: applications, isLoading } = useApplications();
  const createApp = useCreateApplication();
  const updateApp = useUpdateApplication();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>(defaultFormData);

  const filteredApps = applications?.filter((app) => {
    const matchesSearch = app.app_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || app.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSubmit = () => {
    if (editingId) {
      updateApp.mutate({ id: editingId, ...formData } as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingId(null);
          setFormData(defaultFormData);
        },
      });
    } else {
      createApp.mutate(formData as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData(defaultFormData);
        },
      });
    }
  };

  const openEdit = (app: any) => {
    setEditingId(app.id);
    setFormData({
      app_name: app.app_name,
      category: app.category,
      source_of_truth: app.source_of_truth || "",
      description: app.description || "",
      access_method: app.access_method || "vendor_login",
      vendor_contact: app.vendor_contact || "",
      notes: app.notes || "",
      status: app.status,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Application" : "Add Application"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>App Name *</Label>
                  <Input
                    value={formData.app_name}
                    onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Access Method</Label>
                  <Select
                    value={formData.access_method}
                    onValueChange={(v) => setFormData({ ...formData, access_method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accessMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Source of Truth</Label>
                  <Input
                    value={formData.source_of_truth}
                    onChange={(e) => setFormData({ ...formData, source_of_truth: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Vendor Contact</Label>
                  <Input
                    value={formData.vendor_contact}
                    onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.app_name || createApp.isPending || updateApp.isPending}
              >
                {editingId ? "Save Changes" : "Add Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Access Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApps?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              filteredApps?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_name}</TableCell>
                  <TableCell className="capitalize">{app.category}</TableCell>
                  <TableCell className="capitalize">{app.access_method?.replace(/_/g, " ") || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        app.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(app)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
