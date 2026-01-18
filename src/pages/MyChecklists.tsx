import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useMyChecklists, useUpdateChecklistItem } from "@/hooks/useUserChecklists";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};

const itemStatusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  done: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function MyChecklists() {
  const { user } = useAuth();
  const { data: checklists, isLoading } = useMyChecklists(user?.id);
  const updateItem = useUpdateChecklistItem();
  const [expandedChecklists, setExpandedChecklists] = useState<string[]>([]);

  const toggleChecklist = (id: string) => {
    setExpandedChecklists((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleItem = (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "open" : "done";
    updateItem.mutate({ id: itemId, status: newStatus as "open" | "blocked" | "done" });
  };

  const calculateProgress = (items: any[] | undefined) => {
    if (!items || items.length === 0) return 0;
    const done = items.filter((item) => item.status === "done").length;
    return Math.round((done / items.length) * 100);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Checklists</h1>
          <p className="text-muted-foreground">
            Track your onboarding and offboarding tasks
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !checklists || checklists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Checklists</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have any active checklists. Checklists will appear here when you're onboarded to new applications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checklists.map((checklist) => {
              const progress = calculateProgress(checklist.checklist_items);
              const isExpanded = expandedChecklists.includes(checklist.id);

              return (
                <Card key={checklist.id}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleChecklist(checklist.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {checklist.checklist_type === "onboarding" ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-500" />
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
                          <div className="flex items-center gap-3">
                            <Badge className={statusColors[checklist.status]}>
                              {checklist.status.replace("_", " ")}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="border-t pt-4">
                        {checklist.checklist_items && checklist.checklist_items.length > 0 ? (
                          <div className="space-y-3">
                            {checklist.checklist_items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={item.status === "done"}
                                  onCheckedChange={() => handleToggleItem(item.id, item.status)}
                                  disabled={updateItem.isPending}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`font-medium ${
                                        item.status === "done" ? "line-through text-muted-foreground" : ""
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                    <Badge variant="outline" className={itemStatusColors[item.status]}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  {item.due_date && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Due: {format(new Date(item.due_date), "MMM d, yyyy")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            No items in this checklist yet.
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
