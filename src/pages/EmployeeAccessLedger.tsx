import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeesTable } from "@/components/governance/EmployeesTable";
import { EmployeeDetailDialog } from "@/components/governance/EmployeeDetailDialog";

export default function EmployeeAccessLedger() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Access Ledger</h1>
          <p className="text-muted-foreground">
            View all employee application assignments and checklists
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeesTable onSelectEmployee={setSelectedEmployeeId} />
          </CardContent>
        </Card>

        <EmployeeDetailDialog
          employeeId={selectedEmployeeId}
          open={!!selectedEmployeeId}
          onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
        />
      </div>
    </AppLayout>
  );
}
