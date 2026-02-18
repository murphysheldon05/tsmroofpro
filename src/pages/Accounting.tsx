import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, History, DollarSign } from "lucide-react";
import { AccountingPayoutQueue } from "@/components/accounting/AccountingPayoutQueue";
import { AccountingSummaryCards } from "@/components/accounting/AccountingSummaryCards";
import { PayrollCutoffBanner } from "@/components/accounting/PayrollCutoffBanner";

export default function Accounting() {
  const { userDepartment, isAdmin } = useAuth();

  // Only Accounting department and Admin can access
  if (userDepartment !== "Accounting" && !isAdmin) {
    return <Navigate to="/command-center" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        {/* Migration Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Commission tracking has moved to the Commission Tracker for a consolidated view.
          </p>
          <a href="/commission-tracker" className="text-sm font-medium text-primary hover:underline whitespace-nowrap">
            Go to Commission Tracker →
          </a>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Commission payout processing & payroll management
          </p>
        </div>

        {/* Payroll Cutoff Banner */}
        <PayrollCutoffBanner />

        {/* Summary Cards */}
        <AccountingSummaryCards />

        {/* Main Content */}
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto flex-wrap">
            <TabsTrigger value="queue" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <ClipboardList className="h-4 w-4" />
              Payout Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <History className="h-4 w-4" />
              Payout History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-0">
            <AccountingPayoutQueue mode="pending" />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <AccountingPayoutQueue mode="history" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
