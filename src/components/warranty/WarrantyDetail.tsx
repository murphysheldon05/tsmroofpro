import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  WarrantyRequest,
  WARRANTY_STATUSES,
  PRIORITY_LEVELS,
  ROOF_TYPES,
  WARRANTY_TYPES,
  SOURCE_OPTIONS,
  useWarrantyNotes,
  useCreateWarrantyNote,
  useWarrantyDocuments,
  useUploadWarrantyDocument,
} from "@/hooks/useWarranties";
import { useWarrantyWatchers, useIsWatching, useToggleWatch } from "@/hooks/useWarrantyWatchers";
import { MentionTextarea, renderMentionText } from "./MentionTextarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayName } from "@/lib/displayName";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { Send, Upload, FileText, Image, Download, Clock, AlertTriangle, History, Eye, EyeOff, Users } from "lucide-react";
import { ActivityHistory } from "@/components/audit/ActivityHistory";
import { OBJECT_TYPES } from "@/hooks/useAdminAuditLog";

interface WarrantyDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: WarrantyRequest | null;
  onEdit: () => void;
}

export function WarrantyDetail({ open, onOpenChange, warranty, onEdit }: WarrantyDetailProps) {
  const [newNote, setNewNote] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"intake_photo" | "closeout_photo" | "document">("intake_photo");
  const { user } = useAuth();

  const { data: notes = [] } = useWarrantyNotes(warranty?.id);
  const { data: documents = [] } = useWarrantyDocuments(warranty?.id);
  const createNote = useCreateWarrantyNote();
  const uploadDocument = useUploadWarrantyDocument();

  const { data: watchers = [] } = useWarrantyWatchers(warranty?.id);
  const isWatching = useIsWatching(warranty?.id);
  const toggleWatch = useToggleWatch();

  // Fetch profiles for display
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (id: string | null) => {
    if (!id) return "Unknown";
    const profile = profiles.find((p) => p.id === id);
    return formatDisplayName(profile?.full_name, profile?.email) || "Unknown";
  };

  const handleMentionedUsers = useCallback((ids: string[]) => {
    setMentionedUserIds(ids);
  }, []);

  if (!warranty) return null;

  const statusConfig = WARRANTY_STATUSES.find((s) => s.value === warranty.status);
  const priorityConfig = PRIORITY_LEVELS.find((p) => p.value === warranty.priority_level);
  const roofTypeConfig = ROOF_TYPES.find((r) => r.value === warranty.roof_type);
  const warrantyTypeConfig = WARRANTY_TYPES.find((w) => w.value === warranty.warranty_type);
  const sourceConfig = SOURCE_OPTIONS.find((s) => s.value === warranty.source_of_request);

  // 7-day no-status-change overdue
  const statusOverdue = warranty.status !== "completed" && warranty.status !== "denied" && warranty.status !== "closed" &&
    differenceInDays(new Date(), parseISO(warranty.last_status_change_at)) >= 7;

  // 48h unanswered @mention overdue: check if any note has mentions and no follow-up reply
  const mentionOverdue = (() => {
    if (warranty.status === "completed" || warranty.status === "denied" || warranty.status === "closed") return false;
    // Find notes with mentions that are >48h old and have no subsequent reply from mentioned user
    for (const note of notes) {
      const rawNote = note as any;
      const mentionedUsers: string[] = rawNote.mentioned_users || [];
      if (mentionedUsers.length === 0) continue;
      const noteAge = differenceInDays(new Date(), parseISO(note.created_at));
      if (noteAge < 2) continue; // Less than 48h
      // Check if any mentioned user replied after this note
      const noteTime = new Date(note.created_at).getTime();
      const hasReply = notes.some(n => {
        const nTime = new Date(n.created_at).getTime();
        return nTime > noteTime && mentionedUsers.includes(n.created_by || "");
      });
      if (!hasReply) return true;
    }
    return false;
  })();

  const isOverdue = statusOverdue || mentionOverdue;

  const handleAddNote = async () => {
    if (!newNote.trim() || !warranty) return;
    await createNote.mutateAsync({
      warranty_id: warranty.id,
      note: newNote.trim(),
      mentioned_user_ids: mentionedUserIds,
    });
    setNewNote("");
    setMentionedUserIds([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !warranty) return;
    await uploadDocument.mutateAsync({
      warranty_id: warranty.id,
      file,
      document_type: uploadType,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getDocumentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("warranty-documents")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleToggleWatch = () => {
    if (!warranty) return;
    toggleWatch.mutate({ warrantyId: warranty.id, isWatching });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Warranty Request Details</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isWatching ? "secondary" : "outline"}
                size="sm"
                onClick={handleToggleWatch}
                disabled={toggleWatch.isPending}
                className="gap-1.5"
              >
                {isWatching ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {isWatching ? "Unwatch" : "Watch"}
              </Button>
              {watchers.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {watchers.length}
                </Badge>
              )}
              <Button onClick={onEdit}>Edit</Button>
            </div>
          </div>
        </DialogHeader>

        {/* Status Banner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
          <Badge className={statusConfig?.color || ""}>{statusConfig?.label}</Badge>
          <Badge className={priorityConfig?.color || ""}>{priorityConfig?.label} Priority</Badge>
          {isOverdue && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              OVERDUE
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {format(parseISO(warranty.last_status_change_at), "MMM d, yyyy h:mm a")}
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Customer & Job Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer & Job Info</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer Name</span>
                  <p className="font-medium">{warranty.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Job Address</span>
                  <p className="font-medium">{warranty.job_address}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Job Number</span>
                  <p className="font-medium">{warranty.original_job_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Install Date</span>
                  <p className="font-medium">{format(parseISO(warranty.original_install_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Roof Type</span>
                  <p className="font-medium">{roofTypeConfig?.label}</p>
                </div>
              </CardContent>
            </Card>

            {/* Warranty Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Warranty Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Warranty Type</span>
                  <p className="font-medium">{warrantyTypeConfig?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expiration Date</span>
                  <p className="font-medium">{format(parseISO(warranty.warranty_expiration_date), "MMM d, yyyy")}</p>
                </div>
                {warranty.manufacturer && (
                  <div>
                    <span className="text-muted-foreground">Manufacturer</span>
                    <p className="font-medium">{warranty.manufacturer}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">Coverage Description</span>
                  <p className="font-medium">{warranty.warranty_coverage_description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Issue Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Issue Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date Submitted</span>
                  <p className="font-medium">{format(parseISO(warranty.date_submitted), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Source</span>
                  <p className="font-medium">{sourceConfig?.label}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Issue Description</span>
                  <p className="font-medium whitespace-pre-wrap">{warranty.issue_description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="font-medium">
                    {warranty.assigned_production_member
                      ? getProfileName(warranty.assigned_production_member)
                      : "Unassigned"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Secondary Support</span>
                  <p className="font-medium">
                    {warranty.secondary_support
                      ? getProfileName(warranty.secondary_support)
                      : "None"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date Assigned</span>
                  <p className="font-medium">
                    {warranty.date_assigned
                      ? format(parseISO(warranty.date_assigned), "MMM d, yyyy")
                      : "Not assigned"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resolution (if completed or denied) */}
            {(warranty.status === "completed" || warranty.status === "denied") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resolution</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  {warranty.resolution_summary && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Resolution Summary</span>
                      <p className="font-medium whitespace-pre-wrap">{warranty.resolution_summary}</p>
                    </div>
                  )}
                  {warranty.date_completed && (
                    <div>
                      <span className="text-muted-foreground">Date Completed</span>
                      <p className="font-medium">{format(parseISO(warranty.date_completed), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  {warranty.labor_cost !== null && (
                    <div>
                      <span className="text-muted-foreground">Labor Cost</span>
                      <p className="font-medium">${warranty.labor_cost.toFixed(2)}</p>
                    </div>
                  )}
                  {warranty.material_cost !== null && (
                    <div>
                      <span className="text-muted-foreground">Material Cost</span>
                      <p className="font-medium">${warranty.material_cost.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Manufacturer Claim Filed</span>
                    <p className="font-medium">{warranty.is_manufacturer_claim_filed ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Close-Out Photos</span>
                    <p className="font-medium">{warranty.closeout_photos_uploaded ? "Uploaded" : "Not uploaded"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer Notified</span>
                    <p className="font-medium">{warranty.customer_notified_of_completion ? "Yes" : "No"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Closed Info */}
            {warranty.status === "closed" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Closed Info</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  {warranty.closed_date && (
                    <div>
                      <span className="text-muted-foreground">Closed Date</span>
                      <p className="font-medium">{format(parseISO(warranty.closed_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Closed By</span>
                    <p className="font-medium">{getProfileName(warranty.closed_by)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Watchers */}
            {watchers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Watchers ({watchers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {watchers.map(w => (
                      <Badge key={w.id} variant="secondary" className="text-xs">
                        {getProfileName(w.user_id)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {/* Add Note with @mention */}
            <div className="flex gap-2">
              <div className="flex-1">
                <MentionTextarea
                  value={newNote}
                  onChange={setNewNote}
                  onMentionedUsers={handleMentionedUsers}
                  placeholder="Add a comment... Use @ to mention someone"
                  rows={2}
                />
              </div>
              <Button onClick={handleAddNote} disabled={!newNote.trim() || createNote.isPending} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {mentionedUserIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Mentioning:</span>
                {mentionedUserIds.map(id => (
                  <Badge key={id} variant="outline" className="text-[10px]">
                    {getProfileName(id)}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{getProfileName(note.created_by)}</span>
                      <span>{format(parseISO(note.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{renderMentionText(note.note)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {/* Upload */}
            <div className="flex items-center gap-4">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as typeof uploadType)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="intake_photo">Intake Photo</option>
                <option value="closeout_photo">Close-Out Photo</option>
                <option value="document">Document</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocument.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>

            <Separator />

            {/* Documents List */}
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-muted"
                    onClick={() => getDocumentUrl(doc.file_path)}
                  >
                    {doc.file_type?.startsWith("image/") ? (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{doc.document_type.replace("_", " ")}</p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityHistory objectType={OBJECT_TYPES.WARRANTY} objectId={warranty?.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
