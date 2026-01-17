import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationsTable } from "@/components/app-governance/ApplicationsTable";
import { AppAssignmentsTable } from "@/components/app-governance/AppAssignmentsTable";
import { ChecklistTemplatesManager } from "@/components/app-governance/ChecklistTemplatesManager";
import { AppWindow, Users, FileCheck } from "lucide-react";

export default function AppGovernance() {
  const [activeTab, setActiveTab] = useState("applications");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">App Governance</h1>
          <p className="text-muted-foreground mt-1">
            Manage company applications, ownership assignments, and access policies
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="applications" className="gap-2">
              <AppWindow className="w-4 h-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <Users className="w-4 h-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Applications</CardTitle>
                <CardDescription>
                  All applications and systems used by the company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>App Assignments</CardTitle>
                <CardDescription>
                  Ownership and access roles for each application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppAssignmentsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Checklist Templates</CardTitle>
                <CardDescription>
                  Templates for onboarding and offboarding checklists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChecklistTemplatesManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
