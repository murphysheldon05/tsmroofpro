import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// All available sidebar sections - employees with no permissions get access to all by default
export const SIDEBAR_SECTIONS = [
  { key: "command-center", label: "Command Center", parent: null },
  { key: "message-center", label: "Message Center", parent: null },
  { key: "dashboard", label: "Dashboard", parent: null },
  { key: "sops", label: "SOP Library", parent: null },
  { key: "sops/sales", label: "Sales", parent: "sops" },
  { key: "sops/production", label: "Production", parent: "sops" },
  { key: "sops/supplements", label: "Supplements", parent: "sops" },
  { key: "sops/office-admin", label: "Office Admin", parent: "sops" },
  { key: "sops/accounting", label: "Accounting", parent: "sops" },
  { key: "sops/safety-hr", label: "Safety / HR", parent: "sops" },
  { key: "sops/templates-scripts", label: "Templates", parent: "sops" },
  { key: "training", label: "Training", parent: null },
  { key: "training/new-hire", label: "New Hire", parent: "training" },
  { key: "training/role-training", label: "Role Training", parent: "training" },
  { key: "training/video-library", label: "Video Library", parent: "training" },
  { key: "production", label: "Production", parent: null },
  { key: "production/warranties", label: "Warranty Tracker", parent: "production" },
  { key: "production-calendar", label: "Production Calendar", parent: null },
  { key: "production-calendar/build", label: "Build Schedule", parent: "production-calendar" },
  { key: "production-calendar/delivery", label: "Delivery Schedule", parent: "production-calendar" },
  { key: "tools", label: "Tools & Systems", parent: null },
  { key: "requests", label: "Forms & Requests", parent: null },
  { key: "commissions", label: "Commissions", parent: null },
  { key: "commissions/submissions", label: "Submissions", parent: "commissions" },
  { key: "commissions/documents", label: "Documents", parent: "commissions" },
  { key: "company", label: "Company", parent: null },
  { key: "directory", label: "Team Directory", parent: null },
  { key: "vendors", label: "Subs & Vendors", parent: null },
  { key: "vendors/subcontractors", label: "Sub-Contractors", parent: "vendors" },
  { key: "vendors/contact-list", label: "Contact List", parent: "vendors" },
  { key: "accounting", label: "Accounting", parent: null },
  { key: "training/requests", label: "IT Request", parent: "training" },
  { key: "ops-compliance", label: "Ops Compliance", parent: null },
] as const;

export type SectionKey = (typeof SIDEBAR_SECTIONS)[number]["key"];

export function useUserPermissions(userId?: string) {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("section_key")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data?.map((p) => p.section_key) ?? [];
    },
    enabled: !!userId,
  });
}

export function useCurrentUserPermissions() {
  return useQuery({
    queryKey: ["current-user-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("section_key")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data?.map((p) => p.section_key) ?? [];
    },
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, sections }: { userId: string; sections: string[] }) => {
      // Delete all existing permissions for this user
      const { error: deleteError } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) throw deleteError;
      
      // Insert new permissions if any
      if (sections.length > 0) {
        const { error: insertError } = await supabase
          .from("user_permissions")
          .insert(sections.map((section_key) => ({ user_id: userId, section_key })));
        
        if (insertError) throw insertError;
      }
      
      return sections;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
    },
  });
}

// Sections that managers with custom visibility can be granted (no Commissions accounting, no OPS Compliance)
export const MANAGER_ALLOWED_SECTION_KEYS = [
  "command-center", "dashboard", "sops", "training", "production", "production-calendar",
  "tools", "requests", "company", "directory", "vendors",
] as const;

// Helper: check if a section should be visible based on permissions
// If no permissions are set (empty array), all sections are visible (employees) or managers see all non-admin
// If permissions are set, only those sections are visible
export function isSectionVisible(sectionKey: string, permissions: string[] | null | undefined, role: string | null): boolean {
  // Admins see everything
  if (role === "admin") return true;

  // Managers: if they have custom category visibility (permissions set), only show those sections
  if (role === "manager" && permissions && permissions.length > 0) {
    const section = SIDEBAR_SECTIONS.find((s) => s.key === sectionKey);
    if (!section) return false;
    if (section.parent)
      return permissions.includes(sectionKey) || permissions.includes(section.parent);
    const children = SIDEBAR_SECTIONS.filter((s) => s.parent === sectionKey);
    if (children.length > 0)
      return permissions.includes(sectionKey) || children.some((c) => permissions.includes(c.key));
    return permissions.includes(sectionKey);
  }

  // Managers with no custom permissions see all non-admin sections (admin-only filtered in sidebar)
  if (role === "manager") return true;

  // If permissions is null/undefined or empty, employee sees everything (default)
  if (!permissions || permissions.length === 0) return true;
  
  // Otherwise, check if the section is in the permissions list
  // Also check parent section for sub-items
  const section = SIDEBAR_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return false;
  
  // If this is a child section, check if parent is allowed
  if (section.parent) {
    // Check if the specific child is allowed OR if the parent is allowed
    return permissions.includes(sectionKey) || permissions.includes(section.parent);
  }
  
  // For parent sections, check if parent or any of its children are allowed
  const children = SIDEBAR_SECTIONS.filter((s) => s.parent === sectionKey);
  if (children.length > 0) {
    const hasAnyChild = children.some((c) => permissions.includes(c.key));
    return permissions.includes(sectionKey) || hasAnyChild;
  }
  
  return permissions.includes(sectionKey);
}
