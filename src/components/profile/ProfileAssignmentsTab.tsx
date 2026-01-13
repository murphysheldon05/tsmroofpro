import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle2, Award, Percent, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCommissionTier } from "@/hooks/useCommissionTiers";

export function ProfileAssignmentsTab() {
  const { user } = useAuth();
  const { data: userTier, isLoading: tierLoading } = useUserCommissionTier(user?.id);

  return (
    <div className="space-y-6">
      {/* Commission Tier Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Commission Tier
          </CardTitle>
          <CardDescription>
            Your assigned commission tier and available options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tierLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ) : userTier?.tier ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold text-base px-3 py-1">
                    {userTier.tier.name}
                  </Badge>
                  {userTier.tier.description && (
                    <p className="text-sm text-muted-foreground mt-1">{userTier.tier.description}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-start gap-3 pt-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">O&P Options</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {userTier.tier.allowed_op_percentages.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs font-financial">
                          {(p * 100).toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profit Split Options</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {userTier.tier.allowed_profit_splits.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs font-financial">
                          {(p * 100).toFixed(0)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
                <Award className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No Tier Assigned</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                You haven't been assigned a commission tier yet. Contact your manager to get assigned.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Assignments Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            My Assignments
          </CardTitle>
          <CardDescription>
            View your content assignments and tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No assignments yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Your content assignments will appear here when assigned to you
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
