import { useState, useRef } from "react";
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
  Upload,
  X,
  File,
  Loader2,
  Type,
  ScrollText,
  Wrench,
  Send,
  Video,
  Play,
  Shield,
  Mail,
  CheckCircle,
  Clock,
  Bell,
} from "lucide-react";
import { UserPermissionsEditor } from "@/components/admin/UserPermissionsEditor";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { PendingApprovals } from "@/components/admin/PendingApprovals";
import {
  useResources,
  useCategories,
  useCreateResource,
  useDeleteResource,
  useUpdateResource,
  type Resource,
} from "@/hooks/useResources";
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  type Policy,
} from "@/hooks/usePolicies";
import {
  useTools,
  useCreateTool,
  useUpdateTool,
  type Tool,
} from "@/hooks/useTools";
import {
  useRequestTypes,
  useCreateRequestType,
  useUpdateRequestType,
  type RequestType,
} from "@/hooks/useRequestTypes";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getThumbnailUrl } from "@/components/training/VideoCard";
import { NotificationSettingsManager } from "@/components/admin/NotificationSettingsManager";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: resources } = useResources();
  const { data: categories } = useCategories();
  const { data: policies } = usePolicies();
  const { data: tools } = useTools();
  const { data: requestTypes } = useRequestTypes();
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();
  const updateResource = useUpdateResource();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const createRequestType = useCreateRequestType();
  const updateRequestType = useUpdateRequestType();

  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [isAddingRequestType, setIsAddingRequestType] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [resendingInviteFor, setResendingInviteFor] = useState<string | null>(null);
  const [resendInviteDialog, setResendInviteDialog] = useState<{ userId: string; email: string; fullName: string } | null>(null);
  const [resendPassword, setResendPassword] = useState("");
  const [resendAllDialog, setResendAllDialog] = useState(false);
  const [resendAllPassword, setResendAllPassword] = useState("");
  const [isResendingAll, setIsResendingAll] = useState(false);
  const [newlyCreatedEmployeeId, setNewlyCreatedEmployeeId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [editingRequestType, setEditingRequestType] = useState<RequestType | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserPermissions, setEditingUserPermissions] = useState<any | null>(null);
  const [editingVideo, setEditingVideo] = useState<Resource | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Video thumbnail upload state
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [editSelectedThumbnail, setEditSelectedThumbnail] = useState<File | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const editThumbnailInputRef = useRef<HTMLInputElement>(null);
  
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee" as "admin" | "manager" | "employee",
  });

  const [editUserData, setEditUserData] = useState({
    full_name: "",
    email: "",
  });
  
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    body: "",
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

  const [newPolicy, setNewPolicy] = useState({
    title: "",
    description: "",
    url: "",
    sort_order: 0,
  });

  const [editPolicyData, setEditPolicyData] = useState({
    title: "",
    description: "",
    url: "",
    sort_order: 0,
  });

  const [newTool, setNewTool] = useState({
    name: "",
    description: "",
    url: "",
    category: "",
    sort_order: 0,
  });

  const [editToolData, setEditToolData] = useState({
    name: "",
    description: "",
    url: "",
    category: "",
    sort_order: 0,
  });

  const [newRequestType, setNewRequestType] = useState({
    value: "",
    label: "",
    description: "",
    icon: "",
    sort_order: 0,
  });

  const [editRequestTypeData, setEditRequestTypeData] = useState({
    value: "",
    label: "",
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

  const [editResource, setEditResource] = useState({
    title: "",
    description: "",
    body: "",
    category_id: "",
    url: "",
    tags: "",
    version: "",
    visibility: "employee" as "admin" | "manager" | "employee",
  });

  const [newVideo, setNewVideo] = useState({
    title: "",
    description: "",
    url: "",
    thumbnailUrl: "",
    visibility: "employee" as "admin" | "manager" | "employee",
  });

  const [editVideoData, setEditVideoData] = useState({
    title: "",
    description: "",
    url: "",
    thumbnailUrl: "",
    visibility: "employee" as "admin" | "manager" | "employee",
  });

  // Video library category ID
  const VIDEO_LIBRARY_CATEGORY_ID = "386f6baa-f5fd-4f10-a6d0-f7f8320d3a3a";

  const { data: videos } = useQuery({
    queryKey: ["video-library-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("category_id", VIDEO_LIBRARY_CATEGORY_ID)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Resource[];
    },
  });

  const {
    data: users,
    isFetching: isUsersFetching,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles (there is no FK relationship, so we join client-side)
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleByUserId = new Map<string, "admin" | "manager" | "employee">(
        (roles ?? []).map((r) => [r.user_id, r.role])
      );

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      }));
    },
    // Keep the list fresh across multiple admins without needing a hard refresh.
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 20MB
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      if (isEdit) {
        setEditSelectedFile(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  const clearSelectedFile = (isEdit = false) => {
    if (isEdit) {
      setEditSelectedFile(null);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
    } else {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setEditResource({
      title: resource.title,
      description: resource.description || "",
      body: resource.body || "",
      category_id: resource.category_id || "",
      url: resource.url || "",
      tags: resource.tags?.join(", ") || "",
      version: resource.version || "v1.0",
      visibility: resource.visibility,
    });
    setEditSelectedFile(null);
  };

  const handleUpdateResource = async () => {
    if (!editingResource) return;
    
    if (!editResource.title.trim() || !editResource.category_id) {
      toast.error("Title and category are required");
      return;
    }

    let filePath = editingResource.file_path;

    // Upload new file if selected
    if (editSelectedFile) {
      setIsUploading(true);
      try {
        const fileExt = editSelectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resource-documents")
          .upload(storagePath, editSelectedFile);

        if (uploadError) {
          toast.error("Failed to upload file: " + uploadError.message);
          setIsUploading(false);
          return;
        }

        // Delete old file if exists
        if (editingResource.file_path) {
          await supabase.storage
            .from("resource-documents")
            .remove([editingResource.file_path]);
        }

        filePath = storagePath;
      } catch (error) {
        toast.error("Failed to upload file");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await updateResource.mutateAsync({
      id: editingResource.id,
      title: editResource.title.trim(),
      description: editResource.description.trim() || null,
      body: editResource.body.trim() || null,
      category_id: editResource.category_id,
      url: editResource.url.trim() || null,
      tags: editResource.tags.split(",").map((t) => t.trim()).filter(Boolean),
      version: editResource.version,
      visibility: editResource.visibility,
      file_path: filePath,
    });

    setEditingResource(null);
    setEditSelectedFile(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingFile = async () => {
    if (!editingResource?.file_path) return;
    
    // Delete from storage
    await supabase.storage
      .from("resource-documents")
      .remove([editingResource.file_path]);
    
    // Update resource to remove file_path
    await updateResource.mutateAsync({
      id: editingResource.id,
      file_path: null,
    });
    
    setEditingResource({ ...editingResource, file_path: null });
    toast.success("File removed");
  };

  const handleCreateResource = async () => {
    if (!newResource.title.trim() || !newResource.category_id) {
      toast.error("Title and category are required");
      return;
    }

    if (!newResource.url.trim() && !selectedFile && !newResource.body.trim()) {
      toast.error("Please provide a URL, upload a file, or add body content");
      return;
    }

    let filePath: string | null = null;

    // Upload file if selected
    if (selectedFile) {
      setIsUploading(true);
      try {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resource-documents")
          .upload(storagePath, selectedFile);

        if (uploadError) {
          toast.error("Failed to upload file: " + uploadError.message);
          setIsUploading(false);
          return;
        }

        filePath = storagePath;
      } catch (error) {
        toast.error("Failed to upload file");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await createResource.mutateAsync({
      title: newResource.title.trim(),
      description: newResource.description.trim() || null,
      body: newResource.body.trim() || null,
      category_id: newResource.category_id,
      url: newResource.url.trim() || null,
      tags: newResource.tags.split(",").map((t) => t.trim()).filter(Boolean),
      version: newResource.version,
      visibility: newResource.visibility as "admin" | "manager" | "employee",
      owner_id: null,
      file_path: filePath,
      effective_date: null,
    });

    setNewResource({
      title: "",
      description: "",
      body: "",
      category_id: "",
      url: "",
      tags: "",
      version: "v1.0",
      visibility: "employee",
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      .upsert(
        { user_id: userId, role: newRole as "admin" | "manager" | "employee" },
        { onConflict: "user_id" }
      );

    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const handleCreateUser = async () => {
    toast.info("New users can now sign up directly and will await your approval.");
    setIsAddingUser(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This will permanently remove their account and cannot be undone.`)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
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
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <ScrollText className="w-4 h-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Wrench className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="request-types" className="gap-2">
              <Send className="w-4 h-4" />
              Forms
            </TabsTrigger>
            <TabsTrigger value="video-library" className="gap-2">
              <Video className="w-4 h-4" />
              Video Library
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="gap-2">
              <Mail className="w-4 h-4" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
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
                    
                    {/* Content Options */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        Body Content (paste or type directly)
                      </Label>
                      <RichTextEditor
                        content={newResource.body}
                        onChange={(content) => setNewResource({ ...newResource, body: content })}
                        placeholder="Paste or type your content here..."
                      />
                      <p className="text-xs text-muted-foreground">
                        You can paste formatted text directly, or use URL/file upload below
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or link/upload</span>
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
                        disabled={!!selectedFile}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Or Upload a File</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        disabled={!!newResource.url.trim()}
                      />
                      {selectedFile ? (
                        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                          <File className="w-5 h-5 text-primary" />
                          <span className="text-sm text-foreground flex-1 truncate">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => clearSelectedFile()}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!!newResource.url.trim()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Max 20MB. PDF, Word, Excel, PowerPoint, TXT, CSV
                      </p>
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
                        disabled={createResource.isPending || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : createResource.isPending ? (
                          "Creating..."
                        ) : (
                          "Create Resource"
                        )}
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{resource.title}</p>
                          {resource.file_path && (
                            <Badge variant="outline" className="text-xs">
                              <File className="w-3 h-3 mr-1" />
                              File
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditResource(resource)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Edit Resource Dialog */}
            <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Resource</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={editResource.title}
                      onChange={(e) =>
                        setEditResource({ ...editResource, title: e.target.value })
                      }
                      placeholder="Resource title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editResource.description}
                      onChange={(e) =>
                        setEditResource({ ...editResource, description: e.target.value })
                      }
                      placeholder="Brief description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={editResource.category_id}
                        onValueChange={(v) =>
                          setEditResource({ ...editResource, category_id: v })
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
                        value={editResource.visibility}
                        onValueChange={(v: "admin" | "manager" | "employee") =>
                          setEditResource({ ...editResource, visibility: v })
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
                  
                  {/* Body Content Editor */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Body Content
                    </Label>
                    <RichTextEditor
                      content={editResource.body}
                      onChange={(content) => setEditResource({ ...editResource, body: content })}
                      placeholder="Paste or type your content here..."
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or link/upload</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>URL (Dropbox, SharePoint, etc.)</Label>
                    <Input
                      value={editResource.url}
                      onChange={(e) =>
                        setEditResource({ ...editResource, url: e.target.value })
                      }
                      placeholder="https://..."
                      disabled={!!editSelectedFile || !!editingResource?.file_path}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>File</Label>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      onChange={(e) => handleFileSelect(e, true)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    />
                    
                    {editingResource?.file_path && !editSelectedFile ? (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                        <File className="w-5 h-5 text-primary" />
                        <span className="text-sm text-foreground flex-1 truncate">
                          Current file: {editingResource.file_path.split('/').pop()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editFileInputRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleRemoveExistingFile}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : editSelectedFile ? (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                        <File className="w-5 h-5 text-primary" />
                        <span className="text-sm text-foreground flex-1 truncate">
                          {editSelectedFile.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(editSelectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => clearSelectedFile(true)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={!!editResource.url.trim()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Max 20MB. PDF, Word, Excel, PowerPoint, TXT, CSV
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={editResource.tags}
                        onChange={(e) =>
                          setEditResource({ ...editResource, tags: e.target.value })
                        }
                        placeholder="sales, checklist"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input
                        value={editResource.version}
                        onChange={(e) =>
                          setEditResource({ ...editResource, version: e.target.value })
                        }
                        placeholder="v1.0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setEditingResource(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="neon"
                      onClick={handleUpdateResource}
                      disabled={updateResource.isPending || isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : updateResource.isPending ? (
                        "Saving..."
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          <TabsContent value="users" className="space-y-6">
            {/* Pending Approvals Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending Approvals</h2>
              <PendingApprovals />
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                All Users ({users?.length || 0})
              </h2>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchUsers()}
                  disabled={isUsersFetching}
                >
                  {isUsersFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                </Button>

                {/* Resend All Invites Button */}
                {users?.some(u => u.must_reset_password) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResendAllDialog(true)}
                    className="gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    Resend All Invites
                  </Button>
                )}

                <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                  <DialogTrigger asChild>
                    <Button variant="neon">
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite New Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Temporary Password *</Label>
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(v) =>
                            setNewUser({ ...newUser, role: v as "admin" | "manager" | "employee" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleCreateUser}
                        className="w-full"
                        disabled={isCreatingUser}
                      >
                        {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Employee Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Permissions dialog for newly created employee */}
              <Dialog open={!!newlyCreatedEmployeeId}
                onOpenChange={(open) => {
                  if (!open) {
                    setNewlyCreatedEmployeeId(null);
                    setNewUser({ full_name: "", email: "", password: "", role: "employee" });
                  }
                }}
              >
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set Permissions for {newUser.full_name}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Customize which sidebar sections this employee can access. Leave all unchecked for full access.
                  </p>
                  <div className="mt-4">
                    {newlyCreatedEmployeeId && (
                      <UserPermissionsEditor
                        userId={newlyCreatedEmployeeId}
                        userRole="employee"
                        onClose={() => {
                          setNewlyCreatedEmployeeId(null);
                          setNewUser({ full_name: "", email: "", password: "", role: "employee" });
                        }}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Resend Invite Dialog */}
            <Dialog 
              open={!!resendInviteDialog} 
              onOpenChange={(open) => {
                if (!open) {
                  setResendInviteDialog(null);
                  setResendPassword("");
                }
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Resend Invite Email</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Send new login credentials to <strong>{resendInviteDialog?.fullName || resendInviteDialog?.email}</strong>
                  </p>
                  <div className="space-y-2">
                    <Label>New Temporary Password *</Label>
                    <Input
                      type="password"
                      value={resendPassword}
                      onChange={(e) => setResendPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!resendInviteDialog || !resendPassword) {
                        toast.error("Please enter a new password");
                        return;
                      }
                      if (resendPassword.length < 6) {
                        toast.error("Password must be at least 6 characters");
                        return;
                      }

                      setResendingInviteFor(resendInviteDialog.userId);
                      try {
                        const { data, error } = await supabase.functions.invoke("resend-invite", {
                          body: {
                            user_id: resendInviteDialog.userId,
                            new_password: resendPassword,
                          },
                        });

                        if (error) {
                          toast.error("Failed to resend invite: " + error.message);
                        } else if (data?.email_sent) {
                          toast.success("Invite email sent successfully!");
                          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                        } else {
                          toast.success("Password updated. Email could not be sent - please share credentials manually.");
                        }
                      } catch (err) {
                        toast.error("Failed to resend invite");
                      }
                      setResendingInviteFor(null);
                      setResendInviteDialog(null);
                      setResendPassword("");
                    }}
                    className="w-full"
                    disabled={resendingInviteFor === resendInviteDialog?.userId}
                  >
                    {resendingInviteFor === resendInviteDialog?.userId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invite Email
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Resend All Invites Dialog */}
            <Dialog 
              open={resendAllDialog} 
              onOpenChange={(open) => {
                if (!open) {
                  setResendAllDialog(false);
                  setResendAllPassword("");
                }
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Resend All Pending Invites</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    This will send invite emails to all <strong>{users?.filter(u => u.must_reset_password).length || 0}</strong> users with pending status.
                  </p>
                  <div className="space-y-2">
                    <Label>New Temporary Password for All *</Label>
                    <Input
                      type="password"
                      value={resendAllPassword}
                      onChange={(e) => setResendAllPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                    <p className="text-xs text-muted-foreground">
                      All pending users will receive this same password
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!resendAllPassword) {
                        toast.error("Please enter a password");
                        return;
                      }
                      if (resendAllPassword.length < 6) {
                        toast.error("Password must be at least 6 characters");
                        return;
                      }

                      const pendingUsers = users?.filter(u => u.must_reset_password) || [];
                      if (pendingUsers.length === 0) {
                        toast.info("No pending users to send invites to");
                        return;
                      }

                      setIsResendingAll(true);
                      let successCount = 0;
                      let failCount = 0;

                      for (const user of pendingUsers) {
                        try {
                          const { data, error } = await supabase.functions.invoke("resend-invite", {
                            body: {
                              user_id: user.id,
                              new_password: resendAllPassword,
                            },
                          });

                          if (error) {
                            failCount++;
                          } else if (data?.email_sent) {
                            successCount++;
                          } else {
                            failCount++;
                          }
                        } catch {
                          failCount++;
                        }
                      }

                      setIsResendingAll(false);
                      setResendAllDialog(false);
                      setResendAllPassword("");
                      queryClient.invalidateQueries({ queryKey: ["admin-users"] });

                      if (failCount === 0) {
                        toast.success(`Successfully sent ${successCount} invite emails!`);
                      } else if (successCount === 0) {
                        toast.error(`Failed to send all ${failCount} invites`);
                      } else {
                        toast.warning(`Sent ${successCount} invites, ${failCount} failed`);
                      }
                    }}
                    className="w-full"
                    disabled={isResendingAll}
                  >
                    {isResendingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending Invites...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send All Invites
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
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
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {user.must_reset_password ? (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                        {user.last_login_at ? (
                          new Date(user.last_login_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-muted-foreground/50">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          key={`${user.id}-${user.role}`}
                          defaultValue={user.role || "employee"}
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
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Permissions button - only show for employees */}
                          {user.role === "employee" && (
                            <Dialog
                              open={editingUserPermissions?.id === user.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditingUserPermissions(user);
                                } else {
                                  setEditingUserPermissions(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Permissions">
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit Permissions - {user.full_name || user.email}</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                  <UserPermissionsEditor
                                    userId={user.id}
                                    userRole={user.role || "employee"}
                                    onClose={() => setEditingUserPermissions(null)}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Dialog
                            open={editingUser?.id === user.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingUser(user);
                                setEditUserData({
                                  full_name: user.full_name || "",
                                  email: user.email || "",
                                });
                              } else {
                                setEditingUser(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Employee</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Full Name</Label>
                                  <Input
                                    value={editUserData.full_name}
                                    onChange={(e) => setEditUserData({ ...editUserData, full_name: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Email</Label>
                                  <Input
                                    type="email"
                                    value={editUserData.email}
                                    disabled
                                    className="opacity-50"
                                  />
                                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>
                                <Button
                                  onClick={async () => {
                                    if (!editUserData.full_name.trim()) {
                                      toast.error("Full name is required");
                                      return;
                                    }
                                    const { error } = await supabase
                                      .from("profiles")
                                      .update({ full_name: editUserData.full_name.trim() })
                                      .eq("id", user.id);
                                    
                                    if (error) {
                                      toast.error("Failed to update employee");
                                    } else {
                                      toast.success("Employee updated successfully");
                                      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                                      setEditingUser(null);
                                    }
                                  }}
                                  className="w-full"
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Resend Invite"
                            onClick={() => setResendInviteDialog({
                              userId: user.id,
                              email: user.email || "",
                              fullName: user.full_name || "",
                            })}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(user.id, user.full_name || user.email || "this user")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Company Policies ({policies?.length || 0})
              </h2>
              <Dialog open={isAddingPolicy} onOpenChange={setIsAddingPolicy}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newPolicy.title}
                        onChange={(e) =>
                          setNewPolicy({ ...newPolicy, title: e.target.value })
                        }
                        placeholder="e.g. Employee Handbook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newPolicy.description}
                        onChange={(e) =>
                          setNewPolicy({ ...newPolicy, description: e.target.value })
                        }
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL (link to document)</Label>
                      <Input
                        value={newPolicy.url}
                        onChange={(e) =>
                          setNewPolicy({ ...newPolicy, url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={newPolicy.sort_order}
                        onChange={(e) =>
                          setNewPolicy({ ...newPolicy, sort_order: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newPolicy.title.trim()) {
                          toast.error("Title is required");
                          return;
                        }
                        await createPolicy.mutateAsync({
                          title: newPolicy.title.trim(),
                          description: newPolicy.description.trim() || null,
                          url: newPolicy.url.trim() || null,
                          file_path: null,
                          sort_order: newPolicy.sort_order,
                          is_active: true,
                        });
                        setNewPolicy({ title: "", description: "", url: "", sort_order: 0 });
                        setIsAddingPolicy(false);
                      }}
                      className="w-full"
                      disabled={createPolicy.isPending}
                    >
                      {createPolicy.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Add Policy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Policies List */}
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Order
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policies?.map((policy, index) => (
                    <tr
                      key={policy.id}
                      className={
                        index < (policies?.length || 0) - 1
                          ? "border-b border-border/30"
                          : ""
                      }
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{policy.title}</p>
                          {policy.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                        {policy.url || "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {policy.sort_order}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog
                            open={editingPolicy?.id === policy.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingPolicy(policy);
                                setEditPolicyData({
                                  title: policy.title,
                                  description: policy.description || "",
                                  url: policy.url || "",
                                  sort_order: policy.sort_order,
                                });
                              } else {
                                setEditingPolicy(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Policy</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Title *</Label>
                                  <Input
                                    value={editPolicyData.title}
                                    onChange={(e) =>
                                      setEditPolicyData({ ...editPolicyData, title: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editPolicyData.description}
                                    onChange={(e) =>
                                      setEditPolicyData({ ...editPolicyData, description: e.target.value })
                                    }
                                    rows={2}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>URL</Label>
                                  <Input
                                    value={editPolicyData.url}
                                    onChange={(e) =>
                                      setEditPolicyData({ ...editPolicyData, url: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Sort Order</Label>
                                  <Input
                                    type="number"
                                    value={editPolicyData.sort_order}
                                    onChange={(e) =>
                                      setEditPolicyData({
                                        ...editPolicyData,
                                        sort_order: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <Button
                                  onClick={async () => {
                                    if (!editPolicyData.title.trim()) {
                                      toast.error("Title is required");
                                      return;
                                    }
                                    await updatePolicy.mutateAsync({
                                      id: policy.id,
                                      title: editPolicyData.title.trim(),
                                      description: editPolicyData.description.trim() || null,
                                      url: editPolicyData.url.trim() || null,
                                      sort_order: editPolicyData.sort_order,
                                    });
                                    setEditingPolicy(null);
                                  }}
                                  className="w-full"
                                  disabled={updatePolicy.isPending}
                                >
                                  {updatePolicy.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : null}
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this policy?")) {
                                deletePolicy.mutate(policy.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!policies || policies.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No policies yet. Add your first policy above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Tools & Systems ({tools?.length || 0})
              </h2>
              <Dialog open={isAddingTool} onOpenChange={setIsAddingTool}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tool
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Tool</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={newTool.name}
                        onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                        placeholder="Tool name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newTool.description}
                        onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL *</Label>
                      <Input
                        value={newTool.url}
                        onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Input
                          value={newTool.category}
                          onChange={(e) => setNewTool({ ...newTool, category: e.target.value })}
                          placeholder="e.g., Project Management"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={newTool.sort_order}
                          onChange={(e) => setNewTool({ ...newTool, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newTool.name.trim() || !newTool.url.trim() || !newTool.category.trim()) {
                          toast.error("Name, URL, and category are required");
                          return;
                        }
                        await createTool.mutateAsync({
                          name: newTool.name.trim(),
                          description: newTool.description.trim() || undefined,
                          url: newTool.url.trim(),
                          category: newTool.category.trim(),
                          sort_order: newTool.sort_order,
                        });
                        setNewTool({ name: "", description: "", url: "", category: "", sort_order: 0 });
                        setIsAddingTool(false);
                      }}
                      className="w-full"
                      disabled={createTool.isPending}
                    >
                      {createTool.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Add Tool
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">URL</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tools?.map((tool) => (
                    <tr key={tool.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{tool.name}</div>
                        {tool.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">{tool.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{tool.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm truncate max-w-xs">
                        {tool.url}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog
                            open={editingTool?.id === tool.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingTool(tool);
                                setEditToolData({
                                  name: tool.name,
                                  description: tool.description || "",
                                  url: tool.url,
                                  category: tool.category,
                                  sort_order: tool.sort_order,
                                });
                              } else {
                                setEditingTool(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Tool</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Name *</Label>
                                  <Input
                                    value={editToolData.name}
                                    onChange={(e) => setEditToolData({ ...editToolData, name: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editToolData.description}
                                    onChange={(e) => setEditToolData({ ...editToolData, description: e.target.value })}
                                    rows={2}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>URL *</Label>
                                  <Input
                                    value={editToolData.url}
                                    onChange={(e) => setEditToolData({ ...editToolData, url: e.target.value })}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Input
                                      value={editToolData.category}
                                      onChange={(e) => setEditToolData({ ...editToolData, category: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Sort Order</Label>
                                    <Input
                                      type="number"
                                      value={editToolData.sort_order}
                                      onChange={(e) => setEditToolData({ ...editToolData, sort_order: parseInt(e.target.value) || 0 })}
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={async () => {
                                    if (!editToolData.name.trim() || !editToolData.url.trim() || !editToolData.category.trim()) {
                                      toast.error("Name, URL, and category are required");
                                      return;
                                    }
                                    await updateTool.mutateAsync({
                                      id: tool.id,
                                      name: editToolData.name.trim(),
                                      description: editToolData.description.trim() || null,
                                      url: editToolData.url.trim(),
                                      category: editToolData.category.trim(),
                                      sort_order: editToolData.sort_order,
                                    });
                                    setEditingTool(null);
                                  }}
                                  className="w-full"
                                  disabled={updateTool.isPending}
                                >
                                  {updateTool.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!tools || tools.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No tools yet. Add your first tool above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Request Types Tab */}
          <TabsContent value="request-types" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Form Types ({requestTypes?.length || 0})
              </h2>
              <Dialog open={isAddingRequestType} onOpenChange={setIsAddingRequestType}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Form Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Form Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Value (unique ID) *</Label>
                        <Input
                          value={newRequestType.value}
                          onChange={(e) => setNewRequestType({ ...newRequestType, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          placeholder="e.g., time_off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label *</Label>
                        <Input
                          value={newRequestType.label}
                          onChange={(e) => setNewRequestType({ ...newRequestType, label: e.target.value })}
                          placeholder="e.g., Time Off Request"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newRequestType.description}
                        onChange={(e) => setNewRequestType({ ...newRequestType, description: e.target.value })}
                        placeholder="Brief description of this form type"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icon Name</Label>
                        <Input
                          value={newRequestType.icon}
                          onChange={(e) => setNewRequestType({ ...newRequestType, icon: e.target.value })}
                          placeholder="e.g., Calendar, Clock"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={newRequestType.sort_order}
                          onChange={(e) => setNewRequestType({ ...newRequestType, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newRequestType.value.trim() || !newRequestType.label.trim()) {
                          toast.error("Value and label are required");
                          return;
                        }
                        await createRequestType.mutateAsync({
                          value: newRequestType.value.trim(),
                          label: newRequestType.label.trim(),
                          description: newRequestType.description.trim() || undefined,
                          icon: newRequestType.icon.trim() || undefined,
                          sort_order: newRequestType.sort_order,
                        });
                        setNewRequestType({ value: "", label: "", description: "", icon: "", sort_order: 0 });
                        setIsAddingRequestType(false);
                      }}
                      className="w-full"
                      disabled={createRequestType.isPending}
                    >
                      {createRequestType.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Add Form Type
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {requestTypes?.map((rt) => (
                    <tr key={rt.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{rt.label}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">{rt.value}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm truncate max-w-xs">
                        {rt.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog
                            open={editingRequestType?.id === rt.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingRequestType(rt);
                                setEditRequestTypeData({
                                  value: rt.value,
                                  label: rt.label,
                                  description: rt.description || "",
                                  icon: rt.icon || "",
                                  sort_order: rt.sort_order,
                                });
                              } else {
                                setEditingRequestType(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Form Type</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Value (unique ID) *</Label>
                                    <Input
                                      value={editRequestTypeData.value}
                                      onChange={(e) => setEditRequestTypeData({ ...editRequestTypeData, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Label *</Label>
                                    <Input
                                      value={editRequestTypeData.label}
                                      onChange={(e) => setEditRequestTypeData({ ...editRequestTypeData, label: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editRequestTypeData.description}
                                    onChange={(e) => setEditRequestTypeData({ ...editRequestTypeData, description: e.target.value })}
                                    rows={2}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Icon Name</Label>
                                    <Input
                                      value={editRequestTypeData.icon}
                                      onChange={(e) => setEditRequestTypeData({ ...editRequestTypeData, icon: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Sort Order</Label>
                                    <Input
                                      type="number"
                                      value={editRequestTypeData.sort_order}
                                      onChange={(e) => setEditRequestTypeData({ ...editRequestTypeData, sort_order: parseInt(e.target.value) || 0 })}
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={async () => {
                                    if (!editRequestTypeData.value.trim() || !editRequestTypeData.label.trim()) {
                                      toast.error("Value and label are required");
                                      return;
                                    }
                                    await updateRequestType.mutateAsync({
                                      id: rt.id,
                                      value: editRequestTypeData.value.trim(),
                                      label: editRequestTypeData.label.trim(),
                                      description: editRequestTypeData.description.trim() || null,
                                      icon: editRequestTypeData.icon.trim() || null,
                                      sort_order: editRequestTypeData.sort_order,
                                    });
                                    setEditingRequestType(null);
                                  }}
                                  className="w-full"
                                  disabled={updateRequestType.isPending}
                                >
                                  {updateRequestType.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!requestTypes || requestTypes.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No form types yet. Add your first form type above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Video Library Tab */}
          <TabsContent value="video-library" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Video Library ({videos?.length || 0})
              </h2>
              <Dialog open={isAddingVideo} onOpenChange={setIsAddingVideo}>
                <DialogTrigger asChild>
                  <Button variant="neon">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Video</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        placeholder="Video title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newVideo.description}
                        onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                        placeholder="Brief description of the video"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Video URL (YouTube, Loom, etc.) *</Label>
                      <Input
                        value={newVideo.url}
                        onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=... or https://www.loom.com/share/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube, Loom, Vimeo, or other video URL
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Thumbnail (optional)</Label>
                      <div className="space-y-3">
                        {/* Upload option */}
                        <div className="flex items-center gap-3">
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error("Thumbnail must be less than 5MB");
                                  return;
                                }
                                setSelectedThumbnail(file);
                                setNewVideo({ ...newVideo, thumbnailUrl: "" });
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="flex-shrink-0"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </Button>
                          {selectedThumbnail && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="truncate max-w-[150px]">{selectedThumbnail.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setSelectedThumbnail(null);
                                  if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {/* Or URL option */}
                        {!selectedThumbnail && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs text-muted-foreground">or paste URL</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            <Input
                              value={newVideo.thumbnailUrl}
                              onChange={(e) => setNewVideo({ ...newVideo, thumbnailUrl: e.target.value })}
                              placeholder="https://example.com/thumbnail.jpg"
                            />
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to auto-generate from YouTube/Loom
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <Select
                        value={newVideo.visibility}
                        onValueChange={(v: "admin" | "manager" | "employee") =>
                          setNewVideo({ ...newVideo, visibility: v })
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
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingVideo(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="neon"
                        onClick={async () => {
                          if (!newVideo.title.trim() || !newVideo.url.trim()) {
                            toast.error("Title and URL are required");
                            return;
                          }
                          
                          let thumbnailPath: string | null = newVideo.thumbnailUrl.trim() || null;
                          
                          // Upload thumbnail if file selected
                          if (selectedThumbnail) {
                            setIsUploadingThumbnail(true);
                            try {
                              const fileExt = selectedThumbnail.name.split(".").pop();
                              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                              
                              const { error: uploadError } = await supabase.storage
                                .from("video-thumbnails")
                                .upload(fileName, selectedThumbnail);
                              
                              if (uploadError) {
                                toast.error("Failed to upload thumbnail: " + uploadError.message);
                                setIsUploadingThumbnail(false);
                                return;
                              }
                              
                              const { data: urlData } = supabase.storage
                                .from("video-thumbnails")
                                .getPublicUrl(fileName);
                              
                              thumbnailPath = urlData.publicUrl;
                            } catch (error) {
                              toast.error("Failed to upload thumbnail");
                              setIsUploadingThumbnail(false);
                              return;
                            }
                            setIsUploadingThumbnail(false);
                          }
                          
                          await createResource.mutateAsync({
                            title: newVideo.title.trim(),
                            description: newVideo.description.trim() || null,
                            body: null,
                            category_id: VIDEO_LIBRARY_CATEGORY_ID,
                            url: newVideo.url.trim(),
                            tags: [],
                            version: "v1.0",
                            visibility: newVideo.visibility,
                            owner_id: null,
                            file_path: thumbnailPath,
                            effective_date: null,
                          });
                          queryClient.invalidateQueries({ queryKey: ["video-library-resources"] });
                          setNewVideo({ title: "", description: "", url: "", thumbnailUrl: "", visibility: "employee" });
                          setSelectedThumbnail(null);
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
                          setIsAddingVideo(false);
                        }}
                        disabled={createResource.isPending || isUploadingThumbnail}
                      >
                        {(createResource.isPending || isUploadingThumbnail) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isUploadingThumbnail ? "Uploading..." : "Creating..."}
                          </>
                        ) : (
                          "Add Video"
                        )}
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
                      Video
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Visibility
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
                  {videos?.map((video, index) => (
                    <tr
                      key={video.id}
                      className={
                        index < (videos?.length || 0) - 1
                          ? "border-b border-border/30"
                          : ""
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const thumbUrl = video.url ? getThumbnailUrl(video.url, video.file_path) : null;
                            return thumbUrl ? (
                              <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                <img
                                  src={thumbUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-primary/10"><svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Play className="w-4 h-4 text-primary" />
                              </div>
                            );
                          })()}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{video.title}</p>
                            {video.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary" className="capitalize">
                          {video.visibility === "employee" ? "All" : video.visibility}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {video.view_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => video.url && window.open(video.url, "_blank")}
                            title="Watch video"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Dialog
                            open={editingVideo?.id === video.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingVideo(video);
                                setEditVideoData({
                                  title: video.title,
                                  description: video.description || "",
                                  url: video.url || "",
                                  thumbnailUrl: video.file_path || "",
                                  visibility: video.visibility,
                                });
                              } else {
                                setEditingVideo(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Edit Video</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Title *</Label>
                                  <Input
                                    value={editVideoData.title}
                                    onChange={(e) => setEditVideoData({ ...editVideoData, title: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editVideoData.description}
                                    onChange={(e) => setEditVideoData({ ...editVideoData, description: e.target.value })}
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Video URL *</Label>
                                  <Input
                                    value={editVideoData.url}
                                    onChange={(e) => setEditVideoData({ ...editVideoData, url: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Custom Thumbnail (optional)</Label>
                                  <div className="space-y-3">
                                    {/* Current thumbnail preview */}
                                    {(editVideoData.thumbnailUrl || editSelectedThumbnail) && (
                                      <div className="flex items-center gap-3">
                                        <div className="w-20 h-12 rounded-lg overflow-hidden bg-secondary">
                                          <img
                                            src={editSelectedThumbnail ? URL.createObjectURL(editSelectedThumbnail) : editVideoData.thumbnailUrl}
                                            alt="Thumbnail preview"
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditVideoData({ ...editVideoData, thumbnailUrl: "" });
                                            setEditSelectedThumbnail(null);
                                            if (editThumbnailInputRef.current) editThumbnailInputRef.current.value = "";
                                          }}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                    {/* Upload option */}
                                    <div className="flex items-center gap-3">
                                      <input
                                        ref={editThumbnailInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                              toast.error("Thumbnail must be less than 5MB");
                                              return;
                                            }
                                            setEditSelectedThumbnail(file);
                                            setEditVideoData({ ...editVideoData, thumbnailUrl: "" });
                                          }
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => editThumbnailInputRef.current?.click()}
                                        className="flex-shrink-0"
                                      >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload New Image
                                      </Button>
                                      {editSelectedThumbnail && (
                                        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                                          {editSelectedThumbnail.name}
                                        </span>
                                      )}
                                    </div>
                                    {/* Or URL option */}
                                    {!editSelectedThumbnail && (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-px bg-border" />
                                          <span className="text-xs text-muted-foreground">or paste URL</span>
                                          <div className="flex-1 h-px bg-border" />
                                        </div>
                                        <Input
                                          value={editVideoData.thumbnailUrl}
                                          onChange={(e) => setEditVideoData({ ...editVideoData, thumbnailUrl: e.target.value })}
                                          placeholder="https://example.com/thumbnail.jpg"
                                        />
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Leave empty to auto-generate from YouTube/Loom
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Visibility</Label>
                                  <Select
                                    value={editVideoData.visibility}
                                    onValueChange={(v: "admin" | "manager" | "employee") =>
                                      setEditVideoData({ ...editVideoData, visibility: v })
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
                                <Button
                                  onClick={async () => {
                                    if (!editVideoData.title.trim() || !editVideoData.url.trim()) {
                                      toast.error("Title and URL are required");
                                      return;
                                    }
                                    
                                    let thumbnailPath: string | null = editVideoData.thumbnailUrl.trim() || null;
                                    
                                    // Upload new thumbnail if file selected
                                    if (editSelectedThumbnail) {
                                      setIsUploadingThumbnail(true);
                                      try {
                                        const fileExt = editSelectedThumbnail.name.split(".").pop();
                                        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                                        
                                        const { error: uploadError } = await supabase.storage
                                          .from("video-thumbnails")
                                          .upload(fileName, editSelectedThumbnail);
                                        
                                        if (uploadError) {
                                          toast.error("Failed to upload thumbnail: " + uploadError.message);
                                          setIsUploadingThumbnail(false);
                                          return;
                                        }
                                        
                                        const { data: urlData } = supabase.storage
                                          .from("video-thumbnails")
                                          .getPublicUrl(fileName);
                                        
                                        thumbnailPath = urlData.publicUrl;
                                      } catch (error) {
                                        toast.error("Failed to upload thumbnail");
                                        setIsUploadingThumbnail(false);
                                        return;
                                      }
                                      setIsUploadingThumbnail(false);
                                    }
                                    
                                    await updateResource.mutateAsync({
                                      id: video.id,
                                      title: editVideoData.title.trim(),
                                      description: editVideoData.description.trim() || null,
                                      url: editVideoData.url.trim(),
                                      file_path: thumbnailPath,
                                      visibility: editVideoData.visibility,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["video-library-resources"] });
                                    setEditSelectedThumbnail(null);
                                    if (editThumbnailInputRef.current) editThumbnailInputRef.current.value = "";
                                    setEditingVideo(null);
                                  }}
                                  className="w-full"
                                  disabled={updateResource.isPending || isUploadingThumbnail}
                                >
                                  {(updateResource.isPending || isUploadingThumbnail) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      {isUploadingThumbnail ? "Uploading..." : "Saving..."}
                                    </>
                                  ) : (
                                    "Save Changes"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this video?")) {
                                await deleteResource.mutateAsync(video.id);
                                queryClient.invalidateQueries({ queryKey: ["video-library-resources"] });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!videos || videos.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Video className="w-10 h-10 text-muted-foreground/50" />
                          <p>No videos yet. Add your first training video above.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="email-templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Email Templates
              </h2>
            </div>
            <EmailTemplateEditor />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettingsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
