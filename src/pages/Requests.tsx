import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  FileEdit,
  Monitor,
  Users,
  CheckCircle,
  Clock,
  CheckSquare,
  XSquare,
  Eye,
  Loader2,
  Upload,
  File,
  X,
  HelpCircle,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { useRequestTypes, type RequestType } from "@/hooks/useRequestTypes";
import { NewHireForm } from "@/components/training/NewHireForm";

// Icon map for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileEdit,
  Monitor,
  Users,
  Clock,
  HelpCircle,
  Send,
  File,
  UserPlus,
};

const getIcon = (iconName: string | null) => {
  if (!iconName) return HelpCircle;
  return iconMap[iconName] || HelpCircle;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  approved: "bg-green-500/10 text-green-500 border-green-500/30",
  completed: "bg-green-500/10 text-green-500 border-green-500/30",
  rejected: "bg-red-500/10 text-red-500 border-red-500/30",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  approved: "Approved",
  completed: "Completed",
  rejected: "Rejected",
  closed: "Closed",
};

// Request types that use support-style workflow (In Progress → Completed)
const supportRequestTypes = ["hr", "it_access"];

interface Request {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  submitted_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  file_path: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function Requests() {
  const { user, isManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: requestTypes = [] } = useRequestTypes();
  const [type, setType] = useState("");
  const [hrSubType, setHrSubType] = useState<"simple" | "new-hire" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Fetch user's own requests (excluding commission type)
  const { data: myRequests, refetch } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("submitted_by", user.id)
        .neq("type", "commission")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Request[];
    },
    enabled: !!user,
  });

  // Fetch all requests for managers/admins (excluding commission type)
  const { data: allRequests, refetch: refetchAll } = useQuery({
    queryKey: ["all-requests", user?.id, isManager, isAdmin],
    queryFn: async () => {
      const { data: requestsData, error } = await supabase
        .from("requests")
        .select("*")
        .neq("type", "commission")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Get unique submitter IDs
      const submitterIds = [...new Set(requestsData.map(r => r.submitted_by))];
      
      // Fetch profiles for all users
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", submitterIds);
      
      // Create a map of profiles by ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      // Merge profiles with requests
      return requestsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.submitted_by) || null,
      })) as Request[];
    },
    enabled: isManager,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !type || !title.trim()) return;

    setIsSubmitting(true);
    try {
      let filePath: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("request-attachments")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      const { error } = await supabase.from("requests").insert({
        type,
        title: title.trim(),
        description: description.trim() || null,
        submitted_by: user.id,
        file_path: filePath,
      });

      if (error) throw error;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send email notification
      try {
        await supabase.functions.invoke("send-request-notification", {
          body: {
            type,
            title: title.trim(),
            description: description.trim() || null,
            submitter_name: profile?.full_name || user.email || "Unknown",
            submitter_email: user.email || "",
            has_attachment: !!filePath,
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      toast.success("Request submitted successfully!");
      setSubmitted(true);
      setType("");
      setTitle("");
      setDescription("");
      clearSelectedFile();
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle request status updates
  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Request ${newStatus === "completed" ? "completed" : "updated"}`);
      refetchAll();
      refetch();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadAttachment = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("request-attachments")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filePath.split("/").pop() || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download attachment");
    }
  };

  // Get pending requests for manager review
  const getMyPendingRequests = () => {
    if (!allRequests) return [];
    return allRequests.filter(r => r.status === 'pending');
  };

  const pendingRequests = getMyPendingRequests();
  const pendingCount = pendingRequests.length;

  // Check if user can submit new hire (only managers/admins)
  const canSubmitNewHire = isManager || isAdmin;
  const isNewHireFlow = type === "hr" && hrSubType === "new-hire" && canSubmitNewHire;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Forms & Requests</h1>
              <p className="text-muted-foreground text-sm">
                Submit SOP updates, IT requests, and HR inquiries
              </p>
            </div>
          </div>
        </header>

        {isManager ? (
          <Tabs defaultValue="submit" className="space-y-6">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="submit" className="gap-2">
                <Send className="w-4 h-4" />
                Submit
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Review
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="space-y-6">
              <SubmitRequestForm
                type={type}
                setType={(v) => { setType(v); setHrSubType(null); }}
                hrSubType={hrSubType}
                setHrSubType={setHrSubType}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                isSubmitting={isSubmitting}
                submitted={submitted}
                handleSubmit={handleSubmit}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onClearFile={clearSelectedFile}
                fileInputRef={fileInputRef}
                requestTypes={requestTypes}
                isManager={isManager}
                isAdmin={isAdmin}
              />
              <MyRequestsList requests={myRequests || []} isSubmitter />
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isAdmin ? "Pending Requests" : "Requests Needing Your Review"} ({pendingCount})
              </h2>
              <RequestsTable
                requests={pendingRequests}
                onView={setSelectedRequest}
                showSubmitter
              />
              
              <h2 className="text-lg font-semibold text-foreground mt-8">
                Recently Processed
              </h2>
              <RequestsTable
                requests={allRequests?.filter(r => r.status !== 'pending').slice(0, 10) || []}
                onView={setSelectedRequest}
                showSubmitter
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <SubmitRequestForm
              type={type}
              setType={(v) => { setType(v); setHrSubType(null); }}
              hrSubType={hrSubType}
              setHrSubType={setHrSubType}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              isSubmitting={isSubmitting}
              submitted={submitted}
              handleSubmit={handleSubmit}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onClearFile={clearSelectedFile}
              fileInputRef={fileInputRef}
              requestTypes={requestTypes}
              isManager={isManager}
              isAdmin={isAdmin}
            />
            <MyRequestsList requests={myRequests || []} isSubmitter />
          </div>
        )}

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest.type.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className={statusColors[selectedRequest.status]}>
                    {statusLabels[selectedRequest.status] || selectedRequest.status}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{selectedRequest.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRequest.description || "No description provided"}
                  </p>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted by:</span>
                    <span className="text-foreground">
                      {selectedRequest.profiles?.full_name || selectedRequest.profiles?.email || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="text-foreground">
                      {format(new Date(selectedRequest.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </div>

                {/* Attachment */}
                {selectedRequest.file_path && (
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-muted-foreground" />
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => downloadAttachment(selectedRequest.file_path!)}
                    >
                      Download Attachment
                    </Button>
                  </div>
                )}

                {/* Actions for managers/admins */}
                {isManager && selectedRequest.status === "pending" && (
                  <DialogFooter className="gap-2 pt-4">
                    {supportRequestTypes.includes(selectedRequest.type) ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate(selectedRequest.id, "in_progress")}
                          disabled={isUpdating}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Mark In Progress
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(selectedRequest.id, "completed")}
                          disabled={isUpdating}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleStatusUpdate(selectedRequest.id, "rejected")}
                          disabled={isUpdating}
                        >
                          <XSquare className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(selectedRequest.id, "approved")}
                          disabled={isUpdating}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                )}

                {/* Action for in-progress requests */}
                {isManager && selectedRequest.status === "in_progress" && (
                  <DialogFooter className="pt-4">
                    <Button
                      onClick={() => handleStatusUpdate(selectedRequest.id, "completed")}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </DialogFooter>
                )}

                {/* Action for approved requests - mark as completed to close out */}
                {isManager && selectedRequest.status === "approved" && (
                  <DialogFooter className="pt-4">
                    <Button
                      onClick={() => handleStatusUpdate(selectedRequest.id, "completed")}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Submit Request Form Component
function SubmitRequestForm({
  type,
  setType,
  hrSubType,
  setHrSubType,
  title,
  setTitle,
  description,
  setDescription,
  isSubmitting,
  submitted,
  handleSubmit,
  selectedFile,
  onFileSelect,
  onClearFile,
  fileInputRef,
  requestTypes,
  isManager,
  isAdmin,
}: {
  type: string;
  setType: (type: string) => void;
  hrSubType: "simple" | "new-hire" | null;
  setHrSubType: (type: "simple" | "new-hire" | null) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  isSubmitting: boolean;
  submitted: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  requestTypes: RequestType[];
  isManager: boolean;
  isAdmin: boolean;
}) {
  const canSubmitNewHire = isManager || isAdmin;
  const isNewHireFlow = type === "hr" && hrSubType === "new-hire" && canSubmitNewHire;

  // Filter out commission type from request types
  const filteredRequestTypes = requestTypes.filter(rt => rt.value !== "commission" && rt.is_active);

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-foreground">
        <Send className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Submit a Request</h2>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-500 font-medium">Request submitted successfully!</span>
        </div>
      )}

      {/* Request Type Selection */}
      <div className="space-y-2">
        <Label>Request Type</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {filteredRequestTypes.map((rt) => {
            const IconComponent = getIcon(rt.icon);
            return (
              <button
                key={rt.id}
                type="button"
                onClick={() => setType(rt.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  type === rt.value
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50 bg-secondary/30"
                }`}
              >
                <IconComponent className={`w-5 h-5 mb-2 ${type === rt.value ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-foreground text-sm">{rt.label}</p>
                {rt.description && (
                  <p className="text-xs text-muted-foreground mt-1">{rt.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* HR Sub-type Selection */}
      {type === "hr" && (
        <div className="space-y-3">
          <Label>What type of HR request?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHrSubType("simple")}
              className={`p-4 rounded-lg border text-left transition-all ${
                hrSubType === "simple"
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-primary/50 bg-secondary/30"
              }`}
            >
              <HelpCircle className={`w-5 h-5 mb-2 ${hrSubType === "simple" ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-medium text-foreground text-sm">General HR Request</p>
              <p className="text-xs text-muted-foreground mt-1">Questions, PTO, payroll, benefits, etc.</p>
            </button>
            {canSubmitNewHire && (
              <button
                type="button"
                onClick={() => setHrSubType("new-hire")}
                className={`p-4 rounded-lg border text-left transition-all ${
                  hrSubType === "new-hire"
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50 bg-secondary/30"
                }`}
              >
                <UserPlus className={`w-5 h-5 mb-2 ${hrSubType === "new-hire" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-foreground text-sm">New Hire Onboarding</p>
                <p className="text-xs text-muted-foreground mt-1">Submit a new hire for onboarding</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* New Hire flow renders its own form */}
      {isNewHireFlow ? (
        <NewHireForm
          onSuccess={() => {
            setType("");
            setHrSubType(null);
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Regular form fields */}
          {(type !== "hr" || hrSubType === "simple" || (!canSubmitNewHire && type === "hr")) && type && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Subject</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your request"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Attachment (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={onFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <File className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearFile}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full justify-start gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, Word, Excel, Images (max 20MB)
                </p>
              </div>

              <Button 
                type="submit" 
                variant="neon" 
                disabled={!type || !title.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

// My Requests List Component
function MyRequestsList({ requests, isSubmitter }: { requests: Request[]; isSubmitter?: boolean }) {
  if (!requests.length) return null;

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-foreground">My Recent Requests</h2>
      <div className="space-y-3">
        {requests.slice(0, 5).map((request) => (
          <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="outline" className="capitalize shrink-0">
                {request.type.replace("_", " ")}
              </Badge>
              <span className="text-sm text-foreground truncate">{request.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={statusColors[request.status]}>
                {statusLabels[request.status] || request.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Requests Table Component
function RequestsTable({ 
  requests, 
  onView, 
  showSubmitter 
}: { 
  requests: Request[]; 
  onView: (request: Request) => void; 
  showSubmitter?: boolean;
}) {
  if (!requests.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No requests found.
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-secondary/50">
          <tr>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground">Title</th>
            {showSubmitter && <th className="text-left p-3 text-sm font-medium text-muted-foreground">Submitted By</th>}
            <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
            <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
            <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-secondary/30">
              <td className="p-3">
                <Badge variant="outline" className="capitalize">
                  {request.type.replace("_", " ")}
                </Badge>
              </td>
              <td className="p-3 text-sm text-foreground">{request.title}</td>
              {showSubmitter && (
                <td className="p-3 text-sm text-muted-foreground">
                  {request.profiles?.full_name || request.profiles?.email || "Unknown"}
                </td>
              )}
              <td className="p-3">
                <Badge variant="outline" className={statusColors[request.status]}>
                  {statusLabels[request.status] || request.status}
                </Badge>
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </td>
              <td className="p-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => onView(request)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
