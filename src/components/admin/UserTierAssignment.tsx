import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Percent, UserCheck, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useCommissionTiers, 
  useAssignUserTier, 
  useRemoveUserTier 
} from "@/hooks/useCommissionTiers";

interface UserWithTier {
  id: string;
  full_name: string | null;
  email: string | null;
  tier_id: string | null;
  tier_name: string | null;
}

export function UserTierAssignment() {
  const { user } = useAuth();
  const { data: tiers, isLoading: tiersLoading } = useCommissionTiers();
  const assignMutation = useAssignUserTier();
  const removeMutation = useRemoveUserTier();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users with their tier assignments
  const { data: usersWithTiers, isLoading: usersLoading } = useQuery({
    queryKey: ['users-with-tiers'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Get tier assignments
      const { data: tierAssignments, error: tierError } = await supabase
        .from('user_commission_tiers')
        .select(`
          user_id,
          tier:commission_tiers(id, name)
        `);
      
      if (tierError) throw tierError;

      // Create a map of user_id to tier info
      const tierMap = new Map<string, { tier_id: string; tier_name: string }>();
      tierAssignments?.forEach((assignment: any) => {
        if (assignment.tier) {
          tierMap.set(assignment.user_id, {
            tier_id: assignment.tier.id,
            tier_name: assignment.tier.name,
          });
        }
      });

      // Combine profiles with tier info
      return (profiles || []).map(profile => ({
        ...profile,
        tier_id: tierMap.get(profile.id)?.tier_id || null,
        tier_name: tierMap.get(profile.id)?.tier_name || null,
      })) as UserWithTier[];
    },
  });

  const handleAssignTier = async (userId: string, tierId: string) => {
    if (!user?.id) return;
    
    if (tierId === 'none') {
      await removeMutation.mutateAsync(userId);
    } else {
      await assignMutation.mutateAsync({
        userId,
        tierId,
        assignedBy: user.id,
      });
    }
  };

  const filteredUsers = usersWithTiers?.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (tiersLoading || usersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Commission Tier Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          User Commission Tier Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredUsers && filteredUsers.length > 0 ? (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredUsers.map((userItem) => (
              <div
                key={userItem.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{userItem.full_name || 'Unnamed User'}</div>
                  <div className="text-sm text-muted-foreground truncate">{userItem.email}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {userItem.tier_name && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {userItem.tier_name}
                    </Badge>
                  )}
                  <Select
                    value={userItem.tier_id || 'none'}
                    onValueChange={(value) => handleAssignTier(userItem.id, value)}
                    disabled={assignMutation.isPending || removeMutation.isPending}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Assign tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="none">No Tier</SelectItem>
                      {tiers?.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No users found. Users will appear here once they are registered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
