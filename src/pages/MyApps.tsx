import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAppAssignments } from "@/hooks/useAppGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Shield, User, Settings, Monitor } from "lucide-react";

const roleIcons: Record<string, React.ElementType> = {
  business_owner: Shield,
  system_admin: Settings,
  it_triage_owner: Monitor,
  operator: User,
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

const permissionColors: Record<string, string> = {
  top_tier_admin: "bg-red-500/20 text-red-400 border-red-500/30",
  admin: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  standard_user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  limited_user: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  none: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  crm: "CRM",
  accounting: "Accounting",
  communications: "Communications",
  suppliers: "Suppliers",
  financing: "Financing",
  training: "Training",
  marketing: "Marketing",
  storage: "Storage",
  social: "Social Media",
  productivity: "Productivity",
  other: "Other",
};

export default function MyApps() {
  const { user } = useAuth();
  const { data: assignments, isLoading } = useAppAssignments(undefined, user?.id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Apps</h1>
            <p className="text-muted-foreground mt-1">Applications and systems assigned to you</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Group assignments by category
  const groupedAssignments = assignments?.reduce((acc, assignment) => {
    const category = assignment.applications?.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(assignment);
    return acc;
  }, {} as Record<string, typeof assignments>);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Apps</h1>
          <p className="text-muted-foreground mt-1">
            Applications and systems assigned to you ({assignments?.length || 0} total)
          </p>
        </div>

        {assignments?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No applications assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedAssignments || {}).map(([category, categoryAssignments]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4 text-foreground/80">
                  {categoryLabels[category] || category}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryAssignments?.map((assignment) => {
                    const RoleIcon = roleIcons[assignment.assignment_role] || User;
                    return (
                      <Card key={assignment.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">
                              {assignment.applications?.app_name}
                            </CardTitle>
                            {assignment.is_primary && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {assignment.applications?.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            <RoleIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {roleLabels[assignment.assignment_role] || assignment.assignment_role}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={permissionColors[assignment.permission_level] || permissionColors.standard_user}
                          >
                            {assignment.permission_level.replace(/_/g, " ")}
                          </Badge>
                          {assignment.scope_notes && (
                            <p className="text-xs text-muted-foreground italic">
                              {assignment.scope_notes}
                            </p>
                          )}
                          {assignment.applications?.source_of_truth && (
                            <a 
                              href={assignment.applications.source_of_truth}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open App
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
