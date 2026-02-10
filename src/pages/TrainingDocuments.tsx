import { useState, useMemo, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTrainingDocuments,
  useTrainingDocumentCategories,
  useUploadTrainingDocument,
  useUpdateTrainingDocument,
  useDeleteTrainingDocument,
  useCreateTrainingCategory,
  useDeleteTrainingCategory,
  useDownloadTrainingDocument,
  TrainingDocument,
} from "@/hooks/useTrainingDocuments";
import {
  FileText,
  Upload,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FolderPlus,
  Image,
  FileSpreadsheet,
  File,
  Presentation,
  Plus,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="w-8 h-8 text-muted-foreground" />;
  if (fileType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="w-8 h-8 text-blue-500" />;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv")) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-8 h-8 text-amber-500" />;
  if (fileType.includes("image")) return <Image className="w-8 h-8 text-purple-500" />;
  return <File className="w-8 h-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrainingDocuments() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<TrainingDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<TrainingDocument | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const { data: categories = [], isLoading: catsLoading } = useTrainingDocumentCategories();
  const { data: documents = [], isLoading: docsLoading } = useTrainingDocuments(activeCategory);
  const uploadMutation = useUploadTrainingDocument();
  const updateMutation = useUpdateTrainingDocument();
  const deleteMutation = useDeleteTrainingDocument();
  const createCategory = useCreateTrainingCategory();
  const deleteCategory = useDeleteTrainingCategory();
  const downloadDoc = useDownloadTrainingDocument();

  // Document counts per category
  const { data: allDocs = [] } = useTrainingDocuments();
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allDocs.forEach(d => {
      if (d.category_id) counts[d.category_id] = (counts[d.category_id] || 0) + 1;
    });
    return counts;
  }, [allDocs]);

  // Filter by search
  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.category?.name.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setUploadFiles(arr);
    if (arr.length === 1 && !uploadName) {
      setUploadName(arr[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, [uploadName]);

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !uploadCategoryId) {
      toast.error("Please select a file and category");
      return;
    }

    setUploadProgress(0);
    const total = uploadFiles.length;
    for (let i = 0; i < total; i++) {
      const file = uploadFiles[i];
      const docName = total === 1 ? (uploadName || file.name) : file.name.replace(/\.[^/.]+$/, "");
      await uploadMutation.mutateAsync({
        file,
        name: docName,
        description: uploadDesc,
        categoryId: uploadCategoryId,
      });
      setUploadProgress(((i + 1) / total) * 100);
    }

    setUploadOpen(false);
    setUploadFiles([]);
    setUploadName("");
    setUploadDesc("");
    setUploadCategoryId("");
    setUploadProgress(0);
  };

  const handleEdit = (doc: TrainingDocument) => {
    setEditDoc(doc);
    setEditName(doc.name);
    setEditDesc(doc.description || "");
    setEditCategoryId(doc.category_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    await updateMutation.mutateAsync({
      id: editDoc.id,
      name: editName,
      description: editDesc,
      categoryId: editCategoryId,
    });
    setEditDoc(null);
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    await deleteMutation.mutateAsync({ id: deleteDoc.id, filePath: deleteDoc.file_path });
    setDeleteDoc(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createCategory.mutateAsync({ name: newCategoryName.trim() });
    setNewCategoryName("");
    setNewCategoryOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    await deleteCategory.mutateAsync(deleteCategoryId);
    setDeleteCategoryId(null);
    if (activeCategory === deleteCategoryId) setActiveCategory("all");
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Training Documents</h1>
                <p className="text-muted-foreground text-sm">Browse and download training materials</p>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setNewCategoryOpen(true)} className="gap-2">
                  <FolderPlus className="w-4 h-4" /> New Category
                </Button>
                <Button onClick={() => setUploadOpen(true)} className="gap-2">
                  <Upload className="w-4 h-4" /> Upload Document
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("all")}
            className="rounded-full"
          >
            All <Badge variant="secondary" className="ml-1.5 text-xs">{allDocs.length}</Badge>
          </Button>
          {categories.map(cat => (
            <div key={cat.id} className="relative group">
              <Button
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className="rounded-full"
              >
                {cat.name}
                <Badge variant="secondary" className="ml-1.5 text-xs">{categoryCounts[cat.id] || 0}</Badge>
              </Button>
              {canManage && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteCategoryId(cat.id); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl bg-card/60 border-border/40 h-12"
          />
        </div>

        {/* Documents Grid */}
        {docsLoading || catsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Upload documents to get started"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <Card key={doc.id} className="group hover:border-primary/30 transition-all cursor-pointer" onClick={() => downloadDoc(doc.file_path, doc.file_name)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {doc.name}
                        </h3>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {doc.category && (
                            <Badge variant="outline" className="text-xs">{doc.category.name}</Badge>
                          )}
                          {doc.file_size && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span>{doc.uploader_name}</span>
                          <span>•</span>
                          <span>{format(parseISO(doc.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleEdit(doc); }}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); downloadDoc(doc.file_path, doc.file_name); }}>
                            <Download className="w-4 h-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteDoc(doc); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFilesSelected(e.dataTransfer.files); }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {uploadFiles.length > 0
                  ? `${uploadFiles.length} file(s) selected`
                  : "Drag & drop files or click to browse"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.txt,.doc,.xls"
                className="hidden"
                onChange={e => handleFilesSelected(e.target.files)}
              />
            </div>

            <div>
              <Label>Document Name</Label>
              <Input
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                placeholder="Auto-filled from file name"
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={uploadCategoryId} onValueChange={setUploadCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={uploadDesc}
                onChange={e => setUploadDesc(e.target.value)}
                placeholder="Brief summary of the document"
                rows={2}
              />
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="h-2" />
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || !uploadCategoryId || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDoc} onOpenChange={open => !open && setEditDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={open => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDoc?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Category Dialog */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Safety Training" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateCategory} disabled={createCategory.isPending || !newCategoryName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={open => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Documents in this category won't be deleted but will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
