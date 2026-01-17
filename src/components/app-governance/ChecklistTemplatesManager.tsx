import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useApplications } from "@/hooks/useAppGovernance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryLabels: Record<string, string> = {
  access: "Access",
  training: "Training",
  security: "Security",
  compliance: "Compliance",
};

export function ChecklistTemplatesManager() {
  const { data: applications } = useApplications();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .order("template_type", { ascending: true })
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast({ title: "Template created successfully" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast({ title: "Template updated successfully" });
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    template_type: "onboarding" as const,
    app_id: "",
    title: "",
    steps: "",
    category: "access" as const,
    default_due_days: 1,
    is_active: true,
  });

  const handleCreate = async () => {
    if (!newTemplate.title) return;
    await createTemplate.mutateAsync({
      ...newTemplate,
      app_id: newTemplate.app_id || null,
    });
    setNewTemplate({ template_type: "onboarding", app_id: "", title: "", steps: "", category: "access", default_due_days: 1, is_active: true });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    await updateTemplate.mutateAsync(editingTemplate);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const onboardingTemplates = templates?.filter(t => t.template_type === "onboarding") || [];
  const offboardingTemplates = templates?.filter(t => t.template_type === "offboarding") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Checklist Template</DialogTitle>
              <DialogDescription>Create a reusable checklist template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newTemplate.template_type}
                    onValueChange={(v: any) => setNewTemplate({ ...newTemplate, template_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="offboarding">Offboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(v: any) => setNewTemplate({ ...newTemplate, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Application (optional - leave empty for global)</Label>
                <Select
                  value={newTemplate.app_id}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, app_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Global (all apps)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Global (all apps)</SelectItem>
                    {applications?.filter(a => a.status === "active").map((app) => (
                      <SelectItem key={app.id} value={app.id}>{app.app_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label>Steps / Description</Label>
                <Textarea
                  value={newTemplate.steps}
                  onChange={(e) => setNewTemplate({ ...newTemplate, steps: e.target.value })}
                  placeholder="Detailed steps or description"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Due (days from start)</Label>
                <Input
                  type="number"
                  value={newTemplate.default_due_days}
                  onChange={(e) => setNewTemplate({ ...newTemplate, default_due_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newTemplate.title || createTemplate.isPending}>
                Add Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Onboarding Templates</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Due Days</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {onboardingTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>
                  {template.app_id 
                    ? applications?.find(a => a.id === template.app_id)?.app_name 
                    : <span className="text-muted-foreground">Global</span>
                  }
                </TableCell>
                <TableCell><Badge variant="outline">{categoryLabels[template.category]}</Badge></TableCell>
                <TableCell>{template.default_due_days}</TableCell>
                <TableCell>
                  <Switch 
                    checked={template.is_active} 
                    onCheckedChange={(checked) => updateTemplate.mutate({ id: template.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Offboarding Templates</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Due Days</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offboardingTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>
                  {template.app_id 
                    ? applications?.find(a => a.id === template.app_id)?.app_name 
                    : <span className="text-muted-foreground">Global</span>
                  }
                </TableCell>
                <TableCell><Badge variant="outline">{categoryLabels[template.category]}</Badge></TableCell>
                <TableCell>{template.default_due_days}</TableCell>
                <TableCell>
                  <Switch 
                    checked={template.is_active} 
                    onCheckedChange={(checked) => updateTemplate.mutate({ id: template.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Steps / Description</Label>
                <Textarea
                  value={editingTemplate.steps || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, steps: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingTemplate.category}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v })}
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
                  <Label>Default Due (days)</Label>
                  <Input
                    type="number"
                    value={editingTemplate.default_due_days}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, default_due_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
