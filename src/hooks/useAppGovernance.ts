import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Application {
  id: string;
  app_name: string;
  category: string;
  source_of_truth: string | null;
  description: string | null;
  access_method: string | null;
  vendor_contact: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AppAssignment {
  id: string;
  app_id: string;
  employee_id: string;
  assignment_role: string;
  permission_level: string;
  scope_notes: string | null;
  effective_date: string;
  end_date: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  applications?: Application;
  profiles?: { id: string; full_name: string | null; email: string | null };
}

export interface ChecklistTemplate {
  id: string;
  template_type: string;
  applies_to_assignment_role: string | null;
  app_id: string | null;
  title: string;
  steps: string | null;
  category: string;
  default_due_days: number;
  is_active: boolean;
}

export interface UserChecklist {
  id: string;
  employee_id: string;
  checklist_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  notes: string | null;
  profiles?: { full_name: string | null; email: string | null };
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  app_id: string | null;
  title: string;
  description: string | null;
  owner_employee_id: string | null;
  due_date: string | null;
  status: string;
  evidence_link: string | null;
  comments: string | null;
  applications?: Application;
  owner?: { full_name: string | null; email: string | null };
}

export interface ITRequest {
  id: string;
  requester_id: string;
  app_id: string | null;
  request_type: string;
  priority: string;
  description: string;
  status: string;
  assigned_to_id: string | null;
  created_at: string;
  resolved_at: string | null;
  applications?: Application;
  requester?: { full_name: string | null; email: string | null };
  assigned_to?: { full_name: string | null; email: string | null };
}

type AppCategory = "crm" | "accounting" | "communications" | "suppliers" | "financing" | "training" | "marketing" | "storage" | "social" | "productivity" | "other";
type AppAccessMethod = "sso_microsoft" | "sso_google" | "vendor_login" | "api_key" | "other";
type AssignmentRole = "business_owner" | "system_admin" | "onboarding_owner" | "access_monitor" | "it_triage_owner" | "operator" | "profile_owner" | "external_vendor";
type PermissionLevel = "top_tier_admin" | "admin" | "standard_user" | "limited_user" | "none";
type ChecklistItemStatus = "open" | "blocked" | "done";
type ITRequestType = "access" | "issue" | "change" | "training";
type ITRequestPriority = "cant_work" | "workaround" | "nice_to_have";
type ITRequestStatus = "new" | "in_progress" | "waiting_on_vendor" | "resolved";

// Applications hooks
export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("app_name");
      if (error) throw error;
      return data as Application[];
    },
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (app: { app_name: string; category?: AppCategory; source_of_truth?: string; description?: string; access_method?: AppAccessMethod; vendor_contact?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("applications")
        .insert(app)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({ title: "Application created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating application", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; app_name?: string; category?: AppCategory; source_of_truth?: string; description?: string; access_method?: AppAccessMethod; vendor_contact?: string; notes?: string; status?: string }) => {
      const { data, error } = await supabase
        .from("applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({ title: "Application updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating application", description: error.message, variant: "destructive" });
    },
  });
}

// App Assignments hooks
export function useAppAssignments(appId?: string, employeeId?: string) {
  return useQuery({
    queryKey: ["app-assignments", appId, employeeId],
    queryFn: async () => {
      let query = supabase
        .from("app_assignments")
        .select(`
          *,
          applications (*),
          profiles!app_assignments_employee_id_fkey (id, full_name, email)
        `)
        .is("end_date", null)
        .order("created_at", { ascending: false });

      if (appId) query = query.eq("app_id", appId);
      if (employeeId) query = query.eq("employee_id", employeeId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AppAssignment[];
    },
  });
}

export function useCreateAppAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignment: { app_id: string; employee_id: string; assignment_role: AssignmentRole; permission_level?: PermissionLevel; scope_notes?: string; is_primary?: boolean }) => {
      const { data, error } = await supabase
        .from("app_assignments")
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      toast({ title: "Assignment created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating assignment", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAppAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; assignment_role?: AssignmentRole; permission_level?: PermissionLevel; scope_notes?: string; is_primary?: boolean; end_date?: string }) => {
      const { data, error } = await supabase
        .from("app_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      toast({ title: "Assignment updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating assignment", description: error.message, variant: "destructive" });
    },
  });
}

// User Checklists hooks
export function useUserChecklists(employeeId?: string) {
  return useQuery({
    queryKey: ["user-checklists", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("user_checklists")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (employeeId) query = query.eq("employee_id", employeeId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as UserChecklist[];
    },
  });
}

export function useChecklistItems(checklistId: string) {
  return useQuery({
    queryKey: ["checklist-items", checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_items")
        .select(`
          *,
          applications (*)
        `)
        .eq("checklist_id", checklistId)
        .order("created_at");
      if (error) throw error;
      return data as unknown as ChecklistItem[];
    },
    enabled: !!checklistId,
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: ChecklistItemStatus; comments?: string; evidence_link?: string }) => {
      const { data, error } = await supabase
        .from("checklist_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      toast({ title: "Item updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    },
  });
}

