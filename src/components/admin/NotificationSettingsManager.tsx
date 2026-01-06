import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mail, Bell, UserPlus } from "lucide-react";
import {
  useNotificationSettings,
  useCreateNotificationSetting,
  useUpdateNotificationSetting,
  useDeleteNotificationSetting,
} from "@/hooks/useNotificationSettings";

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  request_submission: {
    label: "Request Submissions",
    description: "Notified when employees submit requests (commission forms, HR, IT access, etc.)",
  },
};

export function NotificationSettingsManager() {
  const { data: settings, isLoading } = useNotificationSettings();
  const createSetting = useCreateNotificationSetting();
  const updateSetting = useUpdateNotificationSetting();
  const deleteSetting = useDeleteNotificationSetting();

  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    recipient_email: "",
    recipient_name: "",
    notification_type: "request_submission",
  });

  const handleAddRecipient = async () => {
    if (!newRecipient.recipient_email.trim()) {
      return;
    }

    await createSetting.mutateAsync({
      notification_type: newRecipient.notification_type,
      recipient_email: newRecipient.recipient_email.trim().toLowerCase(),
      recipient_name: newRecipient.recipient_name.trim() || undefined,
    });

    setNewRecipient({
      recipient_email: "",
      recipient_name: "",
      notification_type: "request_submission",
    });
    setIsAddingRecipient(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateSetting.mutateAsync({
      id,
      is_active: !currentActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this notification recipient?")) {
      await deleteSetting.mutateAsync(id);
    }
  };

  // Group settings by notification type
  const groupedSettings = settings?.reduce((acc, setting) => {
    if (!acc[setting.notification_type]) {
      acc[setting.notification_type] = [];
    }
    acc[setting.notification_type].push(setting);
    return acc;
  }, {} as Record<string, typeof settings>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Notification Recipients
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who receives email notifications for various events
          </p>
        </div>
        <Dialog open={isAddingRecipient} onOpenChange={setIsAddingRecipient}>
          <DialogTrigger asChild>
            <Button variant="neon">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Recipient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notification Recipient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newRecipient.recipient_name}
                  onChange={(e) =>
                    setNewRecipient({ ...newRecipient, recipient_name: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={newRecipient.recipient_email}
                  onChange={(e) =>
                    setNewRecipient({ ...newRecipient, recipient_email: e.target.value })
                  }
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Notification Type</Label>
                <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-medium">Request Submissions</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receives notifications when employees submit requests
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAddRecipient}
                disabled={!newRecipient.recipient_email.trim() || createSetting.isPending}
                className="w-full"
              >
                {createSetting.isPending ? "Adding..." : "Add Recipient"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notification Types */}
      {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, { label, description }]) => {
        const typeSettings = groupedSettings?.[type] || [];
        
        return (
          <div key={type} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 bg-secondary/30 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{label}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {typeSettings.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recipients configured</p>
                  <p className="text-xs mt-1">Add recipients to receive these notifications</p>
                </div>
              ) : (
                typeSettings.map((setting) => (
                  <div
                    key={setting.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {setting.recipient_name || setting.recipient_email}
                        </p>
                        {setting.recipient_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {setting.recipient_email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={setting.is_active}
                          onCheckedChange={() => handleToggleActive(setting.id, setting.is_active)}
                        />
                        <Badge variant={setting.is_active ? "default" : "secondary"}>
                          {setting.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(setting.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          <strong>Note:</strong> Changes take effect immediately. When an employee submits a request, 
          all active recipients for "Request Submissions" will receive an email notification.
        </p>
      </div>
    </div>
  );
}
