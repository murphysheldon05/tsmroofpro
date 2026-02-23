import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { useResources, useCategories, useSearchResources, Resource, SOPStatus } from "@/hooks/useResources";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ResourceDetailModal } from "@/components/resources/ResourceDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { useHandbookGateRequired } from "@/hooks/useEmployeeHandbook";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  Hammer,
  FileCode,
  Building2,
  Calculator,
  Shield,
  FileText,
  List,
  Grid,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  "master-playbook": BookOpen,
  sales: TrendingUp,
  production: Hammer,
  supplements: FileCode,
  "office-admin": Building2,
  accounting: Calculator,
  "safety-hr": Shield,
  "templates-scripts": FileText,
};

// Task type filters for Quick SOP Access
const taskTypes = [
  { value: "all", label: "All Tasks" },
  { value: "inspection", label: "Inspection" },
  { value: "estimate", label: "Estimate" },
  { value: "production", label: "Production" },
  { value: "admin", label: "Admin" },
  { value: "closeout", label: "Closeout" },
  { value: "sales", label: "Sales" },
];

// Role filters
const roleFilters = [
  { value: "all", label: "All Roles" },
  { value: "field", label: "Field" },
  { value: "office", label: "Office" },
  { value: "manager", label: "Manager" },
];

// Urgency filters
const urgencyFilters = [
  { value: "all", label: "All Urgency" },
  { value: "field", label: "Field (Immediate)" },
  { value: "office", label: "Office (Same Day)" },
  { value: "manager", label: "Manager (Review)" },
];

