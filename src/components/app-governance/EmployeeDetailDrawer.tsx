import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAssignments, useUserChecklists, useGenerateChecklist, useOneClickOffboarding } from "@/hooks/useAppGovernance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, AppWindow, Shield, AlertTriangle, Power } from "lucide-react";
import { format } from "date-fns";

interface EmployeeDetailDrawerProps {
  employeeId: string | null;
  onClose: () => void;
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

export function EmployeeDetailDrawer({ employeeId, onClose }: EmployeeDetailDrawerProps) {
  const { user } = useAuth();
  const [confirmName, setConfirmName] = useState("");
  const generateChecklist = useGenerateChecklist();
  const oneClickOffboarding = useOneClickOffboarding();

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["employee-detail", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments (name)
        `)
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const { data: assignments, isLoading: assignmentsLoading } = useAppAssignments(undefined, employeeId || undefined);
  const { data: checklists, isLoading: checklistsLoading } = useUserChecklists(employeeId || undefined);

  const handleGenerateOnboarding = async () => {
    if (!employeeId || !user?.id) return;
    await generateChecklist.mutateAsync({
      employeeId,
      checklistType: "onboarding",
      createdBy: user.id,
    });
  };

  const handleGenerateOffboarding = async () => {
    if (!employeeId || !user?.id) return;
    await generateChecklist.mutateAsync({
      employeeId,
      checklistType: "offboarding",
      createdBy: user.id,
    });
  };

  const handleOneClickOffboarding = async () => {
    if (!employeeId || !user?.id || confirmName !== employee?.full_name) return;
    await oneClickOffboarding.mutateAsync({
      employeeId,
      executedBy: user.id,
    });
    setConfirmName("");
    onClose();
  };

  if (!employeeId) return null;

  return (
    <Sheet open={!!employeeId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{employee?.full_name || "Employee"}</SheetTitle>
          <SheetDescription>{employee?.email}</SheetDescription>
        </SheetHeader>

        {employeeLoading ? (
          <Skeleton className="h-96 mt-6" />
        ) : (
          <div className="mt-6 space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={employee?.employee_status === "active" ? "default" : "secondary"}
                  className="ml-2"
                >
                  {employee?.employee_status || "active"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <span className="ml-2">{(employee?.departments as any)?.name || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <span className="ml-2">{employee?.role_title || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <span className="ml-2">
                  {employee?.start_date ? format(new Date(employee.start_date), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleGenerateOnboarding}
                disabled={generateChecklist.isPending}
              >
                <ClipboardList className="w-4 h-4" />
                Generate Onboarding
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleGenerateOffboarding}
                disabled={generateChecklist.isPending}
              >
                <ClipboardList className="w-4 h-4" />
                Generate Offboarding
              </Button>
              {employee?.employee_status !== "inactive" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Power className="w-4 h-4" />
                      One-Click Offboarding
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Confirm One-Click Offboarding
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>This will immediately:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Set employee status to Inactive</li>
                          <li>Generate offboarding checklist</li>
                          <li>Create IT requests for all {assignments?.length || 0} assigned apps</li>
                        </ul>
                        <div className="pt-4">
                          <Label>Type employee name to confirm: <strong>{employee?.full_name}</strong></Label>
                          <Input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder="Type name here..."
                            className="mt-2"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleOneClickOffboarding}
                        disabled={confirmName !== employee?.full_name || oneClickOffboarding.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirm Offboarding
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="apps">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="apps" className="gap-2">
                  <AppWindow className="w-4 h-4" />
                  Apps ({assignments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="checklists" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Checklists ({checklists?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apps" className="mt-4 space-y-3">
                {assignmentsLoading ? (
                  <Skeleton className="h-48" />
                ) : assignments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No apps assigned</p>
                ) : (
                  assignments?.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{assignment.applications?.app_name}</CardTitle>
                          {assignment.is_primary && (
                            <Badge className="bg-primary/20 text-primary">Primary</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {roleLabels[assignment.assignment_role] || assignment.assignment_role}
                          </Badge>
                          <Badge variant="outline" className="bg-muted">
                            {assignment.permission_level.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="checklists" className="mt-4 space-y-3">
                {checklistsLoading ? (
                  <Skeleton className="h-48" />
                ) : checklists?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No checklists generated</p>
                ) : (
                  checklists?.map((checklist) => (
                    <Card key={checklist.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base capitalize">
                            {checklist.checklist_type} Checklist
                          </CardTitle>
                          <Badge 
                            variant={checklist.status === "completed" ? "default" : "secondary"}
                          >
                            {checklist.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 text-sm text-muted-foreground">
                        Created {format(new Date(checklist.created_at), "MMM d, yyyy")}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
