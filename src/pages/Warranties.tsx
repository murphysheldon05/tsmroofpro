import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarrantyDashboard } from "@/components/warranty/WarrantyDashboard";
import { WarrantyList } from "@/components/warranty/WarrantyList";
import { WarrantyForm } from "@/components/warranty/WarrantyForm";
import { WarrantyDetail } from "@/components/warranty/WarrantyDetail";
import { WarrantyRequest } from "@/hooks/useWarranties";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, LayoutDashboard, List } from "lucide-react";

export default function Warranties() {
  const { role } = useAuth();
  const canCreate = role === "admin" || role === "manager";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);

  const handleEdit = (warranty: WarrantyRequest) => {
    setSelectedWarranty(warranty);
    setIsFormOpen(true);
  };

  const handleView = (warranty: WarrantyRequest) => {
    setSelectedWarranty(warranty);
    setIsDetailOpen(true);
  };

  const handleCreate = () => {
    setSelectedWarranty(null);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setSelectedWarranty(null);
  };

  const handleDetailClose = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) setSelectedWarranty(null);
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warranty Tracker</h1>
            <p className="text-muted-foreground">
              Track and manage roofing warranty requests
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Warranty Request
            </Button>
          )}
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Warranties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <WarrantyDashboard onSelectWarranty={handleView} />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <WarrantyList onEdit={handleEdit} onView={handleView} />
          </TabsContent>
        </Tabs>
      </div>

      <WarrantyForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        warranty={selectedWarranty}
      />

      <WarrantyDetail
        open={isDetailOpen}
        onOpenChange={handleDetailClose}
        warranty={selectedWarranty}
        onEdit={handleEditFromDetail}
      />
    </AppLayout>
  );
}
