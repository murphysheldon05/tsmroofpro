import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserChecklists, useChecklistItems, useUpdateChecklistItem } from "@/hooks/useAppGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};

const itemStatusIcons: Record<string, React.ElementType> = {
  open: Circle,
  blocked: AlertCircle,
  done: CheckCircle2,
};

function ChecklistCard({ checklist }: { checklist: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: items, isLoading: itemsLoading } = useChecklistItems(isExpanded ? checklist.id : "");
  const updateItem = useUpdateChecklistItem();

  const completedCount = items?.filter(i => i.status === "done").length || 0;
  const totalCount = items?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleItem = async (item: any) => {
    const newStatus = item.status === "done" ? "open" : "done";
    await updateItem.mutateAsync({ id: item.id, status: newStatus });
  };

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-lg capitalize">
                {checklist.checklist_type} Checklist
              </CardTitle>
              <CardDescription>
                Created {format(new Date(checklist.created_at), "MMM d, yyyy")}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={statusColors[checklist.status] || statusColors.not_started}
          >
            {checklist.status.replace(/_/g, " ")}
          </Badge>
        </div>
        {isExpanded && totalCount > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount} of {totalCount} completed</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items in this checklist
            </p>
          ) : (
            <div className="space-y-2">
              {items?.map((item) => {
                const StatusIcon = itemStatusIcons[item.status] || Circle;
                const isPastDue = item.due_date && new Date(item.due_date) < new Date() && item.status !== "done";
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      item.status === "done" && "bg-muted/30 opacity-70",
                      item.status === "blocked" && "border-destructive/50 bg-destructive/5",
                      isPastDue && "border-orange-500/50 bg-orange-500/5"
                    )}
                  >
                    <Checkbox
                      checked={item.status === "done"}
                      onCheckedChange={() => handleToggleItem(item)}
                      disabled={updateItem.isPending}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          item.status === "done" && "line-through text-muted-foreground"
                        )}>
                          {item.title}
                        </span>
                        {item.applications && (
                          <Badge variant="outline" className="text-xs">
                            {item.applications.app_name}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {item.due_date && (
                          <span className={cn(isPastDue && "text-orange-500 font-medium")}>
                            Due: {format(new Date(item.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                        {item.owner?.full_name && (
                          <span>Owner: {item.owner.full_name}</span>
                        )}
                      </div>
                    </div>
                    <StatusIcon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      item.status === "done" && "text-green-500",
                      item.status === "blocked" && "text-destructive",
                      item.status === "open" && "text-muted-foreground"
                    )} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function MyChecklists() {
  const { user } = useAuth();
  const { data: checklists, isLoading } = useUserChecklists(user?.id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Checklists</h1>
            <p className="text-muted-foreground mt-1">Your onboarding and offboarding tasks</p>
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Checklists</h1>
          <p className="text-muted-foreground mt-1">
            Your onboarding and offboarding tasks
          </p>
        </div>

        {checklists?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No checklists assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checklists?.map((checklist) => (
              <ChecklistCard key={checklist.id} checklist={checklist} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
