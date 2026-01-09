export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string
          created_by: string | null
          crew_id: string | null
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_calendar_events_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          button_text: string
          created_at: string
          footer_text: string | null
          heading: string
          id: string
          intro_text: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          footer_text?: string | null
          heading: string
          id?: string
          intro_text: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          footer_text?: string | null
          heading?: string
          id?: string
          intro_text?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      new_hire_access_credentials: {
        Row: {
          access_type: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          invite_sent: boolean | null
          new_hire_id: string
          notes: string | null
          password: string | null
          updated_at: string
        }
        Insert: {
          access_type: string
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          new_hire_id: string
          notes?: string | null
          password?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          new_hire_id?: string
          notes?: string | null
          password?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "new_hire_access_credentials_new_hire_id_fkey"
            columns: ["new_hire_id"]
            isOneToOne: false
            referencedRelation: "new_hires"
            referencedColumns: ["id"]
          },
        ]
      }
      new_hires: {
        Row: {
          created_at: string
          full_name: string
          id: string
          notes: string | null
          personal_email: string
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          required_access: string[] | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          personal_email: string
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          required_access?: string[] | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          personal_email?: string
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          required_access?: string[] | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_type: string
          recipient_email: string
          recipient_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_type: string
          recipient_email: string
          recipient_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_type?: string
          recipient_email?: string
          recipient_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      production_calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string
          created_by: string | null
          crew_id: string | null
          description: string | null
          end_date: string | null
          event_category: string
          id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          description?: string | null
          end_date?: string | null
          event_category?: string
          id?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          description?: string | null
          end_date?: string | null
          event_category?: string
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_calendar_events_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          last_login_at: string | null
          must_reset_password: boolean | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          last_login_at?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_login_at?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_types: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          approval_stage: string | null
          assigned_manager_id: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          manager_approved_at: string | null
          manager_notes: string | null
          status: string | null
          submitted_by: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          approval_stage?: string | null
          assigned_manager_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_notes?: string | null
          status?: string | null
          submitted_by: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          approval_stage?: string | null
          assigned_manager_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_notes?: string | null
          status?: string | null
          submitted_by?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          body: string | null
          category_id: string | null
          created_at: string
          description: string | null
          effective_date: string | null
          file_path: string | null
          id: string
          owner_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
          version: string | null
          view_count: number | null
          visibility: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          body?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          owner_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
          version?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          body?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          owner_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
          version?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          manager_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          manager_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          manager_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          android_app_url: string | null
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          ios_app_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          url: string
        }
        Insert: {
          android_app_url?: string | null
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          ios_app_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          android_app_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          ios_app_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          section_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_resource_file: {
        Args: { file_path: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "employee"],
    },
  },
} as const
