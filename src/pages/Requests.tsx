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
} from "@/components/ui/dialog";
import {
  Send,
  FileEdit,
  Monitor,
  Users,
  CheckCircle,
  DollarSign,
  Clock,
  CheckSquare,
  XSquare,
  Eye,
  Loader2,
  Upload,
  File,
  X,
  Download,
  Info,
  Calendar,
  HelpCircle,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useRequestTypes, type RequestType } from "@/hooks/useRequestTypes";
import { NewHireForm } from "@/components/training/NewHireForm";

// Icon map for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  FileEdit,
  Monitor,
  Users,
  Clock,
  Calendar,
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

  // Fetch user's own requests
  const { data: myRequests, refetch } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Request[];
    },
    enabled: !!user,
  });

  // Fetch all requests for managers/admins
  const { data: allRequests, refetch: refetchAll } = useQuery({
    queryKey: ["all-requests"],
    queryFn: async () => {
      // First fetch all requests
      const { data: requestsData, error } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Get unique submitter IDs
      const submitterIds = [...new Set(requestsData.map(r => r.submitted_by))];
      
      // Fetch profiles for those submitters
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
        // Don't fail the submission if email fails
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

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ 
          status: newStatus,
          assigned_to: user?.id 
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Request ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'}!`);
      refetchAll();
      refetch();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  const pendingCount = allRequests?.filter(r => r.status === 'pending').length || 0;
  const commissionRequests = allRequests?.filter(r => r.type === 'commission') || [];

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
                Submit commission forms and other requests
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
              <TabsTrigger value="commissions" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Commissions
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
              <MyRequestsList requests={myRequests || []} />
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                All Pending Requests ({pendingCount})
              </h2>
              <RequestsTable
                requests={allRequests?.filter(r => r.status === 'pending') || []}
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

            <TabsContent value="commissions" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Commission Forms ({commissionRequests.length})
              </h2>
              <RequestsTable
                requests={commissionRequests}
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
            <MyRequestsList requests={myRequests || []} />
          </div>
        )}

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
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

                {/* Attached File */}
                {selectedRequest.file_path && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Attached Document:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from("request-attachments")
                          .createSignedUrl(selectedRequest.file_path!, 60);
                        if (data?.signedUrl) {
                          window.open(data.signedUrl, "_blank");
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </Button>
                  </div>
                )}

                {isManager && selectedRequest.status === 'pending' && (
                  <div className="space-y-3 pt-4">
                    {supportRequestTypes.includes(selectedRequest.type) ? (
                      <>
                        {/* IT/HR Support workflow */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4 mr-2" />
                            )}
                            Mark In Progress
                          </Button>
                          <Button
                            variant="neon"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Mark Completed
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground"
                          onClick={() => handleUpdateStatus(selectedRequest.id, 'closed')}
                          disabled={isUpdating}
                        >
                          <XSquare className="w-4 h-4 mr-2" />
                          Close Request
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Standard Approve/Reject workflow */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XSquare className="w-4 h-4 mr-2" />
                            )}
                            Reject
                          </Button>
                          <Button
                            variant="neon"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckSquare className="w-4 h-4 mr-2" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Show additional actions for in_progress requests */}
                {isManager && selectedRequest.status === 'in_progress' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="neon"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Mark Completed
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'closed')}
                      disabled={isUpdating}
                    >
                      <XSquare className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  </div>
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
  setType: (v: string) => void;
  hrSubType: "simple" | "new-hire" | null;
  setHrSubType: (v: "simple" | "new-hire" | null) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
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
  const isNewHireFlow = type === "hr" && canSubmitNewHire && hrSubType === "new-hire";

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Submit a Request</h2>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Request Submitted!</h3>
          <p className="text-muted-foreground">We'll get back to you soon.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Request type selection */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {requestTypes.map((reqType) => {
              const IconComponent = getIcon(reqType.icon);
              return (
                <button
                  key={reqType.value}
                  type="button"
                  onClick={() => setType(reqType.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    type === reqType.value
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card/50 hover:border-border"
                  }`}
                >
                  <IconComponent
                    className={`w-5 h-5 mb-2 ${
                      type === reqType.value ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-foreground text-sm">{reqType.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{reqType.description}</p>
                </button>
              );
            })}
          </div>

          {/* HR Request - Sub-type selection (only for admins/managers) */}
          {type === "hr" && canSubmitNewHire && (
            <div className="border-t border-border/50 pt-6 -mx-6 px-6 space-y-4">
              <p className="text-sm font-medium text-foreground">Select HR request type:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setHrSubType("simple")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    hrSubType === "simple"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card/50 hover:border-border"
                  }`}
                >
                  <FileText
                    className={`w-5 h-5 mb-2 ${
                      hrSubType === "simple" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-foreground text-sm">General HR Request</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit a general HR inquiry or request
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setHrSubType("new-hire")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    hrSubType === "new-hire"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card/50 hover:border-border"
                  }`}
                >
                  <UserPlus
                    className={`w-5 h-5 mb-2 ${
                      hrSubType === "new-hire" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-foreground text-sm">New Hire Request</p>
                  <p className="text-xs text-muted-foreground mt-1">Submit a new hire for onboarding</p>
                </button>
              </div>
            </div>
          )}

          {/* New Hire flow renders its own form (no nested forms) */}
          {isNewHireFlow ? (
            <NewHireForm
              onSuccess={() => {
                setType("");
                setHrSubType(null);
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Commission Form Instructions */}
              {type === "commission" && (
                <div className="space-y-4">
                  <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm text-foreground/80">
                      <strong>Commission Submission Process:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Review the Commission Submission Instructions document</li>
                        <li>Download and complete the Commission Form (Excel)</li>
                        <li>Verify all eligibility requirements are met</li>
                        <li>Upload the completed form and submit for manager approval</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                      <a href="/documents/TSM_Commission_Instructions_2026.docx" download>
                        <FileText className="w-4 h-4" />
                        Download Instructions (Word)
                      </a>
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                      <a
                        href="https://www.dropbox.com/scl/fi/fiufmou5h804bsvm6226t/2026_commission_splits_1-version-1-.xlsb.xlsx?rlkey=8svj22saqtipmvljq8tfgeisa&st=yavb6f4s&dl=1"
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Download Commission Form (Excel)
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Regular form fields - shown for non-HR types, or for simple HR requests (employees auto-get simple) */}
              {(type !== "hr" || hrSubType === "simple" || (!canSubmitNewHire && type === "hr")) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {type === "commission" ? "Job/Sale Reference" : "Subject"}
                    </Label>
                    <Input
                      id="title"
                      placeholder={
                        type === "commission"
                          ? "Enter job number or customer name"
                          : "Brief summary of your request"
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {type === "commission" ? "Commission Details" : "Description (optional)"}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={
                        type === "commission"
                          ? "Enter commission amount, job details, and any relevant notes for your manager..."
                          : "Provide additional details..."
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>
                      {type === "commission" ? "Commission Form Document" : "Attachment (optional)"}
                    </Label>
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
                        {type === "commission" ? "Upload Commission Form" : "Choose File"}
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, Word, Excel, Images (max 20MB)
                    </p>
                  </div>

                  <Button type="submit" variant="neon" disabled={!type || !title.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : type === "commission" ? (
                      "Submit for Approval"
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}


// My Requests List Component
function MyRequestsList({ requests }: { requests: Request[] }) {
  if (!requests || requests.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">My Requests</h2>
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="p-4 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {request.type === 'commission' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{request.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {request.description || "No description provided"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={statusColors[request.status]}>
                {statusLabels[request.status] || request.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
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
  showSubmitter = false,
}: {
  requests: Request[];
  onView: (r: Request) => void;
  showSubmitter?: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
        No requests found
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Title
            </th>
            {showSubmitter && (
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                Submitted By
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request, index) => (
            <tr
              key={request.id}
              className={
                index < requests.length - 1 ? "border-b border-border/30" : ""
              }
            >
              <td className="px-4 py-3">
                <Badge variant="secondary" className="capitalize">
                  {request.type === 'commission' ? (
                    <DollarSign className="w-3 h-3 mr-1" />
                  ) : null}
                  {request.type.replace("_", " ")}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground truncate max-w-[200px]">
                  {request.title}
                </p>
              </td>
              {showSubmitter && (
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {request.profiles?.full_name || request.profiles?.email || "Unknown"}
                </td>
              )}
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={statusColors[request.status]}>
                  {statusLabels[request.status] || request.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(request)}
                >
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
