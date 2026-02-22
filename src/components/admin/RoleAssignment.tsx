// ============================================================
// TSM ROOF PRO HUB — RoleAssignment Component
// Admin-only panel to view all users, assign tiers (role)
// and departments.
// ============================================================

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PermissionGate } from '@/components/PermissionGate';
import {
  UserRole,
  Department,
  ROLE_LABELS,
  ROLE_COLORS,
  DEPARTMENT_LABELS,
  ALL_ROLES,
  ALL_DEPARTMENTS,
} from '@/lib/permissions';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  department: Department | null;
  avatar_url?: string | null;
}

// Map DB app_role to 3-tier UserRole
function mapDbRole(dbRole: string | null): UserRole {
  if (!dbRole) return 'user';
  switch (dbRole) {
    case 'admin': return 'admin';
    case 'manager':
    case 'sales_manager': return 'manager';
    default: return 'user';
  }
}

// Map 3-tier UserRole back to DB app_role for storage
function mapToDbRole(tierRole: UserRole): string {
  switch (tierRole) {
    case 'admin': return 'admin';
    case 'manager': return 'manager';
    case 'user': return 'employee';
  }
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function RoleAssignment() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);

    // Fetch profiles and roles in parallel
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, department, avatar_url').order('full_name'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (profilesRes.error || rolesRes.error) {
      setError('Could not load team members.');
      console.error('[RoleAssignment] fetch error:', profilesRes.error || rolesRes.error);
      setLoading(false);
      return;
    }

    const roleMap = new Map<string, string>();
    for (const r of rolesRes.data ?? []) {
      roleMap.set(r.user_id, r.role);
    }

    const merged: TeamMember[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      department: (p.department as Department) ?? null,
      avatar_url: p.avatar_url,
      role: mapDbRole(roleMap.get(p.id) ?? null),
    }));

    setMembers(merged);
    setLoading(false);
  }

  async function updateRole(userId: string, newTier: UserRole) {
    setSaving(userId);
    setError(null);

    const dbRole = mapToDbRole(newTier);

    // Upsert into user_roles
    const { error: deleteErr } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteErr) {
      setError('Failed to update role. Please try again.');
      console.error('[RoleAssignment] delete role error:', deleteErr);
      setSaving(null);
      return;
    }

    const insertData = { user_id: userId, role: dbRole } as any;
    const { error: insertErr } = await supabase
      .from('user_roles')
      .insert(insertData);

    if (insertErr) {
      setError('Failed to update role. Please try again.');
      console.error('[RoleAssignment] insert role error:', insertErr);
      setSaving(null);
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newTier } : m))
    );
    setSuccessId(userId);
    setTimeout(() => setSuccessId(null), 2000);
    setSaving(null);
  }

  async function updateDepartment(userId: string, dept: string) {
    setSaving(userId);
    setError(null);

    const { error } = await supabase
      .from('profiles')
      .update({ department: dept || null })
      .eq('id', userId);

    if (error) {
      setError('Failed to update department. Please try again.');
      console.error('[RoleAssignment] update dept error:', error);
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, department: (dept as Department) || null } : m))
      );
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 2000);
    }

    setSaving(null);
  }

  const filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <PermissionGate
      permission="assignRoles"
      fallback={
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">You don't have permission to manage roles.</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Role & Department Assignment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage access tiers and department routing for all team members.
          </p>
        </div>

        {/* Tier Summary */}
        <div className="grid grid-cols-3 gap-4">
          {ALL_ROLES.map((r) => {
            const count = members.filter((m) => m.role === r).length;
            return (
              <div key={r} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <RoleBadge role={r} />
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {count === 1 ? '1 member' : `${count} members`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No team members found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name ?? ''}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {member.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>

                {/* Name + Email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {member.full_name ?? 'Unnamed'}
                    </span>
                    {successId === member.id && (
                      <span className="text-xs font-medium text-primary">✓ Saved</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>

                {/* Role Selector */}
                <div className="flex-shrink-0">
                  <select
                    value={member.role}
                    disabled={saving === member.id}
                    onChange={(e) => updateRole(member.id, e.target.value as UserRole)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>

                {/* Department Selector */}
                <div className="flex-shrink-0">
                  <select
                    value={member.department ?? ''}
                    disabled={saving === member.id}
                    onChange={(e) => updateDepartment(member.id, e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No Department</option>
                    {ALL_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
                    ))}
                  </select>
                </div>

                {/* Saving Spinner */}
                {saving === member.id && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Role Legend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Tier Reference</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <RoleBadge role="user" />
              <p>View own commissions only. Sales SOPs, production schedule, warranty submissions, training.</p>
            </div>
            <div className="flex items-start gap-2">
              <RoleBadge role="manager" />
              <p>View all commissions (read-only). No approvals. Paul (HR/IT) gets HR notifications via department.</p>
            </div>
            <div className="flex items-start gap-2">
              <RoleBadge role="admin" />
              <p>Full access. Approve/deny commissions, mark paid, OPS compliance, credential vault, user management.</p>
            </div>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}

export default RoleAssignment;