// IT Requests hooks
export function useITRequests(userId?: string) {
  return useQuery({
    queryKey: ["it-requests", userId],
    queryFn: async () => {
      let query = supabase
        .from("it_requests")
        .select(`
          *,
          applications (*)
        `)
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.or(`requester_id.eq.${userId},assigned_to_id.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ITRequest[];
    },
  });
}

export function useCreateITRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: { requester_id: string; app_id?: string | null; request_type: ITRequestType; priority: ITRequestPriority; description: string; status?: ITRequestStatus }) => {
      const { data, error } = await supabase
        .from("it_requests")
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["it-requests"] });
      toast({ title: "IT Request created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating request", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateITRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: ITRequestStatus; resolved_at?: string | null; assigned_to_id?: string }) => {
      const { data, error } = await supabase
        .from("it_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["it-requests"] });
      toast({ title: "Request updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating request", description: error.message, variant: "destructive" });
    },
  });
}

// Checklist generation
export function useGenerateChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      checklistType, 
      createdBy 
    }: { 
      employeeId: string; 
      checklistType: "onboarding" | "offboarding"; 
      createdBy: string;
    }) => {
      // Create the user checklist
      const { data: checklist, error: checklistError } = await supabase
        .from("user_checklists")
        .insert({
          employee_id: employeeId,
          checklist_type: checklistType,
          status: "not_started" as const,
          created_by: createdBy,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Get templates
      const { data: templates, error: templatesError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("template_type", checklistType)
        .eq("is_active", true);

      if (templatesError) throw templatesError;

      // Get employee's app assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("app_assignments")
        .select("*, applications(*)")
        .eq("employee_id", employeeId)
        .is("end_date", null);

      if (assignmentsError) throw assignmentsError;

      // Generate checklist items
      const items: Array<{
        checklist_id: string;
        app_id: string | null;
        title: string;
        description: string | null;
        due_date: string;
        status: "open";
      }> = [];

      // Add global template items
      const globalTemplates = templates?.filter(t => !t.app_id) || [];
      globalTemplates.forEach(template => {
        items.push({
          checklist_id: checklist.id,
          app_id: null,
          title: template.title,
          description: template.steps,
          due_date: new Date(Date.now() + template.default_due_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "open" as const,
        });
      });

      // Add app-specific items for each assignment
      assignments?.forEach(assignment => {
        const appTemplates = templates?.filter(t => t.app_id === assignment.app_id) || [];
        if (appTemplates.length === 0) {
          // Create default app-specific item
          const action = checklistType === "onboarding" ? "Set up" : "Remove";
          items.push({
            checklist_id: checklist.id,
            app_id: assignment.app_id,
            title: `${action} access: ${(assignment.applications as any)?.app_name || "Unknown App"}`,
            description: checklistType === "onboarding" 
              ? "Create account, assign roles, verify login"
              : "Disable account, transfer ownership, verify removal",
            due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "open" as const,
          });
        } else {
          appTemplates.forEach(template => {
            items.push({
              checklist_id: checklist.id,
              app_id: assignment.app_id,
              title: template.title,
              description: template.steps,
              due_date: new Date(Date.now() + template.default_due_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              status: "open" as const,
            });
          });
        }
      });

      // Insert all items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("checklist_items")
          .insert(items);

        if (itemsError) throw itemsError;
      }

      return checklist;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      toast({ 
        title: `${variables.checklistType === "onboarding" ? "Onboarding" : "Offboarding"} checklist generated` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error generating checklist", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

// One-click offboarding
export function useOneClickOffboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const generateChecklist = useGenerateChecklist();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      executedBy 
    }: { 
      employeeId: string; 
      executedBy: string;
    }) => {
      // 1. Update employee status to inactive
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          employee_status: "inactive",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", employeeId);

      if (profileError) throw profileError;

      // 2. Get employee's assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("app_assignments")
        .select("*, applications(*)")
        .eq("employee_id", employeeId)
        .is("end_date", null);

      if (assignmentsError) throw assignmentsError;

      // 3. Generate offboarding checklist
      const checklist = await generateChecklist.mutateAsync({
        employeeId,
        checklistType: "offboarding",
        createdBy: executedBy,
      });

      // 4. Create IT requests for each app
      const itRequestIds: string[] = [];
      
      if (assignments && assignments.length > 0) {
        for (const assignment of assignments) {
          const { data: request, error: requestError } = await supabase
            .from("it_requests")
            .insert({
              requester_id: executedBy,
              app_id: assignment.app_id,
              request_type: "access" as const,
              priority: "cant_work" as const,
              description: `Offboard employee: disable/remove access from ${(assignment.applications as any)?.app_name || "Unknown App"}, transfer ownership, verify audit.`,
              status: "new" as const,
            })
            .select()
            .single();

          if (!requestError && request) {
            itRequestIds.push(request.id);
          }
        }
      }

      // 5. Create audit log entry
      const { error: auditError } = await supabase
        .from("offboarding_audit_log")
        .insert({
          employee_id: employeeId,
          executed_by: executedBy,
          apps_affected: assignments?.length || 0,
          checklist_id: checklist.id,
          it_request_ids: itRequestIds,
          notes: `One-click offboarding executed. ${assignments?.length || 0} apps affected.`,
        });

      if (auditError) throw auditError;

      return { 
        checklist, 
        itRequestIds, 
        appsAffected: assignments?.length || 0 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["it-requests"] });
      toast({ 
        title: "Offboarding initiated",
        description: `${data.appsAffected} apps affected. ${data.itRequestIds.length} IT requests created.`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error during offboarding", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
