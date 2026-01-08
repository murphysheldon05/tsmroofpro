import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, Bell, FileText, GraduationCap, ClipboardList } from "lucide-react";
import { ProfileInfoTab } from "@/components/profile/ProfileInfoTab";
import { ProfileSecurityTab } from "@/components/profile/ProfileSecurityTab";
import { ProfileNotificationsTab } from "@/components/profile/ProfileNotificationsTab";
import { ProfileFilesTab } from "@/components/profile/ProfileFilesTab";
import { ProfileTrainingTab } from "@/components/profile/ProfileTrainingTab";
import { ProfileAssignmentsTab } from "@/components/profile/ProfileAssignmentsTab";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("info");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 h-auto p-1">
            <TabsTrigger value="info" className="flex items-center gap-2 py-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Personal Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden">Security</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2 py-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2 py-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Training</span>
              <span className="sm:hidden">Training</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2 py-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">My Files</span>
              <span className="sm:hidden">Files</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <ProfileInfoTab />
          </TabsContent>

          <TabsContent value="security">
            <ProfileSecurityTab />
          </TabsContent>

          <TabsContent value="assignments">
            <ProfileAssignmentsTab />
          </TabsContent>

          <TabsContent value="training">
            <ProfileTrainingTab />
          </TabsContent>

          <TabsContent value="notifications">
            <ProfileNotificationsTab />
          </TabsContent>

          <TabsContent value="files">
            <ProfileFilesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
