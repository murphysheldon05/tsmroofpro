import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, InboxIcon } from "lucide-react";

export function ProfileNotificationsTab() {
  // Placeholder for notifications - will be connected when notifications table is created
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          View your notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <InboxIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No notifications yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            You'll see your notifications here when you receive them
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
