import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeLedgerTable } from "@/components/app-governance/EmployeeLedgerTable";
import { EmployeeDetailDrawer } from "@/components/app-governance/EmployeeDetailDrawer";

export default function EmployeeAccessLedger() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Access Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Complete view of all employee app assignments, checklists, and access status
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>
              Click on an employee to view their complete access profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeLedgerTable onSelectEmployee={setSelectedEmployeeId} />
          </CardContent>
        </Card>

        <EmployeeDetailDrawer 
          employeeId={selectedEmployeeId} 
          onClose={() => setSelectedEmployeeId(null)} 
        />
      </div>
    </AppLayout>
  );
}
