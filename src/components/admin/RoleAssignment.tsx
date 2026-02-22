import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PermissionGate } from "@/components/PermissionGate";
import {
  UserRole,
  Department,
  ROLE_LABELS,
  ROLE_COLORS,
  DEPARTMENT_LABELS,
  ALL_ROLES,
  ALL_DEPARTMENTS,
} from "@/lib/permissions";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  department: Department | null;
  avatar_url?: string | null;
}

function mapDbRole(dbRole: string | null): UserRole {
  if (!dbRole) return "user";
  switch (dbRole) {
    case "admin": return "admin";
    case "manager":
    case "sales_manager": return "manager";
    default: return "user";
  }
}

function mapToDbRole(tier: UserRole): string {
  switch (tier) {
    case "admin": return "admin";
    case "manager": return "manager";
    case "user": return "employee";
  }
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function Avatar({ name, role }: { name: string | null; role: UserRole }) {
  const colors: Record<UserRole, string> = {
    admin: "bg-emerald-100 text-emerald-700",
    manager: "bg-blue-100 text-blue-700",
    user: "bg-slate-100 text-slate-600",
  };
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${colors[role]}`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function RoleAssignment() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, department, avatar_url").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error || rolesRes.error) {
      setError("Could not load team members.");
      setLoading(false);
      return;
    }

    const roleMap = new Map<string, string>();
    for (const r of rolesRes.data ?? []) {
      roleMap.set(r.user_id, r.role);
    }

    setMembers(
      (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        department: (p.department as Department) ?? null,
        avatar_url: p.avatar_url,
        role: mapDbRole(roleMap.get(p.id) ?? null),
      }))
    );
    setLoading(false);
  }

  async function updateRole(userId: string, newTier: UserRole) {
    setSaving(userId);
    setError(null);
    const dbRole = mapToDbRole(newTier);

    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { setError("Failed to update role."); setSaving(null); return; }

    const insertData = { user_id: userId, role: dbRole } as any;
    const { error: insErr } = await supabase.from("user_roles").insert(insertData);
    if (insErr) { setError("Failed to update role."); setSaving(null); return; }

    setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: newTier } : m)));
    setSuccessId(userId);
    setTimeout(() => setSuccessId(null), 1800);
    setSaving(null);
  }

  async function updateDepartment(userId: string, dept: string) {
    setSaving(userId);
    setError(null);
    const { error } = await supabase.from("profiles").update({ department: dept || null }).eq("id", userId);
    if (error) { setError("Failed to update department."); }
    else {
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, department: (dept as Department) || null } : m)));
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 1800);
    }
    setSaving(null);
  }

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const counts = ALL_ROLES.reduce((acc, r) => ({
    ...acc, [r]: members.filter((m) => m.role === r).length,
  }), {} as Record<string, number>);

  return (
    <PermissionGate
      permission="assignRoles"
      fallback={
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">You don't have permission to manage roles.</p>
        </div>
      }
    >
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Role & Department Assignment</h1>
              <p className="text-sm text-muted-foreground">Manage access tiers and notification routing for all team members.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Admin View
            </div>
          </div>

          {/* Tier Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {ALL_ROLES.map((r) => (
              <div key={r} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <RoleBadge role={r} />
                  <span className="text-2xl font-bold text-foreground">{counts[r] ?? 0}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(counts[r] ?? 0) === 1 ? "1 member" : `${counts[r] ?? 0} members`}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | "all")}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Tiers</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-[40px_1fr_120px_160px] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div />
                <div>Member</div>
                <div>Tier</div>
                <div>Department</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No members found.</p>
                ) : (
                  filtered.map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-1 sm:grid-cols-[40px_1fr_120px_160px] items-center gap-3 sm:gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      {/* Avatar */}
                      <Avatar name={member.full_name} role={member.role} />

                      {/* Name + Email */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{member.full_name}</p>
                          {successId === member.id && (
                            <span className="whitespace-nowrap text-[10px] font-semibold text-primary animate-in fade-in">✓ Saved</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      </div>

                      {/* Role Selector */}
                      <select
                        value={member.role}
                        disabled={saving === member.id}
                        onChange={(e) => updateRole(member.id, e.target.value as UserRole)}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full disabled:opacity-50"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>

                      {/* Department Selector */}
                      <select
                        value={member.department ?? ""}
                        disabled={saving === member.id}
                        onChange={(e) => updateDepartment(member.id, e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full disabled:opacity-50"
                      >
                        <option value="">No Department</option>
                        {ALL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Tier Reference</h3>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <RoleBadge role="user" />
                <p>Own commissions only. Sales SOPs, production schedule, warranty submissions, and training.</p>
              </div>
              <div className="flex items-start gap-2">
                <RoleBadge role="manager" />
                <p>View all commissions (read-only). No approvals. Department tag routes notifications — Paul gets HR alerts.</p>
              </div>
              <div className="flex items-start gap-2">
                <RoleBadge role="admin" />
                <p>Full access. Approve/deny commissions, mark paid, OPS compliance, credential vault, user management.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PermissionGate>
  );
}

export default RoleAssignment;
