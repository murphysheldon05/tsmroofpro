import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  FileText,
  ArrowRight,
  Clock,
  Eye,
  TrendingUp,
  User,
} from "lucide-react";
import { useSearchResources, useRecentResources, usePopularResources, Resource, SOPStatus } from "@/hooks/useResources";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

// Filter resources by status based on user role
const filterByStatus = (
  resources: Resource[] | undefined, 
  isAdmin: boolean, 
  isManager: boolean
): Resource[] => {
  if (!resources) return [];
  
  return resources.filter(r => {
    const status = r.status || 'live';
    
    // Admins see everything
    if (isAdmin) return true;
    
    // Managers see Live and Draft
    if (isManager) return status === 'live' || status === 'draft';
    
    // Sales Reps (employees) see only Live
    return status === 'live';
  });
};

export function QuickSOPAccessWidget() {
  const navigate = useNavigate();
  const { role, isAdmin, isManager } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: searchResultsRaw, isLoading: searchLoading } = useSearchResources(searchQuery);
  const { data: recentResourcesRaw, isLoading: recentLoading } = useRecentResources(5);
  const { data: popularResourcesRaw, isLoading: popularLoading } = usePopularResources(5);

  // Filter by status based on role
  const searchResults = filterByStatus(searchResultsRaw, isAdmin, isManager);
  const recentResources = filterByStatus(recentResourcesRaw, isAdmin, isManager);
  const popularResources = filterByStatus(popularResourcesRaw, isAdmin, isManager);

  const handleResourceClick = (resource: Resource) => {
    if (resource.categories?.slug) {
      navigate(`/sops/${resource.categories.slug}`);
    } else {
      navigate("/sops");
    }
  };

  const isSearching = searchQuery.length > 0;
  const displayResources = isSearching ? (searchResults || []) : [];

  // Get user's role for filtering "SOPs for My Role"
  const roleBasedResources = (recentResources || []).filter(r => {
    const tags = r.tags || [];
    // Match based on user's app role
    if (role === "admin") {
      return tags.some(t => t.toLowerCase().includes("admin") || t.toLowerCase().includes("manager"));
    }
    if (role === "manager") {
      return tags.some(t => t.toLowerCase().includes("manager") || t.toLowerCase().includes("production"));
    }
    // Default to field/employee content
    return tags.some(t => t.toLowerCase().includes("field") || t.toLowerCase().includes("sales") || t.toLowerCase().includes("production"));
  }).slice(0, 3);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          Quick SOP Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search SOPs by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchLoading ? "Searching..." : `${displayResources.length} result(s)`}
            </p>
            {searchLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : displayResources.length > 0 ? (
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5">
                  {displayResources.slice(0, 5).map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {resource.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {resource.categories?.name && (
                              <span>{resource.categories.name}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                No SOPs found for "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Quick Access Sections - Only show when not searching */}
        {!isSearching && (
          <div className="space-y-3">
            {/* SOPs for My Role */}
            {roleBasedResources.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <User className="w-3 h-3" />
                  SOPs for My Role
                </div>
                <div className="space-y-1">
                  {roleBasedResources.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors group flex items-center justify-between"
                    >
                      <span className="text-sm truncate group-hover:text-primary transition-colors">
                        {resource.title}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Updated */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Clock className="w-3 h-3" />
                Recently Updated
              </div>
              {recentLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ) : (
                <div className="space-y-1">
                  {(recentResources || []).slice(0, 3).map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm truncate group-hover:text-primary transition-colors">
                          {resource.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Most Viewed */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <TrendingUp className="w-3 h-3" />
                Most Viewed
              </div>
              {popularLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ) : (
                <div className="space-y-1">
                  {(popularResources || []).slice(0, 3).map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceClick(resource)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm truncate group-hover:text-primary transition-colors">
                          {resource.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                          <Eye className="w-3 h-3" />
                          {resource.view_count}
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View All Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 h-8 text-xs"
          onClick={() => navigate("/sops")}
        >
          View Full SOP Library
          <ArrowRight className="w-3 h-3 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
