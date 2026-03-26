import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ScorecardTemplate,
  ScorecardKpi,
  ScorecardAssignment,
  ScorecardSubmission,
  ScorecardKpiInsert,
  BonusTier,
} from "@/lib/kpiTypes";
import { toDateString } from "@/lib/kpiTypes";

const KEYS = {
  templates: ["scorecard-templates"] as const,
  template: (id: string) => ["scorecard-template", id] as const,
  kpis: (templateId: string) => ["scorecard-kpis", templateId] as const,
  assignments: (templateId?: string) =>
    templateId
      ? (["scorecard-assignments", templateId] as const)
      : (["scorecard-assignments"] as const),
  assignmentsForReviewer: ["scorecard-assignments-reviewer"] as const,
  assignmentsForEmployee: ["scorecard-assignments-employee"] as const,
  submissions: (assignmentId: string) =>
    ["scorecard-submissions", assignmentId] as const,
  recentSubmissions: ["scorecard-recent-submissions"] as const,
  profiles: ["scorecard-profiles"] as const,
};

// ─── Templates ───────────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorecard_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScorecardTemplate[];
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.template(id ?? ""),
    queryFn: async () => {
      if (!id || id === "new") return null;
      const { data, error } = await supabase
        .from("scorecard_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ScorecardTemplate | null;
    },
    enabled: !!id && id !== "new",
  });
}

export function useTemplateKpis(templateId: string | undefined) {
  return useQuery({
    queryKey: KEYS.kpis(templateId ?? ""),
    queryFn: async () => {
      if (!templateId || templateId === "new") return [];
      const { data, error } = await supabase
        .from("scorecard_kpis")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScorecardKpi[];
    },
    enabled: !!templateId && templateId !== "new",
  });
}

// ─── Template mutations ─────────────────────────────────────────────────────

export function useSaveTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      name: string;
      description: string;
      review_frequency: string;
      status: string;
      has_bonus: boolean;
      bonus_tiers: BonusTier[] | null;
      bonus_period: string;
      kpis: Omit<ScorecardKpiInsert, "template_id">[];
    }) => {
      const isNew = !params.id || params.id === "new";
      let templateId = params.id;

      if (isNew) {
        const { data, error } = await supabase
          .from("scorecard_templates")
          .insert({
            name: params.name,
            description: params.description || null,
            review_frequency: params.review_frequency,
            status: params.status,
            has_bonus: params.has_bonus,
            bonus_tiers: params.has_bonus ? (params.bonus_tiers as any) : null,
            bonus_period: params.bonus_period,
            created_by: user?.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      } else {
        const { error } = await supabase
          .from("scorecard_templates")
          .update({
            name: params.name,
            description: params.description || null,
            review_frequency: params.review_frequency,
            status: params.status,
            has_bonus: params.has_bonus,
            bonus_tiers: params.has_bonus ? (params.bonus_tiers as any) : null,
            bonus_period: params.bonus_period,
          })
          .eq("id", templateId!);
        if (error) throw error;
      }

      // Replace KPIs: delete existing, insert new
      if (!isNew) {
        const { error: delErr } = await supabase
          .from("scorecard_kpis")
          .delete()
          .eq("template_id", templateId!);
        if (delErr) throw delErr;
      }

      if (params.kpis.length > 0) {
        const rows = params.kpis.map((k, i) => ({
          template_id: templateId!,
          name: k.name,
          full_name: k.full_name || null,
          description: k.description || null,
          scoring_guide: k.scoring_guide as any,
          sort_order: i,
        }));
        const { error: kpiErr } = await supabase
          .from("scorecard_kpis")
          .insert(rows);
        if (kpiErr) throw kpiErr;
      }

      return templateId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

// ─── Assignments ────────────────────────────────────────────────────────────

export function useAssignments(templateId?: string) {
  return useQuery({
    queryKey: KEYS.assignments(templateId),
    queryFn: async () => {
      let q = supabase
        .from("scorecard_assignments")
        .select("*")
        .neq("status", "removed")
        .order("created_at", { ascending: false });
      if (templateId) q = q.eq("template_id", templateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ScorecardAssignment[];
    },
  });
}

export function useMyReviewAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.assignmentsForReviewer,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("scorecard_assignments")
        .select("*")
        .eq("status", "active")
        .contains("reviewer_ids", [user.id]);
      if (error) throw error;
      return (data ?? []) as ScorecardAssignment[];
    },
    enabled: !!user?.id,
  });
}

export function useMyEmployeeAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.assignmentsForEmployee,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("scorecard_assignments")
        .select("*")
        .eq("status", "active")
        .eq("employee_id", user.id);
      if (error) throw error;
      return (data ?? []) as ScorecardAssignment[];
    },
    enabled: !!user?.id,
  });
}

export function useSaveAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      template_id: string;
      employee_id: string;
      reviewer_ids: string[];
      status?: string;
    }) => {
      if (params.id) {
        const { error } = await supabase
          .from("scorecard_assignments")
          .update({
            employee_id: params.employee_id,
            reviewer_ids: params.reviewer_ids,
            status: params.status ?? "active",
          })
          .eq("id", params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scorecard_assignments")
          .insert({
            template_id: params.template_id,
            employee_id: params.employee_id,
            reviewer_ids: params.reviewer_ids,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecard-assignments"] });
    },
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scorecard_assignments")
        .update({ status: "removed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecard-assignments"] });
    },
  });
}

// ─── Submissions ────────────────────────────────────────────────────────────

export function useSubmissions(assignmentId: string | undefined) {
  return useQuery({
    queryKey: KEYS.submissions(assignmentId ?? ""),
    queryFn: async () => {
      if (!assignmentId) return [];
      const { data, error } = await supabase
        .from("scorecard_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScorecardSubmission[];
    },
    enabled: !!assignmentId,
  });
}

export function useRecentSubmissions() {
  return useQuery({
    queryKey: KEYS.recentSubmissions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorecard_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ScorecardSubmission[];
    },
  });
}

export function useSubmitScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      assignment_id: string;
      reviewer_id: string;
      period_start: Date;
      period_end: Date;
      scores: Record<string, number>;
      average: number;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from("scorecard_submissions")
        .upsert(
          {
            assignment_id: params.assignment_id,
            reviewer_id: params.reviewer_id,
            period_start: toDateString(params.period_start),
            period_end: toDateString(params.period_end),
            scores: params.scores as any,
            average: params.average,
            notes: params.notes || null,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,reviewer_id,period_start" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as ScorecardSubmission;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: KEYS.submissions(vars.assignment_id),
      });
      qc.invalidateQueries({ queryKey: KEYS.recentSubmissions });
    },
  });
}

// ─── Profiles (for user pickers) ────────────────────────────────────────────

export function useProfiles() {
  return useQuery({
    queryKey: KEYS.profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Aggregation helpers ────────────────────────────────────────────────────

export function useAssignmentCountsByTemplate() {
  const { data: assignments } = useAssignments();
  const counts: Record<string, number> = {};
  assignments?.forEach((a) => {
    counts[a.template_id] = (counts[a.template_id] || 0) + 1;
  });
  return counts;
}
