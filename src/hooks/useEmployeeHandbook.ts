import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EmployeeHandbookVersion {
  id: string;
  version: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

/** Current handbook = latest version by uploaded_at */
export function useCurrentHandbook() {
  return useQuery({
    queryKey: ["employee-handbook", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_handbook_versions")
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as EmployeeHandbookVersion | null;
    },
  });
}

/** Signed URL for the current handbook PDF (1 hour expiry for viewing) */
export function useHandbookPdfUrl(version: EmployeeHandbookVersion | null) {
  return useQuery({
    queryKey: ["employee-handbook", "pdf-url", version?.id],
    queryFn: async () => {
      if (!version?.file_path) return null;
      const { data, error } = await supabase.storage
        .from("employee-handbook")
        .createSignedUrl(version.file_path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
    enabled: !!version?.file_path,
  });
}

/** Whether the current user has acknowledged the current handbook version */
export function useHandbookAcknowledgment() {
  const { user } = useAuth();
  const { data: current } = useCurrentHandbook();

  return useQuery({
    queryKey: ["employee-handbook", "acknowledgment", user?.id, current?.id],
    queryFn: async () => {
      if (!user?.id || !current?.id) return null;
      const { data, error } = await supabase
        .from("employee_handbook_acknowledgments")
        .select("id, acknowledged_at")
        .eq("user_id", user.id)
        .eq("handbook_version_id", current.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!current?.id,
    staleTime: 60_000,
  });
}

/** Gate: has user acknowledged current version? (no current version = no gate) */
export function useHandbookGateRequired() {
  const { data: current } = useCurrentHandbook();
  const { data: ack, isLoading } = useHandbookAcknowledgment();

  const hasCurrent = !!current;
  const hasAcknowledged = !!ack;
  const gateRequired = hasCurrent && !hasAcknowledged;
  const isLoadingGate = hasCurrent && (isLoading || (ack === undefined && !ack));

  return {
    currentVersion: current ?? null,
    hasAcknowledged: !!ack,
    gateRequired,
    isLoading: isLoadingGate,
    acknowledgedAt: ack?.acknowledged_at ?? null,
  };
}

/** Acknowledge the current handbook version */
export function useAcknowledgeHandbook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: current } = useCurrentHandbook();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id || !current?.id) throw new Error("No handbook or user");
      const { error } = await supabase
        .from("employee_handbook_acknowledgments")
        .insert({
          user_id: user.id,
          handbook_version_id: current.id,
        });
      if (error) throw error;

      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user.id,
        action: "acknowledge_employee_handbook",
        target_type: "employee_handbook",
        target_id: current.id,
        metadata: { version: current.version },
      }).then(() => {}).catch(() => { /* audit log may be admin-only; acknowledgment already saved */ });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-handbook"] });
      toast.success("Handbook acknowledged.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to acknowledge.");
    },
  });
}

/** Admin: upload new handbook PDF (creates new version, triggers acknowledgment for all) */
export function useUploadEmployeeHandbook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, version }: { file: File; version: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "pdf";
      const filePath = `${Date.now()}_${version.replace(/\s+/g, "-")}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-handbook")
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("employee_handbook_versions")
        .insert({
          version,
          file_path: filePath,
          uploaded_by: user.id,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-handbook"] });
      toast.success("Employee handbook uploaded. All users must acknowledge the new version.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Upload failed.");
    },
  });
}

export interface HandbookAckReportRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  acknowledged_at: string | null;
  handbook_version: string;
}

/** Admin: report of who has / has not acknowledged the current handbook */
export function useHandbookAckReport() {
  const { data: current } = useCurrentHandbook();

  return useQuery({
    queryKey: ["employee-handbook", "report", current?.id],
    queryFn: async (): Promise<HandbookAckReportRow[]> => {
      if (!current) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (profilesError) throw profilesError;

      const { data: acks, error: acksError } = await supabase
        .from("employee_handbook_acknowledgments")
        .select("user_id, acknowledged_at")
        .eq("handbook_version_id", current.id);
      if (acksError) throw acksError;

      const ackMap = new Map(
        (acks || []).map((a) => [a.user_id, a.acknowledged_at as string])
      );

      return (profiles || []).map((p) => ({
        user_id: p.id,
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        acknowledged_at: ackMap.get(p.id) ?? null,
        handbook_version: current.version,
      }));
    },
    enabled: !!current?.id,
  });
}
