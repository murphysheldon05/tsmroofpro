import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Chamber {
  id: string;
  name: string;
  username: string | null;
  password: string | null;
  has_portal: boolean;
  portal_url: string | null;
  portal_label: string | null;
  created_at: string;
}

export interface ChamberAssignment {
  id: string;
  chamber_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
  user_name?: string;
  user_email?: string;
  assigned_by_name?: string;
}

export interface ChamberEvent {
  id: string;
  chamber_id: string;
  name: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_manual: boolean;
  created_at: string;
  chamber_name?: string;
}

export interface ChamberEventAssignment {
  id: string;
  event_id: string;
  user_id: string;
  assigned_by: string | null;
  status: "assigned" | "confirmed" | "declined";
  note: string | null;
  assigned_at: string;
  user_name?: string;
}

// ─── Chambers ─────────────────────────────────────

export function useChambers() {
  return useQuery({
    queryKey: ["chambers"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("chambers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Chamber[];
    },
  });
}

export function useCreateChamber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chamber: Partial<Chamber>) => {
      const { data, error } = await (supabase.from as any)("chambers")
        .insert(chamber)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chambers"] });
      toast.success("Chamber created");
    },
    onError: () => toast.error("Failed to create chamber"),
  });
}

export function useUpdateChamber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Chamber> & { id: string }) => {
      const { error } = await (supabase.from as any)("chambers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chambers"] });
      toast.success("Chamber updated");
    },
    onError: () => toast.error("Failed to update chamber"),
  });
}

export function useDeleteChamber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("chambers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chambers"] });
      toast.success("Chamber deleted");
    },
    onError: () => toast.error("Failed to delete chamber"),
  });
}

// ─── Chamber Assignments ──────────────────────────

export function useChamberAssignments(chamberId?: string) {
  return useQuery({
    queryKey: ["chamber-assignments", chamberId],
    queryFn: async () => {
      let query = (supabase.from as any)("chamber_assignments").select("*");
      if (chamberId) query = query.eq("chamber_id", chamberId);
      query = query.order("assigned_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).flatMap((a: any) => [a.user_id, a.assigned_by].filter(Boolean)))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        profileMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || p.email || "Unknown";
          return acc;
        }, {});
      }

      return (data || []).map((a: any) => ({
        ...a,
        user_name: profileMap[a.user_id] || "Unknown",
        assigned_by_name: a.assigned_by ? profileMap[a.assigned_by] || "Unknown" : null,
      })) as ChamberAssignment[];
    },
  });
}

export function useAssignRepToChamber() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ chamberId, userId, notes }: { chamberId: string; userId: string; notes?: string }) => {
      const { error } = await (supabase.from as any)("chamber_assignments")
        .insert({
          chamber_id: chamberId,
          user_id: userId,
          assigned_by: user?.id,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-assignments"] });
      toast.success("Rep assigned to chamber");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Rep is already assigned to this chamber");
      } else {
        toast.error("Failed to assign rep");
      }
    },
  });
}

export function useRemoveChamberAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await (supabase.from as any)("chamber_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-assignments"] });
      toast.success("Assignment removed");
    },
    onError: () => toast.error("Failed to remove assignment"),
  });
}

// ─── Chamber Events ───────────────────────────────

export function useChamberEvents(chamberId?: string) {
  return useQuery({
    queryKey: ["chamber-events", chamberId],
    queryFn: async () => {
      let query = (supabase.from as any)("chamber_events").select("*");
      if (chamberId) query = query.eq("chamber_id", chamberId);
      query = query.order("event_date", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;

      // Attach chamber names
      const chamberIds = [...new Set((data || []).map((e: any) => e.chamber_id))];
      let chamberMap: Record<string, string> = {};
      if (chamberIds.length > 0) {
        const { data: chambers } = await (supabase.from as any)("chambers")
          .select("id, name")
          .in("id", chamberIds);
        chamberMap = (chambers || []).reduce((acc: Record<string, string>, c: any) => {
          acc[c.id] = c.name;
          return acc;
        }, {});
      }

      return (data || []).map((e: any) => ({
        ...e,
        chamber_name: chamberMap[e.chamber_id] || "Unknown",
      })) as ChamberEvent[];
    },
  });
}

export function useCreateChamberEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<ChamberEvent>) => {
      const { data, error } = await (supabase.from as any)("chamber_events")
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-events"] });
      toast.success("Event created");
    },
    onError: () => toast.error("Failed to create event"),
  });
}

export function useUpdateChamberEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChamberEvent> & { id: string }) => {
      const { error } = await (supabase.from as any)("chamber_events")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-events"] });
      toast.success("Event updated");
    },
    onError: () => toast.error("Failed to update event"),
  });
}

export function useDeleteChamberEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("chamber_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-events"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });
}

// ─── Chamber Event Assignments ────────────────────

export function useChamberEventAssignments(eventId?: string) {
  return useQuery({
    queryKey: ["chamber-event-assignments", eventId],
    queryFn: async () => {
      let query = (supabase.from as any)("chamber_event_assignments").select("*");
      if (eventId) query = query.eq("event_id", eventId);
      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((a: any) => a.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        profileMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || p.email || "Unknown";
          return acc;
        }, {});
      }

      return (data || []).map((a: any) => ({
        ...a,
        user_name: profileMap[a.user_id] || "Unknown",
      })) as ChamberEventAssignment[];
    },
    enabled: !!eventId,
  });
}

export function useMyEventAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-chamber-event-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from as any)("chamber_event_assignments")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as ChamberEventAssignment[];
    },
    enabled: !!user,
  });
}

export function useAssignRepToEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await (supabase.from as any)("chamber_event_assignments")
        .insert({
          event_id: eventId,
          user_id: userId,
          assigned_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-event-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-chamber-event-assignments"] });
      toast.success("Rep assigned to event");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Rep is already assigned to this event");
      } else {
        toast.error("Failed to assign rep to event");
      }
    },
  });
}

export function useUpdateEventAssignmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "declined" }) => {
      const { error } = await (supabase.from as any)("chamber_event_assignments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamber-event-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-chamber-event-assignments"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });
}

// ─── Stats helper ─────────────────────────────────

export function useChamberStats() {
  const { data: events } = useChamberEvents();
  const { data: assignments } = useChamberAssignments();

  const allEventAssignments = useQuery({
    queryKey: ["all-chamber-event-assignments"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("chamber_event_assignments").select("*");
      if (error) throw error;
      return data as ChamberEventAssignment[];
    },
  });

  const stats = {
    totalChambers: 0,
    totalEvents: events?.length || 0,
    totalAssignments: assignments?.length || 0,
    eventAssignments: {
      assigned: 0,
      confirmed: 0,
      declined: 0,
    },
  };

  const ea = allEventAssignments.data || [];
  stats.eventAssignments.assigned = ea.filter((a) => a.status === "assigned").length;
  stats.eventAssignments.confirmed = ea.filter((a) => a.status === "confirmed").length;
  stats.eventAssignments.declined = ea.filter((a) => a.status === "declined").length;

  return stats;
}
