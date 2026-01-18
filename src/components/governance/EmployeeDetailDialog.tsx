import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppAssignmentsByEmployee } from "@/hooks/useAppAssignments";
import { useUserChecklistsByEmployee } from "@/hooks/useUserChecklists";
import { Laptop, ClipboardList, User, Mail, Building2, Calendar, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface EmployeeDetailDialogProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  business_owner: "Business Owner",
  system_admin: "System Admin",
  onboarding_owner: "Onboarding Owner",
  access_monitor: "Access Monitor",
  it_triage_owner: "IT Triage Owner",
  operator: "Operator",
  profile_owner: "Profile Owner",
  external_vendor: "External Vendor",
};

const roleColors: Record<string, string> = {
  business_owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  system_admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  onboarding_owner: "bg-green-500/20 text-green-400 border-green-500/30",
  it_triage_owner: "bg-red-500/20 text-red-400 border-red-500/30",
  operator: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function EmployeeDetailDialog({ employeeId, open, onOpenChange }: EmployeeDetailDialogProps) {
  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee-detail", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments(name)
        `)
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const { data: assignments, isLoading: loadingAssignments } = useAppAssignmentsByEmployee(employeeId || undefined);
  const { data: checklists, isLoading: loadingChecklists } = useUserChecklistsByEmployee(employeeId || undefined);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>

        {loadingEmployee ? (
          <Skeleton className="h-24 w-full" />
        ) : employee ? (
          <div className="space-y-6">
            {/* Employee Header */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="w-16 h-16">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{employee.full_name || "Unknown"}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </span>
                  {employee.departments?.name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {employee.departments.name}
                    </span>
                  )}
                  {employee.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Started {format(new Date(employee.start_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  employee.employee_status === "active"
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                }
              >
                {employee.employee_status || "active"}
              </Badge>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="apps" className="space-y-4">
              <TabsList>
                <TabsTrigger value="apps" className="gap-2">
                  <Laptop className="w-4 h-4" />
                  Apps ({assignments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="checklists" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Checklists ({checklists?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apps">
                {loadingAssignments ? (
                  <Skeleton className="h-48 w-full" />
                ) : assignments?.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No app assignments found
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {assignments?.map((assignment) => (
                      <Card key={assignment.id}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Laptop className="w-5 h-5 text-primary" />
                            <div>
                              <span className="font-medium">
                                {assignment.applications?.app_name || "Unknown App"}
                              </span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({assignment.applications?.category})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={roleColors[assignment.assignment_role] || "bg-gray-500/20"}>
                              {roleLabels[assignment.assignment_role] || assignment.assignment_role}
                            </Badge>
                            {assignment.is_primary && (
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checklists">
                {loadingChecklists ? (
                  <Skeleton className="h-48 w-full" />
                ) : checklists?.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No checklists found
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {checklists?.map((checklist) => {
                      const items = checklist.checklist_items || [];
                      const done = items.filter((i) => i.status === "done").length;
                      const total = items.length;

                      return (
                        <Card key={checklist.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {checklist.checklist_type === "onboarding" ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Clock className="w-5 h-5 text-orange-500" />
                                )}
                                <div>
                                  <span className="font-medium capitalize">
                                    {checklist.checklist_type} Checklist
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {format(new Date(checklist.created_at), "MMM d, yyyy")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    checklist.status === "completed"
                                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                                      : checklist.status === "in_progress"
                                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                                      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                                  }
                                >
                                  {checklist.status.replace("_", " ")}
                                </Badge>
                                <Badge variant="outline">
                                  {done}/{total}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Employee not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
