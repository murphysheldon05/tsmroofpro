import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Ban, 
  TrendingUp, 
  FileText, 
  CheckCircle,
  LayoutDashboard
} from "lucide-react";

const tabs = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "violations", label: "Violations", icon: AlertTriangle },
  { value: "holds", label: "Holds", icon: Ban },
  { value: "escalations", label: "Escalations", icon: TrendingUp },
  { value: "audit-log", label: "Audit Log", icon: FileText },
  { value: "sops", label: "Master SOPs", icon: ShieldCheck },
  { value: "acknowledgments", label: "Acknowledgments", icon: CheckCircle },
];

export default function OpsCompliance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isOpsCompliance } = useAuth();
  
  const activeTab = searchParams.get("tab") || "dashboard";

  const handleTabChange = (value: string) => {
    if (value === "dashboard") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  // Access check
  if (!isAdmin && !isOpsCompliance) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the Ops Compliance section.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Ops Compliance</h1>
            <p className="text-sm text-muted-foreground">
              Manage violations, holds, escalations, and SOP compliance
            </p>
          </div>
        </div>

        {/* Tab Navigation - Mobile Friendly */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max min-w-full sm:w-full sm:grid sm:grid-cols-7 h-auto p-1 bg-muted/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" />
                  Ops Compliance Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Ops Compliance Dashboard — Loading...</p>
                    <p className="text-sm mt-2">Dashboard widgets will be built in the next phase.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Compliance Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Violations management coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holds Tab */}
          <TabsContent value="holds" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Compliance Holds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Holds management coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalations Tab */}
          <TabsContent value="escalations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Escalations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Escalations management coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Compliance Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Audit log viewer coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Master SOPs Tab */}
          <TabsContent value="sops" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Master SOPs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Master SOP library coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acknowledgments Tab */}
          <TabsContent value="acknowledgments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  SOP Acknowledgments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Acknowledgment tracking coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
