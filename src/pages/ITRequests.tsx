import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useITRequests, useCreateITRequest, useUpdateITRequest, useApplications } from "@/hooks/useAppGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  cant_work: "bg-red-500/20 text-red-400 border-red-500/30",
  workaround: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  nice_to_have: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const priorityIcons: Record<string, React.ElementType> = {
  cant_work: AlertTriangle,
  workaround: AlertCircle,
  nice_to_have: Info,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  waiting_on_vendor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
};

const requestTypeLabels: Record<string, string> = {
  access: "Access",
  issue: "Issue",
  change: "Change",
  training: "Training",
};

export default function ITRequests() {
  const { user, isAdmin, isManager } = useAuth();
  const { data: requests, isLoading } = useITRequests(isAdmin || isManager ? undefined : user?.id);
  const { data: applications } = useApplications();
  const createRequest = useCreateITRequest();
  const updateRequest = useUpdateITRequest();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    app_id: "",
    request_type: "access" as string,
    priority: "nice_to_have" as string,
    description: "",
  });

  const handleCreate = async () => {
    if (!user?.id || !newRequest.description) return;

    await createRequest.mutateAsync({
      requester_id: user.id,
      app_id: newRequest.app_id || null,
      request_type: newRequest.request_type as any,
      priority: newRequest.priority as any,
      description: newRequest.description,
      status: "new",
    });

    setNewRequest({ app_id: "", request_type: "access", priority: "nice_to_have", description: "" });
    setIsCreateOpen(false);
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    await updateRequest.mutateAsync({
      id: requestId,
      status: newStatus as any,
      resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IT Requests</h1>
            <p className="text-muted-foreground mt-1">Submit and track IT support requests</p>
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IT Requests</h1>
            <p className="text-muted-foreground mt-1">
              Submit and track IT support requests
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create IT Request</DialogTitle>
                <DialogDescription>
                  Submit a new IT support request
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Application (optional)</Label>
                  <Select
                    value={newRequest.app_id}
                    onValueChange={(v) => setNewRequest({ ...newRequest, app_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an application" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {applications?.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.app_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Select
                      value={newRequest.request_type}
                      onValueChange={(v) => setNewRequest({ ...newRequest, request_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="access">Access</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                        <SelectItem value="change">Change</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newRequest.priority}
                      onValueChange={(v) => setNewRequest({ ...newRequest, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cant_work">Can't Work</SelectItem>
                        <SelectItem value="workaround">Workaround Available</SelectItem>
                        <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Describe your request..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newRequest.description || createRequest.isPending}
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {requests?.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No IT requests found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {(isAdmin || isManager) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.map((request) => {
                    const PriorityIcon = priorityIcons[request.priority] || Info;
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {requestTypeLabels[request.request_type] || request.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.applications?.app_name || "General"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("gap-1", priorityColors[request.priority])}
                          >
                            <PriorityIcon className="w-3 h-3" />
                            {request.priority.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={statusColors[request.status]}
                          >
                            {request.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </TableCell>
                        {(isAdmin || isManager) && (
                          <TableCell>
                            <Select
                              value={request.status}
                              onValueChange={(v) => handleStatusChange(request.id, v)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="waiting_on_vendor">Waiting on Vendor</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
