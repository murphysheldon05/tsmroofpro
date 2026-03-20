import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, InboxIcon, Mail, Loader2 } from "lucide-react";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead, useNotificationPreferences, useUpdateNotificationPreferences, type NotificationPreferences } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { toast } from "sonner";

const EMAIL_PREF_LABELS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'email_commission_submitted', label: 'Submission Confirmation', description: 'Email when your commission is submitted' },
  { key: 'email_commission_approved', label: 'Compliance Approved', description: 'Email when your commission passes compliance review' },
  { key: 'email_commission_accounting_approved', label: 'Accounting Approved', description: 'Email when accounting approves your commission for payment' },
  { key: 'email_commission_rejected', label: 'Revision Required', description: 'Email when your commission is sent back for revision' },
  { key: 'email_commission_denied', label: 'Commission Denied', description: 'Email when your commission is permanently denied' },
  { key: 'email_commission_paid', label: 'Commission Paid', description: 'Email when your commission has been paid' },
];

export function ProfileNotificationsTab() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleToggle = (key: keyof NotificationPreferences, current: boolean) => {
    updatePrefs.mutate({ [key]: !current } as any, {
      onSuccess: () => toast.success('Notification preference updated'),
      onError: () => toast.error('Failed to update preference'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Email Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notification Settings
          </CardTitle>
          <CardDescription>
            Choose which commission emails you receive. In-app notifications are always enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prefsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {EMAIL_PREF_LABELS.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3 px-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-0.5 pr-4">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={prefs?.[key] as boolean ?? true}
                    onCheckedChange={() => handleToggle(key, prefs?.[key] as boolean ?? true)}
                    disabled={updatePrefs.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                View your notifications and alerts
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <InboxIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No notifications yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                You'll see your notifications here when you receive them
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] rounded-lg border">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
