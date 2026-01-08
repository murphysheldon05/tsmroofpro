import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";

export function ProfileTrainingTab() {
  // Placeholder for assigned training - will be connected when training assignments are implemented
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          My Training
        </CardTitle>
        <CardDescription>
          View your assigned training modules and progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No training assigned</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Training assignments will appear here when assigned to you
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
