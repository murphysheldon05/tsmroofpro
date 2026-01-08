import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle2 } from "lucide-react";

export function ProfileAssignmentsTab() {
  // Placeholder for content assignments - will be connected when content_assignments table is created
  return (
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
  );
}
