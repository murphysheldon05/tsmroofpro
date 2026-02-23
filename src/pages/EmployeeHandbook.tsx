import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCurrentHandbook,
  useHandbookPdfUrl,
  useHandbookAcknowledgment,
  useAcknowledgeHandbook,
  useUploadEmployeeHandbook,
  useHandbookAckReport,
} from "@/hooks/useEmployeeHandbook";
import { ArrowLeft, FileText, Upload, CheckCircle2, Users } from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EmployeeHandbook() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: current, isLoading: loadingCurrent } = useCurrentHandbook();
  const { data: pdfUrl, isLoading: loadingUrl } = useHandbookPdfUrl(current ?? null);
  const { data: ack, isLoading: loadingAck } = useHandbookAcknowledgment();
  const acknowledgeMutation = useAcknowledgeHandbook();
  const uploadMutation = useUploadEmployeeHandbook();
  const { data: report, isLoading: loadingReport } = useHandbookAckReport();

  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAcknowledged = !!ack;
  const canAcknowledge = !!current && !hasAcknowledged;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadVersion.trim()) return;
    await uploadMutation.mutateAsync({ file: uploadFile, version: uploadVersion.trim() });
    setUploadVersion("");
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loadingCurrent) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/playbook-library")}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Playbook Library
        </Button>

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Employee Handbook</h1>
              <p className="text-sm text-muted-foreground">
                Company handbook — all users must acknowledge the current version.
              </p>
            </div>
          </div>
          {current && (
            <Badge variant="secondary" className="w-fit">
              Version: {current.version}
            </Badge>
          )}
        </header>

        {!current ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No handbook has been uploaded yet.
              </p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Use the upload form below to add the first version.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* PDF viewer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Current Handbook</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Uploaded {format(new Date(current.uploaded_at), "PPp")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingUrl ? (
                  <Skeleton className="h-[60vh] w-full rounded-lg" />
                ) : pdfUrl ? (
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <iframe
                      src={pdfUrl}
                      title="Employee Handbook PDF"
                      className="w-full h-[60vh]"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Could not load PDF.</p>
                )}

                {canAcknowledge && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                    <Button
                      onClick={() => acknowledgeMutation.mutate()}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      I have read and acknowledge this handbook
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Required to continue using the hub.
                    </span>
                  </div>
                )}
                {hasAcknowledged && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    You acknowledged this version on{" "}
                    {ack ? format(new Date(ack.acknowledged_at), "PPp") : "—"}.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Admin: upload new version */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload New Version
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Uploading a new PDF will require all users to acknowledge it before
                continuing to use the app.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4 max-w-md">
                <div>
                  <Label>Version label (e.g. 2024-01 or v2.0)</Label>
                  <Input
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="e.g. 2024-01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>PDF file</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 w-full justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadFile ? uploadFile.name : "Choose PDF"}
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={!uploadVersion.trim() || !uploadFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Uploading…" : "Upload Handbook"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Admin: acknowledgment report */}
        {isAdmin && current && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Acknowledgment Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Who has and has not acknowledged version &quot;{current.version}&quot;.
              </p>
            </CardHeader>
            <CardContent>
              {loadingReport ? (
                <Skeleton className="h-64 w-full" />
              ) : report && report.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date / Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.map((row) => (
                        <TableRow key={row.user_id}>
                          <TableCell className="font-medium">
                            {row.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.email || "—"}
                          </TableCell>
                          <TableCell>
                            {row.acknowledged_at ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not acknowledged</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.acknowledged_at
                              ? format(new Date(row.acknowledged_at), "PPp")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users to display.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
