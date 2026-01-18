import { useState } from "react";
import { useChecklistTemplates, useCreateChecklistTemplate, useUpdateChecklistTemplate } from "@/hooks/useChecklistTemplates";
import { useApplications } from "@/hooks/useApplications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["access", "training", "security", "compliance"];
const ownerRoles = ["system_admin", "it_triage_owner", "onboarding_owner", "business_owner"];

interface TemplateFormData {
  title: string;
  template_type: "onboarding" | "offboarding";
  category: string;
  app_id: string;
  steps: string;
  default_due_days: number;
  applies_to_assignment_role: string;
  is_active: boolean;
}

const defaultFormData: TemplateFormData = {
  title: "",
  template_type: "onboarding",
  category: "access",
  app_id: "",
  steps: "",
  default_due_days: 0,
  applies_to_assignment_role: "",
  is_active: true,
};

export function ChecklistTemplatesManager() {
  const { data: onboardingTemplates, isLoading: loadingOnboarding } = useChecklistTemplates("onboarding");
  const { data: offboardingTemplates, isLoading: loadingOffboarding } = useChecklistTemplates("offboarding");
  const { data: applications } = useApplications();
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);

  const handleSubmit = () => {
    const payload = {
      ...formData,
      app_id: formData.app_id || null,
      applies_to_assignment_role: formData.applies_to_assignment_role || null,
    };

    if (editingId) {
      updateTemplate.mutate({ id: editingId, ...payload } as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingId(null);
          setFormData(defaultFormData);
        },
      });
    } else {
      createTemplate.mutate(payload as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData(defaultFormData);
        },
      });
    }
  };

  const openEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      template_type: template.template_type,
      category: template.category,
      app_id: template.app_id || "",
      steps: template.steps || "",
      default_due_days: template.default_due_days,
      applies_to_assignment_role: template.applies_to_assignment_role || "",
      is_active: template.is_active,
    });
    setDialogOpen(true);
  };

  const openNew = (type: "onboarding" | "offboarding") => {
    setEditingId(null);
    setFormData({ ...defaultFormData, template_type: type });
    setDialogOpen(true);
  };

  const renderTable = (templates: any[] | undefined, isLoading: boolean, type: "onboarding" | "offboarding") => {
    if (isLoading) {
      return <Skeleton className="h-48 w-full" />;
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => openNew(type)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>App-Specific</TableHead>
                <TableHead>Due Days</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell className="capitalize">{template.category}</TableCell>
                    <TableCell>
                      {template.applications?.app_name || (
                        <span className="text-muted-foreground">Global</span>
                      )}
                    </TableCell>
                    <TableCell>{template.default_due_days}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          template.is_active
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }
                      >
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
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
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="onboarding">
        <TabsList>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding" className="mt-4">
          {renderTable(onboardingTemplates, loadingOnboarding, "onboarding")}
        </TabsContent>
        <TabsContent value="offboarding" className="mt-4">
          {renderTable(offboardingTemplates, loadingOffboarding, "offboarding")}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Add Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(v: "onboarding" | "offboarding") =>
                    setFormData({ ...formData, template_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="offboarding">Offboarding</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
            <div>
              <Label>App (optional - leave blank for global)</Label>
              <Select
                value={formData.app_id}
                onValueChange={(v) => setFormData({ ...formData, app_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an app (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (all apps)</SelectItem>
                  {applications?.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.app_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Steps / Description</Label>
              <Textarea
                value={formData.steps}
                onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                placeholder="Describe the steps or provide instructions..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Due Days</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.default_due_days}
                  onChange={(e) =>
                    setFormData({ ...formData, default_due_days: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || createTemplate.isPending || updateTemplate.isPending}
            >
              {editingId ? "Save Changes" : "Add Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
