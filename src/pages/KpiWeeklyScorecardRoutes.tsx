import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import SalesRepScorecard from "@/components/scorecards/SalesRepScorecard";
import SalesManagerScorecard from "@/components/scorecards/SalesManagerScorecard";
import OfficeAdminScorecard from "@/components/scorecards/OfficeAdminScorecard";
import OperationsScorecard from "@/components/scorecards/OperationsScorecard";
import AccountingScorecard from "@/components/scorecards/AccountingScorecard";
import ProductionScorecard from "@/components/scorecards/ProductionScorecard";
import SupplementScorecard from "@/components/scorecards/SupplementScorecard";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayName } from "@/lib/displayName";
import {
  canAccessWeeklyKpiRoute,
  isWeeklyKpiManagerRole,
} from "@/lib/weeklyKpiAccess";
import { supabase } from "@/integrations/supabase/client";

interface SalesRepOption {
  id: string;
  name: string;
}

const SALES_MANAGER_OPTIONS = [
  "Jordan Pollei",
  "Conrad Demecs",
];

const STATIC_ASSIGNEE_NAMES = [
  "Jordan Pollei",
  "Conrad Demecs",
  "Jayden Abramsen",
  "Manny Madrid",
  "Renice",
  "Tim Brown",
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

async function fetchNamedAssignees(): Promise<Record<string, SalesRepOption>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, employee_status")
    .neq("employee_status", "inactive");

  if (error) throw error;

  return (data ?? []).reduce<Record<string, SalesRepOption>>((acc, profile) => {
    const name = formatDisplayName(profile.full_name, profile.email);
    if (STATIC_ASSIGNEE_NAMES.includes(name)) {
      acc[name] = { id: profile.id, name };
    }
    return acc;
  }, {});
}

function useWeeklyKpiIdentity() {
  const { user, role } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["weekly-kpi-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    user,
    role,
    fullName: profile?.full_name,
    email: profile?.email ?? user?.email ?? null,
    displayName: formatDisplayName(profile?.full_name, profile?.email ?? user?.email),
    isManagerLike: isWeeklyKpiManagerRole(role),
  };
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
  const { user, role, fullName, email, isManagerLike } = useWeeklyKpiIdentity();
  const { data: repOptions = [] } = useQuery({
    queryKey: ["weekly-kpi-sales-reps"],
    queryFn: fetchSalesRepOptions,
  });
  const [selectedRepId, setSelectedRepId] = useState("");
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/sales-rep",
    role,
    fullName,
    email,
  });
  const visibleRepOptions = isManagerLike
    ? repOptions
    : repOptions.filter((option) => option.id === user?.id);
  const selectOptions =
    visibleRepOptions.length > 0
      ? visibleRepOptions.map((option) => ({
          value: option.id,
          label: option.name,
        }))
      : [{ value: "", label: "Sales Rep" }];

  useEffect(() => {
    if (!canAccess) return;
    if (!selectedRepId && visibleRepOptions.length > 0) {
      setSelectedRepId(visibleRepOptions[0].id);
    }
  }, [canAccess, visibleRepOptions, selectedRepId]);

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  const selectedRep = useMemo(
    () => visibleRepOptions.find((option) => option.id === selectedRepId) ?? null,
    [visibleRepOptions, selectedRepId]
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
  const { role, fullName, email, displayName, isManagerLike } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/sales-manager",
    role,
    fullName,
    email,
  });
  const { data: namedAssignees = {} } = useQuery({
    queryKey: ["weekly-kpi-named-assignees"],
    queryFn: fetchNamedAssignees,
  });
  const managerOptions = isManagerLike
    ? SALES_MANAGER_OPTIONS
    : SALES_MANAGER_OPTIONS.filter((option) => option === displayName);
  const [managerName, setManagerName] = useState(managerOptions[0] ?? SALES_MANAGER_OPTIONS[0]);

  useEffect(() => {
    if (!canAccess) return;
    if (!managerOptions.includes(managerName)) {
      setManagerName(managerOptions[0] ?? SALES_MANAGER_OPTIONS[0]);
    }
  }, [canAccess, managerName, managerOptions]);

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return (
    <div className="space-y-4">
      <SelectionCard
        label="Sales Manager"
        value={managerName}
        onChange={setManagerName}
        options={managerOptions.map((option) => ({
          value: option,
          label: option,
        }))}
      />
      <SalesManagerScorecard
        managerName={managerName}
        assignedUserId={namedAssignees[managerName]?.id}
      />
    </div>
  );
}

export function OfficeAdminScorecardRoute() {
  const { role, fullName, email } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/office-admin",
    role,
    fullName,
    email,
  });
  const { data: namedAssignees = {} } = useQuery({
    queryKey: ["weekly-kpi-named-assignees"],
    queryFn: fetchNamedAssignees,
  });

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return <OfficeAdminScorecard assignedUserId={namedAssignees["Jayden Abramsen"]?.id} />;
}

export function OperationsScorecardRoute() {
  const { role, fullName, email } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/operations",
    role,
    fullName,
    email,
  });
  const { data: namedAssignees = {} } = useQuery({
    queryKey: ["weekly-kpi-named-assignees"],
    queryFn: fetchNamedAssignees,
  });

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return <OperationsScorecard assignedUserId={namedAssignees["Manny Madrid"]?.id} />;
}

export function AccountingScorecardRoute() {
  const { role, fullName, email } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/accounting",
    role,
    fullName,
    email,
  });
  const { data: namedAssignees = {} } = useQuery({
    queryKey: ["weekly-kpi-named-assignees"],
    queryFn: fetchNamedAssignees,
  });

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return <AccountingScorecard assignedUserId={namedAssignees["Renice"]?.id} />;
}

export function ProductionScorecardRoute() {
  const { role, fullName, email } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/production",
    role,
    fullName,
    email,
  });
  const { data: namedAssignees = {} } = useQuery({
    queryKey: ["weekly-kpi-named-assignees"],
    queryFn: fetchNamedAssignees,
  });

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return <ProductionScorecard assignedUserId={namedAssignees["Tim Brown"]?.id} />;
}

export function SupplementScorecardRoute() {
  const { role, fullName, email } = useWeeklyKpiIdentity();
  const canAccess = canAccessWeeklyKpiRoute({
    href: "/kpi-scorecards/supplement",
    role,
    fullName,
    email,
  });

  if (!canAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return <SupplementScorecard coordinatorName="Supplement Coordinator" />;
}
