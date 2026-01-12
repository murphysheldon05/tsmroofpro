import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CommissionReportDashboard } from "@/components/reports/CommissionReportDashboard";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  CalendarDays,
  Package,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
  pending_manager: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  manager_approved: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  payment_pending: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  approved: "bg-green-500/10 text-green-500 border-green-500/30",
  completed: "bg-green-500/10 text-green-500 border-green-500/30",
  rejected: "bg-red-500/10 text-red-500 border-red-500/30",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  pending_manager: "Pending Manager Review",
  manager_approved: "Payment Approved & Requested",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  approved: "Approved",
  completed: "Completed",
  rejected: "Rejected - Revisions Requested",
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
  approval_stage: string | null;
  assigned_manager_id: string | null;
  manager_approved_at: string | null;
  manager_notes: string | null;
  total_payout_requested: number | null;
  approved_amount: number | null;
  rejection_reason: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  manager_profile?: {
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
  const [totalPayoutRequested, setTotalPayoutRequested] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all managers for commission form selection
  const { data: managers = [] } = useQuery({
    queryKey: ["managers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager");
      
      if (error) throw error;
      
      const managerIds = data.map(r => r.user_id);
      
      if (managerIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", managerIds)
        .order("full_name");
      
      if (profilesError) throw profilesError;
      return profiles || [];
    },
  });
  
  // Rejection dialog state
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingRejection, setPendingRejection] = useState<{ requestId: string; isManagerReject: boolean } | null>(null);
  
  // Approval dialog state with amount
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [pendingApproval, setPendingApproval] = useState<{ requestId: string; isManagerApproval: boolean } | null>(null);
  
  // Bulk download state
  const [showBulkDownloadDialog, setShowBulkDownloadDialog] = useState(false);
  const [bulkDownloadStartDate, setBulkDownloadStartDate] = useState<Date | undefined>(undefined);
  const [bulkDownloadEndDate, setBulkDownloadEndDate] = useState<Date | undefined>(undefined);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  
  // Bulk upload state
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

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

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeBulkFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
    queryKey: ["all-requests", user?.id, isManager, isAdmin],
    queryFn: async () => {
      // First fetch all requests
      const { data: requestsData, error } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Get unique submitter IDs and manager IDs
      const submitterIds = [...new Set(requestsData.map(r => r.submitted_by))];
      const managerIds = [...new Set(requestsData.map(r => r.assigned_manager_id).filter(Boolean))] as string[];
      const allUserIds = [...new Set([...submitterIds, ...managerIds])];
      
      // Fetch profiles for all users
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", allUserIds);
      
      // Create a map of profiles by ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      // Merge profiles with requests
      return requestsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.submitted_by) || null,
        manager_profile: request.assigned_manager_id ? profilesMap.get(request.assigned_manager_id) : null,
      })) as Request[];
    },
    enabled: isManager,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !type || !title.trim()) return;

    // Validate total payout and manager for commission requests
    if (type === "commission") {
      if (!totalPayoutRequested) {
        toast.error("Total commission payout amount is required");
        return;
      }
      if (!selectedManagerId) {
        toast.error("Please select your Sales Manager");
        return;
      }
    }

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

      // Set up manager approval for commission requests
      let approvalStage = "pending";
      let assignedManagerId: string | null = null;
      let managerProfile: { full_name: string | null; email: string | null } | null = null;

      if (type === "commission" && selectedManagerId) {
        approvalStage = "pending_manager";
        assignedManagerId = selectedManagerId;
        
        // Get manager's profile for email notification
        const { data: manager } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", selectedManagerId)
          .single();
        
        managerProfile = manager;
      }

      const payoutAmount = type === "commission" ? parseFloat(totalPayoutRequested) : null;

      const { error } = await supabase.from("requests").insert({
        type,
        title: title.trim(),
        description: description.trim() || null,
        submitted_by: user.id,
        file_path: filePath,
        approval_stage: approvalStage,
        assigned_manager_id: assignedManagerId,
        total_payout_requested: payoutAmount,
      });

      if (error) throw error;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send email notification based on request type
      try {
        if (type === "commission" && assignedManagerId && managerProfile?.email) {
          // Send commission-specific notification to manager
          await supabase.functions.invoke("send-commission-notification", {
            body: {
              notification_type: "manager_review",
              request_id: "",
              title: title.trim(),
              submitter_name: profile?.full_name || user.email || "Unknown",
              submitter_email: user.email || "",
              manager_name: managerProfile.full_name || "Manager",
              manager_email: managerProfile.email,
              has_attachment: !!filePath,
              total_payout_requested: payoutAmount,
            },
          });
        } else {
          // Send general request notification
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
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the submission if email fails
      }

      toast.success("Request submitted successfully!");
      setSubmitted(true);
      setType("");
      setTitle("");
      setDescription("");
      setTotalPayoutRequested("");
      setSelectedManagerId("");
      clearSelectedFile();
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open approval dialog
  const openApprovalDialog = (requestId: string, isManagerApproval: boolean) => {
    const request = allRequests?.find(r => r.id === requestId);
    if (request?.total_payout_requested) {
      setApprovedAmount(request.total_payout_requested.toString());
    } else {
      setApprovedAmount("");
    }
    setApprovalNotes("");
    setPendingApproval({ requestId, isManagerApproval });
    setShowApprovalDialog(true);
  };

  // Open rejection dialog
  const openRejectionDialog = (requestId: string, isManagerReject: boolean) => {
    setRejectionReason("");
    setPendingRejection({ requestId, isManagerReject });
    setShowRejectionDialog(true);
  };

  // Handle manager approval (stage 1 for commission requests)
  const handleManagerApproval = async () => {
    if (!pendingApproval || !approvedAmount) {
      toast.error("Please enter the approved amount");
      return;
    }
    
    setIsUpdating(true);
    try {
      const { requestId } = pendingApproval;
      const request = allRequests?.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Get submitter profile
      const { data: submitterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", request.submitted_by)
        .single();

      // Get manager profile (current user)
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user!.id)
        .single();

      // Manager approved - move to admin review
      const { error } = await supabase
        .from("requests")
        .update({ 
          approval_stage: "manager_approved",
          manager_approved_at: new Date().toISOString(),
          manager_notes: approvalNotes || null,
          approved_amount: parseFloat(approvedAmount),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Send notification to accounting department
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "accounting_review",
            request_id: requestId,
            title: request.title,
            submitter_name: submitterProfile?.full_name || "Employee",
            submitter_email: submitterProfile?.email || "",
            manager_name: managerProfile?.full_name || "Manager",
            manager_notes: approvalNotes || null,
            has_attachment: !!request.file_path,
            total_payout_requested: request.total_payout_requested,
            approved_amount: parseFloat(approvedAmount),
          },
        });
      } catch (emailError) {
        console.error("Failed to send commission notification:", emailError);
      }

      toast.success("Commission approved and sent to accounting for processing!");
      refetchAll();
      refetch();
      setSelectedRequest(null);
      setShowApprovalDialog(false);
      setPendingApproval(null);
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle rejection with required reason
  const handleRejection = async () => {
    if (!pendingRejection || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    setIsUpdating(true);
    try {
      const { requestId, isManagerReject } = pendingRejection;
      const request = allRequests?.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Get submitter profile
      const { data: submitterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", request.submitted_by)
        .single();

      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "rejected",
          approval_stage: "rejected",
          manager_notes: isManagerReject ? rejectionReason : request.manager_notes,
          rejection_reason: rejectionReason,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Send rejection notification to submitter with revision request
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "rejected",
            request_id: requestId,
            title: request.title,
            submitter_name: submitterProfile?.full_name || "Employee",
            submitter_email: submitterProfile?.email || "",
            manager_notes: rejectionReason,
            has_attachment: !!request.file_path,
            rejection_reason: rejectionReason,
          },
        });
      } catch (emailError) {
        console.error("Failed to send rejection notification:", emailError);
      }

      toast.success("Commission rejected. Submitter has been notified to make revisions.");
      refetchAll();
      refetch();
      setSelectedRequest(null);
      setShowRejectionDialog(false);
      setPendingRejection(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle admin final approval (stage 2 for commission requests)
  const handleAdminApproval = async (requestId: string, approved: boolean) => {
    if (approved) {
      openApprovalDialog(requestId, false);
      return;
    }
    openRejectionDialog(requestId, false);
  };

  // Process admin approval with amount
  const processAdminApproval = async () => {
    if (!pendingApproval) return;
    
    setIsUpdating(true);
    try {
      const { requestId } = pendingApproval;
      const request = allRequests?.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Get submitter profile
      const { data: submitterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", request.submitted_by)
        .single();

      const finalAmount = approvedAmount ? parseFloat(approvedAmount) : request.approved_amount;

      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "approved",
          approval_stage: "approved",
          assigned_to: user?.id,
          approved_amount: finalAmount,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Send notification to submitter
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "approved",
            request_id: requestId,
            title: request.title,
            submitter_name: submitterProfile?.full_name || "Employee",
            submitter_email: submitterProfile?.email || "",
            has_attachment: !!request.file_path,
            approved_amount: finalAmount,
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification:", emailError);
      }

      toast.success("Commission approved!");
      refetchAll();
      refetch();
      setSelectedRequest(null);
      setShowApprovalDialog(false);
      setPendingApproval(null);
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
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

  // Bulk download attachments
  const handleBulkDownload = async () => {
    if (!bulkDownloadStartDate || !bulkDownloadEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setIsBulkDownloading(true);
    try {
      const commissionRequests = allRequests?.filter(r => 
        r.type === 'commission' && 
        r.file_path &&
        isWithinInterval(new Date(r.created_at), {
          start: startOfDay(bulkDownloadStartDate),
          end: endOfDay(bulkDownloadEndDate)
        })
      ) || [];

      if (commissionRequests.length === 0) {
        toast.error("No commission attachments found in the selected date range");
        return;
      }

      // Download each file
      for (const request of commissionRequests) {
        if (request.file_path) {
          const { data } = await supabase.storage
            .from("request-attachments")
            .createSignedUrl(request.file_path, 60);
          if (data?.signedUrl) {
            // Create a temporary link to download
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = `${request.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(request.created_at), 'yyyy-MM-dd')}.${request.file_path.split('.').pop()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      toast.success(`Downloaded ${commissionRequests.length} attachments`);
      setShowBulkDownloadDialog(false);
    } catch (error) {
      console.error("Bulk download error:", error);
      toast.error("Failed to download some attachments");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // Bulk upload commission requests
  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setIsBulkUploading(true);
    try {
      // Get manager assignment
      let approvalStage = "pending";
      let assignedManagerId: string | null = null;
      let managerProfile: { full_name: string | null; email: string | null } | null = null;

      const { data: assignment } = await supabase
        .from("team_assignments")
        .select("manager_id")
        .eq("employee_id", user!.id)
        .maybeSingle();

      if (assignment?.manager_id) {
        approvalStage = "pending_manager";
        assignedManagerId = assignment.manager_id;
        
        const { data: manager } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", assignment.manager_id)
          .single();
        
        managerProfile = manager;
      }

      let successCount = 0;
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("request-attachments")
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          continue;
        }

        const { error } = await supabase.from("requests").insert({
          type: "commission",
          title: file.name.replace(/\.[^/.]+$/, ""),
          description: "Bulk uploaded commission form",
          submitted_by: user!.id,
          file_path: fileName,
          approval_stage: approvalStage,
          assigned_manager_id: assignedManagerId,
        });

        if (!error) successCount++;
      }

      // Send notification to manager if assigned
      if (assignedManagerId && managerProfile?.email && successCount > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user!.id)
          .single();

        try {
          await supabase.functions.invoke("send-commission-notification", {
            body: {
              notification_type: "manager_review",
              request_id: "",
              title: `Bulk Upload: ${successCount} Commission Form(s)`,
              submitter_name: profile?.full_name || user!.email || "Unknown",
              submitter_email: user!.email || "",
              manager_name: managerProfile.full_name || "Manager",
              manager_email: managerProfile.email,
              has_attachment: true,
            },
          });
        } catch (emailError) {
          console.error("Failed to send bulk upload notification:", emailError);
        }
      }

      toast.success(`Successfully uploaded ${successCount} of ${selectedFiles.length} files`);
      setShowBulkUploadDialog(false);
      setSelectedFiles([]);
      refetch();
      refetchAll();
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Failed to complete bulk upload");
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Filter requests based on role and approval stage
  const getMyPendingRequests = () => {
    if (!allRequests) return [];
    
    if (isAdmin) {
      // Admins see:
      // 1. All pending non-commission requests
      // 2. Commission requests that are manager_approved (waiting for admin)
      // 3. Commission requests with no manager assigned (pending)
      return allRequests.filter(r => {
        if (r.status !== 'pending') return false;
        if (r.type === 'commission') {
          return r.approval_stage === 'pending' || r.approval_stage === 'manager_approved';
        }
        return true;
      });
    } else {
      // Managers see:
      // 1. Commission requests pending_manager where they are the assigned manager
      // 2. Other pending requests (non-commission)
      return allRequests.filter(r => {
        if (r.status !== 'pending') return false;
        if (r.type === 'commission') {
          return r.approval_stage === 'pending_manager' && r.assigned_manager_id === user?.id;
        }
        // Non-commission requests visible to all managers
        return true;
      });
    }
  };

  const pendingRequests = getMyPendingRequests();
  const pendingCount = pendingRequests.length;
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
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="space-y-6">
              <SubmitRequestForm
                type={type}
                setType={(v) => { setType(v); setHrSubType(null); setSelectedManagerId(""); }}
                hrSubType={hrSubType}
                setHrSubType={setHrSubType}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                totalPayoutRequested={totalPayoutRequested}
                setTotalPayoutRequested={setTotalPayoutRequested}
                selectedManagerId={selectedManagerId}
                setSelectedManagerId={setSelectedManagerId}
                managers={managers}
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
                onOpenBulkUpload={() => setShowBulkUploadDialog(true)}
              />
              <MyRequestsList requests={myRequests || []} isSubmitter />
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isAdmin ? "Pending Requests" : "Requests Needing Your Approval"} ({pendingCount})
              </h2>
              {!isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Commission forms from your team members will appear here for your approval before going to admin.
                </p>
              )}
              <RequestsTable
                requests={pendingRequests}
                onView={setSelectedRequest}
                showSubmitter
                showApprovalStage
                showAmounts
              />
              
              <h2 className="text-lg font-semibold text-foreground mt-8">
                Recently Processed
              </h2>
              <RequestsTable
                requests={allRequests?.filter(r => r.status !== 'pending').slice(0, 10) || []}
                onView={setSelectedRequest}
                showSubmitter
                showApprovalStage
                showAmounts
              />
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Commission Forms ({commissionRequests.length})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowBulkDownloadDialog(true)}
                >
                  <Package className="w-4 h-4" />
                  Bulk Download
                </Button>
              </div>
              <RequestsTable
                requests={commissionRequests}
                onView={setSelectedRequest}
                showSubmitter
                showApprovalStage
                showAmounts
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Commission Reports & Analytics
              </h2>
              <p className="text-sm text-muted-foreground">
                View commission trends, employee performance, and approval statistics.
              </p>
              <CommissionReportDashboard />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
          <SubmitRequestForm
              type={type}
              setType={(v) => { setType(v); setHrSubType(null); setSelectedManagerId(""); }}
              hrSubType={hrSubType}
              setHrSubType={setHrSubType}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              totalPayoutRequested={totalPayoutRequested}
              setTotalPayoutRequested={setTotalPayoutRequested}
              selectedManagerId={selectedManagerId}
              setSelectedManagerId={setSelectedManagerId}
              managers={managers}
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
              onOpenBulkUpload={() => setShowBulkUploadDialog(true)}
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
                  {selectedRequest.type === 'commission' && selectedRequest.total_payout_requested && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Payout Requested:</span>
                      <span className="text-foreground font-semibold text-primary">
                        ${selectedRequest.total_payout_requested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {selectedRequest.type === 'commission' && selectedRequest.approved_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Approved Amount:</span>
                      <span className="text-foreground font-semibold text-green-600">
                        ${selectedRequest.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Approval Stage Info for Submitter */}
                {selectedRequest.type === 'commission' && selectedRequest.submitted_by === user?.id && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">Approval Progress:</p>
                    <div className="flex items-center gap-2 text-sm">
                      {selectedRequest.approval_stage === 'pending_manager' && (
                        <>
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>Awaiting manager review</span>
                        </>
                      )}
                      {selectedRequest.approval_stage === 'manager_approved' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <span>Manager approved - Payment approved & requested</span>
                          {selectedRequest.approved_amount && (
                            <Badge variant="secondary" className="ml-2">
                              ${selectedRequest.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Badge>
                          )}
                        </>
                      )}
                      {selectedRequest.approval_stage === 'approved' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Fully approved - Payment processing</span>
                        </>
                      )}
                      {selectedRequest.approval_stage === 'rejected' && (
                        <>
                          <XSquare className="w-4 h-4 text-red-500" />
                          <span>Rejected - Revisions requested</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejection Reason Display */}
                {selectedRequest.rejection_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {/* Manager Notes Display */}
                {selectedRequest.manager_notes && !selectedRequest.rejection_reason && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Manager Notes:</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">{selectedRequest.manager_notes}</p>
                  </div>
                )}

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
                    {/* Commission two-stage approval workflow */}
                    {selectedRequest.type === 'commission' && selectedRequest.approval_stage === 'pending_manager' && !isAdmin && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          This commission form needs your approval before going to admin.
                          {selectedRequest.total_payout_requested && (
                            <span className="block mt-1 font-medium text-primary">
                              Requested Amount: ${selectedRequest.total_payout_requested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </p>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => openRejectionDialog(selectedRequest.id, true)}
                            disabled={isUpdating}
                          >
                            <XSquare className="w-4 h-4 mr-2" />
                            Request Revisions
                          </Button>
                          <Button
                            variant="neon"
                            className="flex-1"
                            onClick={() => openApprovalDialog(selectedRequest.id, true)}
                            disabled={isUpdating}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Approve & Send to Admin
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Commission admin final approval */}
                    {selectedRequest.type === 'commission' && (selectedRequest.approval_stage === 'manager_approved' || (selectedRequest.approval_stage === 'pending' && isAdmin)) && isAdmin && (
                      <>
                        {selectedRequest.approval_stage === 'manager_approved' && (
                          <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-green-700 dark:text-green-400 font-medium">✓ Manager approved this commission</p>
                            {selectedRequest.approved_amount && (
                              <p className="text-green-600 dark:text-green-300 mt-1">
                                Approved Amount: ${selectedRequest.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleAdminApproval(selectedRequest.id, false)}
                            disabled={isUpdating}
                          >
                            <XSquare className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            variant="neon"
                            className="flex-1"
                            onClick={() => handleAdminApproval(selectedRequest.id, true)}
                            disabled={isUpdating}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Final Approve
                          </Button>
                        </div>
                      </>
                    )}

                    {/* IT/HR Support workflow */}
                    {supportRequestTypes.includes(selectedRequest.type) && (
                      <>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                            Mark In Progress
                          </Button>
                          <Button
                            variant="neon"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
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
                    )}

                    {/* Standard Approve/Reject for non-commission, non-support requests */}
                    {selectedRequest.type !== 'commission' && !supportRequestTypes.includes(selectedRequest.type) && (
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XSquare className="w-4 h-4 mr-2" />}
                          Reject
                        </Button>
                        <Button
                          variant="neon"
                          className="flex-1"
                          onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                          Approve
                        </Button>
                      </div>
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

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Revisions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejection. The submitter will be notified and asked to make revisions.
              </p>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain what needs to be revised..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejection}
                disabled={!rejectionReason.trim() || isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Send Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog with Amount */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Commission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approved-amount">Approved Dollar Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="approved-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Notes (optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Any additional notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="neon" 
                onClick={pendingApproval?.isManagerApproval ? handleManagerApproval : processAdminApproval}
                disabled={!approvedAmount || isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Download Dialog */}
        <Dialog open={showBulkDownloadDialog} onOpenChange={setShowBulkDownloadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Download Attachments</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Select a date range to download all commission form attachments.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {bulkDownloadStartDate ? format(bulkDownloadStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={bulkDownloadStartDate}
                        onSelect={setBulkDownloadStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {bulkDownloadEndDate ? format(bulkDownloadEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={bulkDownloadEndDate}
                        onSelect={setBulkDownloadEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDownloadDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="neon" 
                onClick={handleBulkDownload}
                disabled={!bulkDownloadStartDate || !bulkDownloadEndDate || isBulkDownloading}
              >
                {isBulkDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Upload Commission Forms</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Upload multiple commission forms at once. Each file will create a separate request.
              </p>
              
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                multiple
                onChange={handleBulkFileSelect}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => bulkFileInputRef.current?.click()}
                className="w-full justify-start gap-2"
              >
                <Upload className="w-4 h-4" />
                Add Files
              </Button>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 border border-border/50">
                      <File className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {selectedFiles.length} file(s) selected • Accepted formats: PDF, Word, Excel, Images (max 20MB each)
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowBulkUploadDialog(false); setSelectedFiles([]); }}>
                Cancel
              </Button>
              <Button 
                variant="neon" 
                onClick={handleBulkUpload}
                disabled={selectedFiles.length === 0 || isBulkUploading}
              >
                {isBulkUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload {selectedFiles.length} File(s)
              </Button>
            </DialogFooter>
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
  totalPayoutRequested,
  setTotalPayoutRequested,
  selectedManagerId,
  setSelectedManagerId,
  managers,
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
  onOpenBulkUpload,
}: {
  type: string;
  setType: (v: string) => void;
  hrSubType: "simple" | "new-hire" | null;
  setHrSubType: (v: "simple" | "new-hire" | null) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  totalPayoutRequested: string;
  setTotalPayoutRequested: (v: string) => void;
  selectedManagerId: string;
  setSelectedManagerId: (v: string) => void;
  managers: { id: string; full_name: string | null; email: string | null }[];
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
  onOpenBulkUpload: () => void;
}) {
  const canSubmitNewHire = isManager || isAdmin;
  const isNewHireFlow = type === "hr" && canSubmitNewHire && hrSubType === "new-hire";

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Submit a Request</h2>
        {type === "commission" && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenBulkUpload}>
            <Package className="w-4 h-4" />
            Bulk Upload
          </Button>
        )}
      </div>

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

                  {/* Total Payout Requested - Required for Commission */}
                  {type === "commission" && (
                    <div className="space-y-2">
                      <Label htmlFor="total-payout" className="flex items-center gap-1">
                        Total Commission Payout Requested *
                        <span className="text-xs text-muted-foreground">(required)</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="total-payout"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={totalPayoutRequested}
                          onChange={(e) => setTotalPayoutRequested(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the total dollar amount you are requesting for all submitted commission documents.
                      </p>
                    </div>
                  )}

                  {/* Sales Manager Selection - Required for Commission */}
                  {type === "commission" && (
                    <div className="space-y-2">
                      <Label htmlFor="sales-manager" className="flex items-center gap-1">
                        Sales Manager *
                        <span className="text-xs text-muted-foreground">(required)</span>
                      </Label>
                      <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                        <SelectTrigger id="sales-manager">
                          <SelectValue placeholder="Select your Sales Manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.full_name || manager.email || "Unknown Manager"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Your commission form will be sent to this manager for review and approval.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {type === "commission" ? "Commission Details" : "Description (optional)"}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={
                        type === "commission"
                          ? "Enter job details and any relevant notes for your manager..."
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

                  <Button 
                    type="submit" 
                    variant="neon" 
                    disabled={!type || !title.trim() || (type === "commission" && !totalPayoutRequested) || isSubmitting}
                  >
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
function MyRequestsList({ requests, isSubmitter = false }: { requests: Request[]; isSubmitter?: boolean }) {
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
                  {request.type === 'commission' && request.total_payout_requested && (
                    <p className="text-sm text-primary font-medium mt-0.5">
                      Requested: ${request.total_payout_requested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {request.description || "No description provided"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={statusColors[request.status]}>
                  {statusLabels[request.status] || request.status.replace("_", " ")}
                </Badge>
                {isSubmitter && request.type === 'commission' && request.approved_amount && request.approval_stage !== 'pending_manager' && (
                  <Badge variant="secondary" className="text-green-600">
                    Approved: ${request.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Rejection reason for submitter */}
            {isSubmitter && request.rejection_reason && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Revision Requested:</p>
                <p className="text-xs text-red-600 dark:text-red-300">{request.rejection_reason}</p>
              </div>
            )}
            
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
  showApprovalStage = false,
  showAmounts = false,
}: {
  requests: Request[];
  onView: (r: Request) => void;
  showSubmitter?: boolean;
  showApprovalStage?: boolean;
  showAmounts?: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
        No requests found
      </div>
    );
  }

  const approvalStageLabels: Record<string, string> = {
    pending: "Direct to Admin",
    pending_manager: "Awaiting Manager",
    manager_approved: "Payment Approved & Requested",
    approved: "Approved",
    rejected: "Rejected",
  };

  const handleDownloadAttachment = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await supabase.storage
        .from("request-attachments")
        .createSignedUrl(filePath, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden overflow-x-auto">
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
            {showAmounts && (
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Amount
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
              File
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
              {showAmounts && (
                <td className="px-4 py-3 hidden lg:table-cell">
                  {request.type === 'commission' && (
                    <div className="text-sm">
                      {request.total_payout_requested && (
                        <p className="text-muted-foreground">
                          Req: <span className="text-primary font-medium">${request.total_payout_requested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </p>
                      )}
                      {request.approved_amount && (
                        <p className="text-green-600 font-medium">
                          Appr: ${request.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}
                </td>
              )}
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className={statusColors[request.status]}>
                    {statusLabels[request.status] || request.status}
                  </Badge>
                  {showApprovalStage && request.type === 'commission' && request.approval_stage && (
                    <span className="text-xs text-muted-foreground">
                      {approvalStageLabels[request.approval_stage] || request.approval_stage}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                {request.file_path ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:text-primary"
                    onClick={(e) => handleDownloadAttachment(request.file_path!, e)}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">Download</span>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
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
