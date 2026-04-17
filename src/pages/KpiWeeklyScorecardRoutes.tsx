import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import SalesRepScorecard from "@/components/scorecards/SalesRepScorecard";
import SalesManagerScorecard from "@/components/scorecards/SalesManagerScorecard";
import OfficeAdminScorecard from "@/components/scorecards/OfficeAdminScorecard";
import OperationsScorecard from "@/components/scorecards/OperationsScorecard";
import AccountingScorecard from "@/components/scorecards/AccountingScorecard";
import ProductionScorecard from "@/components/scorecards/ProductionScorecard";
import SupplementScorecard from "@/components/scorecards/SupplementScorecard";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayName } from "@/lib/displayName";
import { supabase } from "@/integrations/supabase/client";

interface SalesRepOption {
  id: string;
  name: string;
}

const SALES_MANAGER_OPTIONS = [
  "Jordan Pollei",
  "Conrad Demecs",
];

async function fetchSalesRepOptions(): Promise<SalesRepOption[]> {
  const [{ data: roleRows, error: rolesError }, { data: profileRows, error: profilesError }] =
    await Promise.all([
      (supabase.from as any)("user_roles").select("user_id, role"),
      supabase
        .from("profiles")
        .select("id, full_name, email, employee_status")
        .neq("employee_status", "inactive"),
    ]);

  if (rolesError) throw rolesError;
  if (profilesError) throw profilesError;

  const salesRepIds = new Set(
    (roleRows ?? [])
      .filter((row: { role?: string }) => row.role === "sales_rep")
      .map((row: { user_id: string }) => row.user_id)
  );

  return (profileRows ?? [])
    .filter((profile) => salesRepIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: formatDisplayName(profile.full_name, profile.email) || "Sales Rep",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function SelectionCard({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Card className="max-w-3xl mx-auto border-border/70 bg-card/90">
      <CardContent className="p-4">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </label>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}

export function SalesRepScorecardRoute() {
  const { data: repOptions = [] } = useQuery({
    queryKey: ["weekly-kpi-sales-reps"],
    queryFn: fetchSalesRepOptions,
  });
  const [selectedRepId, setSelectedRepId] = useState("");
  const selectOptions =
    repOptions.length > 0
      ? repOptions.map((option) => ({
          value: option.id,
          label: option.name,
        }))
      : [{ value: "", label: "Sales Rep" }];

  useEffect(() => {
    if (!selectedRepId && repOptions.length > 0) {
      setSelectedRepId(repOptions[0].id);
    }
  }, [repOptions, selectedRepId]);

  const selectedRep = useMemo(
    () => repOptions.find((option) => option.id === selectedRepId) ?? null,
    [repOptions, selectedRepId]
  );

  return (
    <div className="space-y-4">
      <SelectionCard
        label="Sales Rep"
        value={selectedRepId}
        onChange={setSelectedRepId}
        options={selectOptions}
      />
      <SalesRepScorecard
        repId={selectedRep?.id}
        repName={selectedRep?.name ?? "Sales Rep"}
      />
    </div>
  );
}

export function SalesManagerScorecardRoute() {
  const [managerName, setManagerName] = useState(SALES_MANAGER_OPTIONS[0]);

  return (
    <div className="space-y-4">
      <SelectionCard
        label="Sales Manager"
        value={managerName}
        onChange={setManagerName}
        options={SALES_MANAGER_OPTIONS.map((option) => ({
          value: option,
          label: option,
        }))}
      />
      <SalesManagerScorecard managerName={managerName} />
    </div>
  );
}

export function OfficeAdminScorecardRoute() {
  return <OfficeAdminScorecard />;
}

export function OperationsScorecardRoute() {
  return <OperationsScorecard />;
}

export function AccountingScorecardRoute() {
  return <AccountingScorecard />;
}

export function ProductionScorecardRoute() {
  return <ProductionScorecard />;
}

export function SupplementScorecardRoute() {
  return <SupplementScorecard coordinatorName="Supplement Coordinator" />;
}
