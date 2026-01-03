import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SearchBar } from "@/components/SearchBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { useResources, useCategories } from "@/hooks/useResources";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Hammer,
  FileCode,
  Building2,
  Calculator,
  Shield,
  FileText,
} from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  sales: TrendingUp,
  production: Hammer,
  supplements: FileCode,
  "office-admin": Building2,
  accounting: Calculator,
  "safety-hr": Shield,
  "templates-scripts": FileText,
};

export default function SOPLibrary() {
  const { category } = useParams<{ category: string }>();
  const { data: resources, isLoading } = useResources(category);
  const { data: categories } = useCategories();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const currentCategory = categories?.find((c) => c.slug === category);
  const Icon = category ? categoryIcons[category] || FileText : FileText;

  // Get all unique tags from resources
  const allTags = Array.from(
    new Set(resources?.flatMap((r) => r.tags || []) || [])
  ).sort();

  // Filter resources by selected tag
  const filteredResources = selectedTag
    ? resources?.filter((r) => r.tags?.includes(selectedTag))
    : resources;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {currentCategory?.name || "SOP Library"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {currentCategory?.description || "Browse all standard operating procedures"}
                </p>
              </div>
            </div>
            <SearchBar className="w-full lg:w-80" />
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={category || "all"} onValueChange={() => {}}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all",
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
                    "cursor-pointer transition-all",
                    selectedTag === tag && "shadow-glow-sm"
                  )}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredResources && filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
            <p className="text-muted-foreground">
              {selectedTag
                ? `No resources match the tag "${selectedTag}"`
                : "No resources in this category yet"}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
