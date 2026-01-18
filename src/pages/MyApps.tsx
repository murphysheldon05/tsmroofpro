import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAppAssignmentsByEmployee } from "@/hooks/useAppAssignments";
import { Skeleton } from "@/components/ui/skeleton";
import { Laptop, Shield, User, AlertCircle } from "lucide-react";

const roleColors: Record<string, string> = {
  business_owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  system_admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  onboarding_owner: "bg-green-500/20 text-green-400 border-green-500/30",
  access_monitor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  it_triage_owner: "bg-red-500/20 text-red-400 border-red-500/30",
  operator: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  profile_owner: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  external_vendor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

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

const permissionLabels: Record<string, string> = {
  top_tier_admin: "Top Tier Admin",
  admin: "Admin",
  standard_user: "Standard User",
  limited_user: "Limited User",
  none: "None",
};

export default function MyApps() {
  const { user } = useAuth();
  const { data: assignments, isLoading } = useAppAssignmentsByEmployee(user?.id);

  // Group assignments by app
  const appGroups = assignments?.reduce((acc, assignment) => {
    const appName = assignment.applications?.app_name || "Unknown App";
    if (!acc[appName]) {
      acc[appName] = {
        app: assignment.applications,
        assignments: [],
      };
    }
    acc[appName].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { app: any; assignments: typeof assignments }>);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Apps</h1>
          <p className="text-muted-foreground">
            Applications you have access to and your role in each
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !appGroups || Object.keys(appGroups).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Apps Assigned</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have any application assignments yet. Contact your admin to get access to the apps you need.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(appGroups).map(([appName, { app, assignments }]) => (
              <Card key={appName} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{appName}</CardTitle>
                    </div>
                    {app?.status === "active" ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                        {app?.status || "Unknown"}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{app?.category || "Uncategorized"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignments?.map((assignment) => (
                    <div key={assignment.id} className="flex flex-wrap gap-2 items-center">
                      <Badge className={roleColors[assignment.assignment_role] || "bg-gray-500/20"}>
                        {roleLabels[assignment.assignment_role] || assignment.assignment_role}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {permissionLabels[assignment.permission_level] || assignment.permission_level}
                      </Badge>
                      {assignment.is_primary && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                  {assignments?.[0]?.scope_notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {assignments[0].scope_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
