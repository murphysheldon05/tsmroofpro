import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  heading: string;
  intro_text: string;
  button_text: string;
  footer_text: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplate(templateKey: string) {
  return useQuery({
    queryKey: ["email-template", templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_key", templateKey)
        .maybeSingle();

      if (error) throw error;
      return data as EmailTemplate;
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateKey,
      updates,
    }: {
      templateKey: string;
      updates: Partial<Omit<EmailTemplate, "id" | "template_key" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(updates)
        .eq("template_key", templateKey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-template", variables.templateKey] });
      toast.success("Email template updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update email template: " + error.message);
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async ({
      recipientEmail,
      templateKey,
    }: {
      recipientEmail: string;
      templateKey: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: {
          recipient_email: recipientEmail,
          template_key: templateKey,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Test email sent successfully! Check your inbox.");
    },
    onError: (error: any) => {
      toast.error("Failed to send test email: " + error.message);
    },
  });
}
