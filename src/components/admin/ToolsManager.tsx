import { useState } from "react";
import { useTools, useCreateTool, useUpdateTool, useDeleteTool, Tool } from "@/hooks/useTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Smartphone, ExternalLink } from "lucide-react";

interface ToolFormData {
  name: string;
  description: string;
  url: string;
  category: string;
  training_url: string;
  ios_app_url: string;
  android_app_url: string;
  sort_order: number;
  is_active: boolean;
}

const emptyFormData: ToolFormData = {
  name: "",
  description: "",
  url: "",
  category: "",
  training_url: "",
  ios_app_url: "",
  android_app_url: "",
  sort_order: 0,
  is_active: true,
};

function ToolForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  initialData: ToolFormData;
  onSubmit: (data: ToolFormData) => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const [formData, setFormData] = useState<ToolFormData>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., CRM, Communication, Estimating"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the tool"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Website URL *</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="training_url" className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Training Resources URL
        </Label>
        <Input
          id="training_url"
          type="url"
          value={formData.training_url}
          onChange={(e) => setFormData({ ...formData, training_url: e.target.value })}
          placeholder="https://example.com/training"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ios_app_url" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            iOS App Store URL
          </Label>
          <Input
            id="ios_app_url"
            type="url"
            value={formData.ios_app_url}
            onChange={(e) => setFormData({ ...formData, ios_app_url: e.target.value })}
            placeholder="https://apps.apple.com/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="android_app_url" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Android Play Store URL
          </Label>
          <Input
            id="android_app_url"
            type="url"
            value={formData.android_app_url}
            onChange={(e) => setFormData({ ...formData, android_app_url: e.target.value })}
            placeholder="https://play.google.com/..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center justify-between pt-6">
          <Label htmlFor="is_active">Active</Label>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

export function ToolsManager() {
  const { data: tools, isLoading } = useTools();
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const handleCreate = (data: ToolFormData) => {
    createTool.mutate(
      {
        name: data.name,
        description: data.description || undefined,
        url: data.url,
        category: data.category,
        sort_order: data.sort_order,
      },
      {
        onSuccess: () => setAddDialogOpen(false),
      }
    );
  };

  const handleUpdate = (data: ToolFormData) => {
    if (!editingTool) return;
    updateTool.mutate(
      {
        id: editingTool.id,
        name: data.name,
        description: data.description || null,
        url: data.url,
        category: data.category,
        training_url: data.training_url || null,
        ios_app_url: data.ios_app_url || null,
        android_app_url: data.android_app_url || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      },
      {
        onSuccess: () => setEditingTool(null),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteTool.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Tools</CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
            <ToolForm
              initialData={emptyFormData}
              onSubmit={handleCreate}
              isLoading={createTool.isPending}
              submitLabel="Add Tool"
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tools?.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tool.name}</span>
                  {!tool.is_active && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{tool.category}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tool.training_url && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Training
                    </span>
                  )}
                  {tool.ios_app_url && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      iOS
                    </span>
                  )}
                  {tool.android_app_url && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      Android
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <Dialog
                  open={editingTool?.id === tool.id}
                  onOpenChange={(open) => !open && setEditingTool(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTool(tool)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Tool</DialogTitle>
                    </DialogHeader>
                    <ToolForm
                      initialData={{
                        name: tool.name,
                        description: tool.description || "",
                        url: tool.url,
                        category: tool.category,
                        training_url: tool.training_url || "",
                        ios_app_url: tool.ios_app_url || "",
                        android_app_url: tool.android_app_url || "",
                        sort_order: tool.sort_order,
                        is_active: tool.is_active,
                      }}
                      onSubmit={handleUpdate}
                      isLoading={updateTool.isPending}
                      submitLabel="Save Changes"
                    />
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{tool.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(tool.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {(!tools || tools.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No tools configured yet. Add your first tool above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
