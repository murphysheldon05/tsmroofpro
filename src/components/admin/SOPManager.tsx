import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Pencil, Archive, CheckCircle, Clock, Search } from "lucide-react";
import { useResources, useUpdateResource, Resource, useCategories } from "@/hooks/useResources";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SOPStatus = 'draft' | 'live' | 'archived';

const statusConfig: Record<SOPStatus, { label: string; color: string; icon: React.ElementType }> = {
  live: { label: "Live", color: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle },
  draft: { label: "Draft", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: Clock },
  archived: { label: "Archived", color: "bg-gray-500/15 text-gray-500 border-gray-500/30", icon: Archive },
};

export function SOPManager() {
  const { data: resources, isLoading } = useResources();
  const { data: categories } = useCategories();
  const updateResource = useUpdateResource();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedSOP, setSelectedSOP] = useState<Resource | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SOPStatus | "all">("all");
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category_id: "",
    tags: "",
    visibility: "employee" as "admin" | "manager" | "employee",
  });

  // Filter resources by status and search
  const filteredResources = resources?.filter(r => {
    const status = (r as any).status as SOPStatus || 'live';
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesSearch = !searchQuery || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Group by status for tabs
  const draftSOPs = resources?.filter(r => ((r as any).status as SOPStatus) === 'draft') || [];
  const liveSOPs = resources?.filter(r => !((r as any).status) || ((r as any).status as SOPStatus) === 'live') || [];
  const archivedSOPs = resources?.filter(r => ((r as any).status as SOPStatus) === 'archived') || [];

  const handleStatusChange = async (resource: Resource, newStatus: SOPStatus) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'live') {
        updates.published_at = new Date().toISOString();
        updates.published_by = user?.id;
        updates.archived_at = null;
        updates.archived_by = null;
      } else if (newStatus === 'archived') {
        updates.archived_at = new Date().toISOString();
        updates.archived_by = user?.id;
      } else if (newStatus === 'draft') {
        updates.published_at = null;
        updates.published_by = null;
        updates.archived_at = null;
        updates.archived_by = null;
      }

      const { error } = await supabase
        .from("resources")
        .update(updates)
        .eq("id", resource.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success(`SOP ${newStatus === 'live' ? 'published' : newStatus === 'archived' ? 'archived' : 'unpublished'} successfully`);
    } catch (error: any) {
      toast.error("Failed to update SOP status: " + error.message);
    }
  };

  const handleOpenEdit = (resource: Resource) => {
    setSelectedSOP(resource);
    setEditForm({
      title: resource.title,
      description: resource.description || "",
      category_id: resource.category_id || "",
      tags: resource.tags?.join(", ") || "",
      visibility: resource.visibility,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSOP) return;

    try {
      const { error } = await supabase
        .from("resources")
        .update({
          title: editForm.title,
          description: editForm.description || null,
          category_id: editForm.category_id || null,
          tags: editForm.tags ? editForm.tags.split(",").map(t => t.trim()) : [],
          visibility: editForm.visibility,
          last_updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSOP.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("SOP updated successfully");
      setEditDialogOpen(false);
      setSelectedSOP(null);
    } catch (error: any) {
      toast.error("Failed to update SOP: " + error.message);
    }
  };

  const renderSOPRow = (resource: Resource) => {
    const status = ((resource as any).status as SOPStatus) || 'live';
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
      <div
        key={resource.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{resource.title}</span>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {resource.categories?.name || "Uncategorized"} • v{resource.version}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status Actions */}
          {status === 'draft' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleStatusChange(resource, 'live')}
              className="gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Publish
            </Button>
          )}
          {status === 'live' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(resource, 'draft')}
                className="gap-1"
              >
                <Clock className="h-3.5 w-3.5" />
                Unpublish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(resource, 'archived')}
                className="gap-1"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            </>
          )}
          {status === 'archived' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(resource, 'draft')}
              className="gap-1"
            >
              <Clock className="h-3.5 w-3.5" />
              Restore to Draft
            </Button>
          )}
          
          {/* Edit Button */}
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(resource)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SOP Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SOP Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search SOPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SOPStatus | "all")}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Summary */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              {liveSOPs.length} Live
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">
              <Clock className="h-3 w-3 mr-1" />
              {draftSOPs.length} Draft
            </Badge>
            <Badge variant="outline" className="bg-gray-500/15 text-gray-500 border-gray-500/30">
              <Archive className="h-3 w-3 mr-1" />
              {archivedSOPs.length} Archived
            </Badge>
          </div>

          {/* SOP List */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="all">All ({resources?.length || 0})</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {filteredResources.length > 0 ? (
                    filteredResources.map(renderSOPRow)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No SOPs found matching your filters.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="live" className="mt-0">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {liveSOPs.length > 0 ? (
                    liveSOPs.map(renderSOPRow)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No live SOPs.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="draft" className="mt-0">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {draftSOPs.length > 0 ? (
                    draftSOPs.map(renderSOPRow)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No draft SOPs.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="archived" className="mt-0">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {archivedSOPs.length > 0 ? (
                    archivedSOPs.map(renderSOPRow)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No archived SOPs.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit SOP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="SOP Title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editForm.category_id}
                onValueChange={(v) => setEditForm({ ...editForm, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="sales, field, inspection"
              />
            </div>
            <div className="space-y-2">
              <Label>Role Visibility</Label>
              <Select
                value={editForm.visibility}
                onValueChange={(v) => setEditForm({ ...editForm, visibility: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">All Employees</SelectItem>
                  <SelectItem value="manager">Managers & Admins</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editForm.title}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
