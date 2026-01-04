import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Plus,
  FileText,
  Users,
  Eye,
  Trash2,
  Edit,
  FolderOpen,
  GripVertical,
} from "lucide-react";
import {
  useResources,
  useCategories,
  useCreateResource,
  useDeleteResource,
} from "@/hooks/useResources";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: resources } = useResources();
  const { data: categories } = useCategories();
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    category_id: "",
    url: "",
    tags: "",
    version: "v1.0",
    visibility: "employee" as "admin" | "manager" | "employee",
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    sort_order: 0,
  });

  const [editCategory, setEditCategory] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    sort_order: 0,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return profiles;
    },
  });

  const handleCreateResource = async () => {
    if (!newResource.title.trim() || !newResource.category_id) {
      toast.error("Title and category are required");
      return;
    }

    await createResource.mutateAsync({
      title: newResource.title.trim(),
      description: newResource.description.trim() || null,
      category_id: newResource.category_id,
      url: newResource.url.trim() || null,
      tags: newResource.tags.split(",").map((t) => t.trim()).filter(Boolean),
      version: newResource.version,
      visibility: newResource.visibility as "admin" | "manager" | "employee",
      owner_id: null,
      file_path: null,
      effective_date: null,
    });

    setNewResource({
      title: "",
      description: "",
      category_id: "",
      url: "",
      tags: "",
      version: "v1.0",
      visibility: "employee",
    });
    setIsAddingResource(false);
  };

  const handleDeleteResource = async (id: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      await deleteResource.mutateAsync(id);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "manager" | "employee" })
      .eq("user_id", userId);
    
    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated successfully");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const slug = newCategory.slug.trim() || newCategory.name.toLowerCase().replace(/\s+/g, "-");
    
    const { error } = await supabase.from("categories").insert({
      name: newCategory.name.trim(),
      slug,
      description: newCategory.description.trim() || null,
      icon: newCategory.icon.trim() || null,
      sort_order: newCategory.sort_order,
    });

    if (error) {
      toast.error("Failed to create category");
    } else {
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategory({ name: "", slug: "", description: "", icon: "", sort_order: 0 });
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const slug = editCategory.slug.trim() || editCategory.name.toLowerCase().replace(/\s+/g, "-");

    const { error } = await supabase
      .from("categories")
      .update({
        name: editCategory.name.trim(),
        slug,
        description: editCategory.description.trim() || null,
        icon: editCategory.icon.trim() || null,
        sort_order: editCategory.sort_order,
      })
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to update category");
    } else {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const resourceCount = resources?.filter(r => r.category_id === categoryId).length || 0;
    
    if (resourceCount > 0) {
      toast.error(`Cannot delete: ${resourceCount} resource(s) are using this category`);
      return;
    }

    if (confirm("Are you sure you want to delete this category?")) {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      
      if (error) {
        toast.error("Failed to delete category");
      } else {
        toast.success("Category deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
    }
  };

  const startEditCategory = (category: any) => {
    setEditingCategory(category.id);
    setEditCategory({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      sort_order: category.sort_order || 0,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">
                Manage resources, users, and settings
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                All Resources ({resources?.length || 0})
              </h2>
              <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Resource</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newResource.title}
                        onChange={(e) =>
                          setNewResource({ ...newResource, title: e.target.value })
                        }
                        placeholder="Resource title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newResource.description}
                        onChange={(e) =>
                          setNewResource({ ...newResource, description: e.target.value })
                        }
                        placeholder="Brief description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                          value={newResource.category_id}
                          onValueChange={(v) =>
                            setNewResource({ ...newResource, category_id: v })
                          }
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
                        <Label>Visibility</Label>
                        <Select
                          value={newResource.visibility}
                          onValueChange={(v: "admin" | "manager" | "employee") =>
                            setNewResource({ ...newResource, visibility: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">All Employees</SelectItem>
                            <SelectItem value="manager">Managers Only</SelectItem>
                            <SelectItem value="admin">Admins Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>URL (Dropbox, SharePoint, etc.)</Label>
                      <Input
                        value={newResource.url}
                        onChange={(e) =>
                          setNewResource({ ...newResource, url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          value={newResource.tags}
                          onChange={(e) =>
                            setNewResource({ ...newResource, tags: e.target.value })
                          }
                          placeholder="sales, checklist"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Version</Label>
                        <Input
                          value={newResource.version}
                          onChange={(e) =>
                            setNewResource({ ...newResource, version: e.target.value })
                          }
                          placeholder="v1.0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingResource(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="neon"
                        onClick={handleCreateResource}
                        disabled={createResource.isPending}
                      >
                        {createResource.isPending ? "Creating..." : "Create Resource"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Views
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resources?.map((resource, index) => (
                    <tr
                      key={resource.id}
                      className={
                        index < (resources?.length || 0) - 1
                          ? "border-b border-border/30"
                          : ""
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{resource.title}</p>
                        <p className="text-xs text-muted-foreground">{resource.version}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary">
                          {resource.categories?.name || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {resource.view_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                All Categories ({categories?.length || 0})
              </h2>
              <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder="Category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug (auto-generated if empty)</Label>
                      <Input
                        value={newCategory.slug}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, slug: e.target.value })
                        }
                        placeholder="category-slug"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newCategory.description}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, description: e.target.value })
                        }
                        placeholder="Brief description of this category"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icon (Lucide icon name)</Label>
                        <Input
                          value={newCategory.icon}
                          onChange={(e) =>
                            setNewCategory({ ...newCategory, icon: e.target.value })
                          }
                          placeholder="e.g., FileText, Wrench"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={newCategory.sort_order}
                          onChange={(e) =>
                            setNewCategory({ ...newCategory, sort_order: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingCategory(false)}
                      >
                        Cancel
                      </Button>
                      <Button variant="neon" onClick={handleCreateCategory}>
                        Create Category
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Resources
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories
                    ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((category, index) => (
                      <tr
                        key={category.id}
                        className={
                          index < (categories?.length || 0) - 1
                            ? "border-b border-border/30"
                            : ""
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="w-4 h-4" />
                            {category.sort_order || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingCategory === category.id ? (
                            <Input
                              value={editCategory.name}
                              onChange={(e) =>
                                setEditCategory({ ...editCategory, name: e.target.value })
                              }
                              className="max-w-[200px]"
                            />
                          ) : (
                            <div>
                              <p className="font-medium text-foreground">{category.name}</p>
                              {category.description && (
                                <p className="text-xs text-muted-foreground">{category.description}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {editingCategory === category.id ? (
                            <Input
                              value={editCategory.slug}
                              onChange={(e) =>
                                setEditCategory({ ...editCategory, slug: e.target.value })
                              }
                              className="max-w-[150px]"
                            />
                          ) : (
                            <Badge variant="secondary">{category.slug}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                          {resources?.filter((r) => r.category_id === category.id).length || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingCategory === category.id ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCategory(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="neon"
                                size="sm"
                                onClick={() => handleUpdateCategory(category.id)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditCategory(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(!categories || categories.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  No categories yet. Create your first category to organize SOPs.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              All Users ({users?.length || 0})
            </h2>

            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user, index) => (
                    <tr
                      key={user.id}
                      className={
                        index < (users?.length || 0) - 1
                          ? "border-b border-border/30"
                          : ""
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {user.full_name || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          defaultValue={(user.user_roles as any)?.[0]?.role || "employee"}
                          onValueChange={(v) => handleUpdateUserRole(user.id, v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