export default function SOPLibrary() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const { completedCount, totalCount, allCompleted } = useMasterSOPAcknowledgments();
  const { hasAcknowledged: handbookAcknowledged, currentVersion: handbookVersion } = useHandbookGateRequired();
  const { data: allResourcesRaw, isLoading: allLoading } = useResources();
  const { data: categoryResourcesRaw, isLoading: categoryLoading } = useResources(category);
  const { data: categories } = useCategories();
  
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"quick" | "browse">(category ? "browse" : "quick");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskType, setTaskType] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const { data: searchResultsRaw, isLoading: searchLoading } = useSearchResources(searchQuery);

  // Filter resources by status based on user role
  // Sales Reps: ONLY Live
  // Managers: Live + Draft (with draft badges)
  // Admins: ALL (Live, Draft, Archived)
  const filterByStatus = (resources: Resource[] | undefined): Resource[] => {
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

  const allResources = filterByStatus(allResourcesRaw);
  const categoryResources = filterByStatus(categoryResourcesRaw);
  const searchResults = filterByStatus(searchResultsRaw);

  // Show status badges for managers and admins (so they can see which are drafts)
  const showStatusBadges = isAdmin || isManager;

  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);
    setModalOpen(true);
  };

  const currentCategory = categories?.find((c) => c.slug === category);
  const Icon = category ? categoryIcons[category] || FileText : FileText;

  // Resources to display based on view mode
  const displayResources = useMemo(() => {
    if (viewMode === "quick") {
      // Quick SOP Access - flat searchable list
      let resources = searchQuery ? (searchResults || []) : (allResources || []);
      
      // Apply task type filter (use task_type field first, then fall back to tags)
      if (taskType !== "all") {
        resources = resources.filter(r => 
          r.task_type?.toLowerCase() === taskType.toLowerCase() ||
          r.tags?.some(t => t.toLowerCase().includes(taskType.toLowerCase()))
        );
      }
      
      // Apply role filter (use role_target field first, then fall back to tags/visibility)
      if (roleFilter !== "all") {
        resources = resources.filter(r => {
          // Check role_target array first
          if (r.role_target && r.role_target.length > 0) {
            return r.role_target.some(rt => rt.toLowerCase().includes(roleFilter.toLowerCase()));
          }
          // Fall back to tags
          return r.tags?.some(t => t.toLowerCase().includes(roleFilter.toLowerCase())) ||
            (roleFilter === "manager" && r.visibility === "manager") ||
            (roleFilter === "field" && (r.visibility === "employee" || r.tags?.some(t => t.toLowerCase().includes("field"))));
        });
      }
      
      // Apply urgency filter (use urgency field first, then fall back to tags)
      if (urgencyFilter !== "all") {
        resources = resources.filter(r => 
          r.urgency?.toLowerCase() === urgencyFilter.toLowerCase() ||
          r.tags?.some(t => t.toLowerCase().includes(urgencyFilter.toLowerCase()))
        );
      }
      
      return resources;
    } else {
      // Browse by Department
      return categoryResources || [];
    }
  }, [viewMode, searchQuery, searchResults, allResources, categoryResources, taskType, roleFilter, urgencyFilter]);

  // Get all unique tags from current resources
  const allTags = Array.from(
    new Set(displayResources?.flatMap((r) => r.tags || []) || [])
  ).sort();

  // Filter by selected tag
  const filteredResources = selectedTag
    ? displayResources?.filter((r) => r.tags?.includes(selectedTag))
    : displayResources;

  const isLoading = viewMode === "quick" 
    ? (searchQuery ? searchLoading : allLoading) 
    : categoryLoading;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {category && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    setViewMode("quick");
                    navigate("/playbook-library");
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {currentCategory?.name || "Playbook Library"}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm truncate">
                  {currentCategory?.description || "Find what you need, fast"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "quick" | "browse")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="quick" className="gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Playbook Access</span>
              <span className="sm:hidden">Quick Access</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Browse by Department</span>
              <span className="sm:hidden">By Dept</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick SOP Access View */}
          <TabsContent value="quick" className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search playbooks by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filters - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Task type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {roleFilters.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  {urgencyFilters.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(taskType !== "all" || roleFilter !== "all" || urgencyFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTaskType("all");
                    setRoleFilter("all");
                    setUrgencyFilter("all");
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Tag Pills */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Badge
                  variant={selectedTag === null ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all text-xs",
                    selectedTag === null && "shadow-glow-sm"
                  )}
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Badge>
                {allTags.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all text-xs",
                      selectedTag === tag && "shadow-glow-sm"
                    )}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Browse by Department View */}
          <TabsContent value="browse" className="mt-4 space-y-4">
            {/* Department Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {/* Master Playbook - Always first, special styling */}
              <Link
                to="/playbook-library/master-playbook"
                className="p-3 sm:p-4 rounded-lg border text-center transition-all bg-primary/5 border-primary/30 hover:border-primary/50 hover:shadow-glow-sm relative"
              >
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs sm:text-sm font-medium text-primary">
                  Master Playbook
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Core Playbooks 1-10
                </p>
                <Badge
                  variant={allCompleted ? "default" : "secondary"}
                  className={cn(
                    "mt-1.5 text-[10px]",
                    allCompleted && "bg-primary text-primary-foreground"
                  )}
                >
                  {allCompleted ? "✓ Complete" : `${completedCount}/${totalCount}`}
                </Badge>
              </Link>

              <Link
                to="/playbook-library/employee-handbook"
                className="p-3 sm:p-4 rounded-lg border text-center transition-all bg-card/50 border-border/50 hover:border-primary/20 hover:bg-primary/5 relative"
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-xs sm:text-sm font-medium">
                  Employee Handbook
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Required acknowledgment
                </p>
                {handbookVersion ? (
                  <Badge
                    variant={handbookAcknowledged ? "default" : "secondary"}
                    className={cn(
                      "mt-1.5 text-[10px]",
                      handbookAcknowledged && "bg-primary text-primary-foreground"
                    )}
                  >
                    {handbookAcknowledged ? "✓ Acknowledged" : "Action required"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    No version yet
                  </Badge>
                )}
              </Link>
              
              {categories?.filter(cat => cat.slug !== 'master-playbook' && cat.slug !== 'employee-handbook').map((cat) => {
                const CatIcon = categoryIcons[cat.slug] || FileText;
                const isActive = category === cat.slug;
                return (
                  <Link
                    key={cat.id}
                    to={`/playbook-library/${cat.slug}`}
                    className={cn(
                      "p-3 sm:p-4 rounded-lg border text-center transition-all",
                      isActive
                        ? "bg-primary/10 border-primary/30 shadow-glow-sm"
                        : "bg-card/50 border-border/50 hover:border-primary/20 hover:bg-primary/5"
                    )}
                  >
                    <CatIcon className={cn("w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5", isActive ? "text-primary" : "text-muted-foreground")} />
                    <p className={cn("text-xs sm:text-sm font-medium truncate", isActive && "text-primary")}>
                      {cat.name}
                    </p>
                  </Link>
                );
              })}
            </div>

            {/* Tag Pills for Browse Mode */}
            {category && allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Badge
                  variant={selectedTag === null ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all text-xs",
                    selectedTag === null && "shadow-glow-sm"
                  )}
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Badge>
                {allTags.slice(0, 6).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all text-xs",
                      selectedTag === tag && "shadow-glow-sm"
                    )}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Resources Grid - Mobile First */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 sm:h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredResources && filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredResources.map((resource) => (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                onClick={() => handleResourceClick(resource)}
                showStatus={showStatusBadges}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No playbooks found</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : selectedTag
                ? `No playbooks match the tag "${selectedTag}"`
                : viewMode === "browse" && !category
                ? "Select a department to view playbooks"
                : "No playbooks in this category yet"}
            </p>
            {(searchQuery || selectedTag || taskType !== "all" || roleFilter !== "all" || urgencyFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                  setTaskType("all");
                  setRoleFilter("all");
                  setUrgencyFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Resource Detail Modal */}
        <ResourceDetailModal
          resource={selectedResource}
          open={modalOpen}
          onOpenChange={setModalOpen}
          categorySlug={category}
        />
      </div>
    </AppLayout>
  );
}
