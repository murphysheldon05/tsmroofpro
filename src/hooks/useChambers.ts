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

export interface ChamberActivityLog {
  id: string;
  chamber_id: string | null;
  chamber_name: string | null;
  event_id: string;
  event_assignment_id: string | null;
  rep_user_id: string;
  manager_user_id: string | null;
  attended_on: string;
  attendance_confirmed: boolean;
  contacts_made: number;
  inspections_generated: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  rep_name?: string;
}

async function invokeChamberNotification(body: Record<string, unknown>) {
  try {
    await supabase.functions.invoke("send-chamber-notification", { body });
  } catch (error) {
    console.error("Failed to invoke send-chamber-notification", error);
  }
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

      const userIds = [...new Set((data || []).flatMap((a: any) => [a.user_id, a.assigned_by].filter(Boolean)))] as string[];
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
      return { chamberId, userId };
    },
    onSuccess: async ({ chamberId, userId }) => {
      qc.invalidateQueries({ queryKey: ["chamber-assignments"] });
      toast.success("Rep assigned to chamber");
      const { data: chamber } = await (supabase.from as any)("chambers")
        .select("id, name")
        .eq("id", chamberId)
        .maybeSingle();
      await invokeChamberNotification({
        eventType: "chamber_assignment",
        chamberId,
        chamberName: chamber?.name ?? null,
        repUserId: userId,
        actorUserId: user?.id ?? null,
      });
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
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["chamber-events"] });
      toast.success("Event created");
      const { data: chamber } = await (supabase.from as any)("chambers")
        .select("id, name")
        .eq("id", data.chamber_id)
        .maybeSingle();
      await invokeChamberNotification({
        eventType: "chamber_event_created",
        chamberId: data.chamber_id,
        chamberName: chamber?.name ?? null,
        eventId: data.id,
        eventName: data.name,
        eventDate: data.event_date,
        eventTime: data.event_time,
        eventLocation: data.location,
      });
    },
    onError: () => toast.error("Failed to create event"),
  });
}

export function useUpdateChamberEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChamberEvent> & { id: string }) => {
      const { data: updated, error } = await (supabase.from as any)("chamber_events")
        .update(data)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: async (updated) => {
      qc.invalidateQueries({ queryKey: ["chamber-events"] });
      toast.success("Event updated");
      const { data: chamber } = await (supabase.from as any)("chambers")
        .select("id, name")
        .eq("id", updated.chamber_id)
        .maybeSingle();
      await invokeChamberNotification({
        eventType: "chamber_event_updated",
        chamberId: updated.chamber_id,
        chamberName: chamber?.name ?? null,
        eventId: updated.id,
        eventName: updated.name,
        eventDate: updated.event_date,
        eventTime: updated.event_time,
        eventLocation: updated.location,
      });
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

      const userIds = [...new Set((data || []).map((a: any) => a.user_id).filter(Boolean))] as string[];
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

export function useChamberActivityLogs() {
  return useQuery({
    queryKey: ["chamber-activity-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("chamber_activity_logs")
        .select("*")
        .order("attended_on", { ascending: false });
      if (error) throw error;

      const repIds = [...new Set((data ?? []).map((row: any) => row.rep_user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, any> = {};
      if (repIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, manager_id")
          .in("id", repIds);
        profileMap = (profiles ?? []).reduce<Record<string, any>>((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        rep_name: profileMap[row.rep_user_id]?.full_name ?? "Unknown",
      })) as ChamberActivityLog[];
    },
  });
}

export function useMyChamberActivityLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-chamber-activity-logs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from as any)("chamber_activity_logs")
        .select("*")
        .eq("rep_user_id", user.id)
        .order("attended_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChamberActivityLog[];
    },
    enabled: !!user?.id,
  });
}

export function useSubmitChamberActivityLog() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      chamber_id: string | null;
      chamber_name: string | null;
      event_id: string;
      event_assignment_id?: string | null;
      attended_on: string;
      contacts_made: number;
      inspections_generated: number;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("You must be signed in.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("manager_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data, error } = await (supabase.from as any)("chamber_activity_logs")
        .upsert(
          {
            chamber_id: params.chamber_id,
            chamber_name: params.chamber_name,
            event_id: params.event_id,
            event_assignment_id: params.event_assignment_id ?? null,
            rep_user_id: user.id,
            manager_user_id: profile?.manager_id ?? null,
            attended_on: params.attended_on,
            attendance_confirmed: true,
            contacts_made: params.contacts_made,
            inspections_generated: params.inspections_generated,
            notes: params.notes?.trim() ? params.notes.trim() : null,
          },
          { onConflict: "event_id,rep_user_id" },
        )
        .select("*")
        .single();

      if (error) throw error;
      return data as ChamberActivityLog;
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["chamber-activity-logs"] });
      qc.invalidateQueries({ queryKey: ["my-chamber-activity-logs"] });
      toast.success("Chamber activity logged");

      const { data: event } = await (supabase.from as any)("chamber_events")
        .select("id, name")
        .eq("id", data.event_id)
        .maybeSingle();

      await invokeChamberNotification({
        eventType: "chamber_activity_logged",
        chamberId: data.chamber_id,
        chamberName: data.chamber_name,
        eventId: data.event_id,
        eventName: event?.name ?? null,
        repUserId: data.rep_user_id,
        managerUserId: data.manager_user_id,
        actorUserId: user?.id ?? null,
        contactsMade: data.contacts_made,
        inspectionsGenerated: data.inspections_generated,
        notes: data.notes,
      });
    },
    onError: () => toast.error("Failed to log Chamber activity"),
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
