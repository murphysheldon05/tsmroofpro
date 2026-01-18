import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationsTable } from "@/components/governance/ApplicationsTable";
import { AppAssignmentsTable } from "@/components/governance/AppAssignmentsTable";
import { ChecklistTemplatesManager } from "@/components/governance/ChecklistTemplatesManager";
import { SpreadsheetImporter } from "@/components/governance/SpreadsheetImporter";
import { Button } from "@/components/ui/button";
import { Upload, Laptop, Users, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AppGovernance() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Governance</h1>
            <p className="text-muted-foreground">
              Manage applications, assignments, and access controls
            </p>
          </div>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Import Spreadsheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import from Spreadsheet</DialogTitle>
              </DialogHeader>
              <SpreadsheetImporter onComplete={() => setImportDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="applications" className="gap-2">
              <Laptop className="w-4 h-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <ApplicationsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>App Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <AppAssignmentsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Checklist Templates</CardTitle>
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
