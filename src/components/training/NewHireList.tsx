import { useAuth } from "@/contexts/AuthContext";
import { useNewHires, useUpdateNewHireStatus, useDeleteNewHire, NewHire } from "@/hooks/useNewHires";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  in_progress: { label: "In Progress", variant: "default", icon: AlertCircle },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle2 },
};

export function NewHireList() {
  const { isAdmin } = useAuth();
  const { data: newHires, isLoading } = useNewHires();
  const updateStatus = useUpdateNewHireStatus();
  const deleteNewHire = useDeleteNewHire();

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this new hire record?")) {
      deleteNewHire.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!newHires || newHires.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            New Hire Queue
          </CardTitle>
          <CardDescription>
            Track and process new hire onboarding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No new hires pending</h3>
            <p className="text-muted-foreground text-sm mt-1">
              New hires will appear here when submitted
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          New Hire Queue
        </CardTitle>
        <CardDescription>
          {newHires.filter(h => h.status === 'pending').length} pending, {newHires.filter(h => h.status === 'in_progress').length} in progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newHires.map((hire) => {
          const config = statusConfig[hire.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          
          return (
            <div
              key={hire.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{hire.full_name}</h4>
                    <Badge variant={config.variant} className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hire.personal_email}
                    {hire.phone_number && ` • ${hire.phone_number}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(hire.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Select
                        value={hire.status}
                        onValueChange={(value) => handleStatusChange(hire.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(hire.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {hire.required_access && hire.required_access.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Required Access:</p>
                  <div className="flex flex-wrap gap-1">
                    {hire.required_access.map((access) => (
                      <Badge key={access} variant="outline" className="text-xs">
                        {access}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hire.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm text-muted-foreground">{hire.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
