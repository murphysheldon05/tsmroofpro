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
      commission_attachments: {
        Row: {
          commission_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          commission_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          commission_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_attachments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_documents: {
        Row: {
          advance_total: number
          approval_comment: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate: number
          company_profit: number
          contract_total_net: number
          created_at: string
          created_by: string
          dollars_increased: number | null
          final_claim_amount: number | null
          gross_contract_total: number
          id: string
          job_date: string
          job_name_id: string
          labor_cost: number
          material_cost: number
          neg_exp_1: number
          neg_exp_2: number
          neg_exp_3: number
          net_profit: number
          notes: string | null
          op_percent: number
          pos_exp_1: number
          pos_exp_2: number
          pos_exp_3: number
          pos_exp_4: number
          rep_commission: number
          sales_rep: string
          sales_rep_id: string | null
          starting_claim_amount: number | null
          status: string
          supplement_fee: number | null
          supplement_fees_expense: number
          updated_at: string
        }
        Insert: {
          advance_total?: number
          approval_comment?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          company_profit?: number
          contract_total_net?: number
          created_at?: string
          created_by: string
          dollars_increased?: number | null
          final_claim_amount?: number | null
          gross_contract_total?: number
          id?: string
          job_date: string
          job_name_id: string
          labor_cost?: number
          material_cost?: number
          neg_exp_1?: number
          neg_exp_2?: number
          neg_exp_3?: number
          net_profit?: number
          notes?: string | null
          op_percent?: number
          pos_exp_1?: number
          pos_exp_2?: number
          pos_exp_3?: number
          pos_exp_4?: number
          rep_commission?: number
          sales_rep: string
          sales_rep_id?: string | null
          starting_claim_amount?: number | null
          status?: string
          supplement_fee?: number | null
          supplement_fees_expense?: number
          updated_at?: string
        }
        Update: {
          advance_total?: number
          approval_comment?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          company_profit?: number
          contract_total_net?: number
          created_at?: string
          created_by?: string
          dollars_increased?: number | null
          final_claim_amount?: number | null
          gross_contract_total?: number
          id?: string
          job_date?: string
          job_name_id?: string
          labor_cost?: number
          material_cost?: number
          neg_exp_1?: number
          neg_exp_2?: number
          neg_exp_3?: number
          net_profit?: number
          notes?: string | null
          op_percent?: number
          pos_exp_1?: number
          pos_exp_2?: number
          pos_exp_3?: number
          pos_exp_4?: number
          rep_commission?: number
          sales_rep?: string
          sales_rep_id?: string | null
          starting_claim_amount?: number | null
          status?: string
          supplement_fee?: number | null
          supplement_fees_expense?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_reviewers: {
        Row: {
          can_approve: boolean | null
          can_payout: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          can_approve?: boolean | null
          can_payout?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          can_approve?: boolean | null
          can_payout?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      commission_status_log: {
        Row: {
          changed_by: string
          commission_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_by: string
          commission_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_by?: string
          commission_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_status_log_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_submissions: {
        Row: {
          acculynx_job_id: string | null
          advances_paid: number
          approval_stage: string | null
          approved_at: string | null
          approved_by: string | null
          commission_percentage: number
          commission_tier: string | null
          contract_amount: number
          contract_date: string
          created_at: string
          custom_commission_percentage: number | null
          flat_fee_amount: number | null
          gross_commission: number | null
          id: string
          install_completion_date: string | null
          is_flat_fee: boolean | null
          job_address: string
          job_name: string
          job_type: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          net_commission_owed: number | null
          paid_at: string | null
          paid_by: string | null
          payout_batch_id: string | null
          rejection_reason: string | null
          rep_role: string | null
          reviewer_notes: string | null
          roof_type: string
          sales_rep_id: string | null
          sales_rep_name: string | null
          status: string
          subcontractor_name: string | null
          submission_type: string
          submitted_by: string
          supplements_approved: number
          total_job_revenue: number | null
          updated_at: string
        }
        Insert: {
          acculynx_job_id?: string | null
          advances_paid?: number
          approval_stage?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_percentage?: number
          commission_tier?: string | null
          contract_amount?: number
          contract_date: string
          created_at?: string
          custom_commission_percentage?: number | null
          flat_fee_amount?: number | null
          gross_commission?: number | null
          id?: string
          install_completion_date?: string | null
          is_flat_fee?: boolean | null
          job_address: string
          job_name: string
          job_type: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          net_commission_owed?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          rejection_reason?: string | null
          rep_role?: string | null
          reviewer_notes?: string | null
          roof_type: string
          sales_rep_id?: string | null
          sales_rep_name?: string | null
          status?: string
          subcontractor_name?: string | null
          submission_type?: string
          submitted_by: string
          supplements_approved?: number
          total_job_revenue?: number | null
          updated_at?: string
        }
        Update: {
          acculynx_job_id?: string | null
          advances_paid?: number
          approval_stage?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_percentage?: number
          commission_tier?: string | null
          contract_amount?: number
          contract_date?: string
          created_at?: string
          custom_commission_percentage?: number | null
          flat_fee_amount?: number | null
          gross_commission?: number | null
          id?: string
          install_completion_date?: string | null
          is_flat_fee?: boolean | null
          job_address?: string
          job_name?: string
          job_type?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          net_commission_owed?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          rejection_reason?: string | null
          rep_role?: string | null
          reviewer_notes?: string | null
          roof_type?: string
          sales_rep_id?: string | null
          sales_rep_name?: string | null
          status?: string
          subcontractor_name?: string | null
          submission_type?: string
          submitted_by?: string
          supplements_approved?: number
          total_job_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          allowed_op_percentages: number[]
          allowed_profit_splits: number[]
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          allowed_op_percentages?: number[]
          allowed_profit_splits?: number[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          allowed_op_percentages?: number[]
          allowed_profit_splits?: number[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_requests: {
        Row: {
          created_at: string
          documents_requested: string[]
          due_date: string | null
          id: string
          notes: string | null
          recipient_id: string
          recipient_name: string
          recipient_type: string
          requested_by: string | null
        }
        Insert: {
          created_at?: string
          documents_requested: string[]
          due_date?: string | null
          id?: string
          notes?: string | null
          recipient_id: string
          recipient_name: string
          recipient_type: string
          requested_by?: string | null
        }
        Update: {
          created_at?: string
          documents_requested?: string[]
          due_date?: string | null
          id?: string
          notes?: string | null
          recipient_id?: string
          recipient_name?: string
          recipient_type?: string
          requested_by?: string | null
        }
        Relationships: []
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
      department_managers: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          is_team_lead: boolean | null
          manager_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          is_team_lead?: boolean | null
          manager_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          is_team_lead?: boolean | null
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_managers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
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
      notification_routing: {
        Row: {
          created_at: string
          enabled: boolean
          fallback_email: string
          id: string
          notification_type: string
          primary_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          fallback_email: string
          id?: string
          notification_type: string
          primary_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          fallback_email?: string
          id?: string
          notification_type?: string
          primary_role?: string
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
          company_name: string | null
          created_at: string
          data_consent_given: boolean | null
          data_consent_given_at: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          last_login_at: string | null
          must_reset_password: boolean | null
          phone_number: string | null
          requested_department: string | null
          requested_role: string | null
          updated_at: string
          weather_location_lat: number | null
          weather_location_lon: number | null
          weather_location_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          data_consent_given?: boolean | null
          data_consent_given_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          last_login_at?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          requested_department?: string | null
          requested_role?: string | null
          updated_at?: string
          weather_location_lat?: number | null
          weather_location_lon?: number | null
          weather_location_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          data_consent_given?: boolean | null
          data_consent_given_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_login_at?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          requested_department?: string | null
          requested_role?: string | null
          updated_at?: string
          weather_location_lat?: number | null
          weather_location_lon?: number | null
          weather_location_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          assigned_owner: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          next_followup_date: string | null
          notes: string | null
          phone: string
          prospect_type: Database["public"]["Enums"]["prospect_type"]
          source: Database["public"]["Enums"]["prospect_source"]
          stage: Database["public"]["Enums"]["prospect_stage"]
          trade_vendor_type: string | null
          updated_at: string
        }
        Insert: {
          assigned_owner?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          next_followup_date?: string | null
          notes?: string | null
          phone: string
          prospect_type: Database["public"]["Enums"]["prospect_type"]
          source?: Database["public"]["Enums"]["prospect_source"]
          stage?: Database["public"]["Enums"]["prospect_stage"]
          trade_vendor_type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_owner?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string
          prospect_type?: Database["public"]["Enums"]["prospect_type"]
          source?: Database["public"]["Enums"]["prospect_source"]
          stage?: Database["public"]["Enums"]["prospect_stage"]
          trade_vendor_type?: string | null
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
          approved_amount: number | null
          assigned_manager_id: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          manager_approved_at: string | null
          manager_notes: string | null
          rejection_reason: string | null
          status: string | null
          submitted_by: string
          title: string
          total_payout_requested: number | null
          type: string
          updated_at: string
        }
        Insert: {
          approval_stage?: string | null
          approved_amount?: number | null
          assigned_manager_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_notes?: string | null
          rejection_reason?: string | null
          status?: string | null
          submitted_by: string
          title: string
          total_payout_requested?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          approval_stage?: string | null
          approved_amount?: number | null
          assigned_manager_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_notes?: string | null
          rejection_reason?: string | null
          status?: string | null
          submitted_by?: string
          title?: string
          total_payout_requested?: number | null
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
      role_assignments: {
        Row: {
          active: boolean
          assigned_email: string | null
          assigned_user_id: string | null
          backup_email: string | null
          backup_user_id: string | null
          created_at: string
          id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_email?: string | null
          assigned_user_id?: string | null
          backup_email?: string | null
          backup_user_id?: string | null
          created_at?: string
          id?: string
          role_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_email?: string | null
          assigned_user_id?: string | null
          backup_email?: string | null
          backup_user_id?: string | null
          created_at?: string
          id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subcontractors: {
        Row: {
          coi_expiration_date: string | null
          coi_status: Database["public"]["Enums"]["doc_status"]
          company_name: string
          created_at: string
          created_by: string | null
          docs_due_date: string | null
          email: string
          ic_agreement_status: Database["public"]["Enums"]["doc_status"]
          id: string
          internal_rating: number | null
          last_received_date: string | null
          last_requested_date: string | null
          notes: string | null
          phone: string
          primary_contact_name: string
          requested_docs: string[] | null
          service_areas: Database["public"]["Enums"]["service_area"][]
          status: Database["public"]["Enums"]["entity_status"]
          trade_type: Database["public"]["Enums"]["trade_type"]
          updated_at: string
          w9_status: Database["public"]["Enums"]["doc_status"]
        }
        Insert: {
          coi_expiration_date?: string | null
          coi_status?: Database["public"]["Enums"]["doc_status"]
          company_name: string
          created_at?: string
          created_by?: string | null
          docs_due_date?: string | null
          email: string
          ic_agreement_status?: Database["public"]["Enums"]["doc_status"]
          id?: string
          internal_rating?: number | null
          last_received_date?: string | null
          last_requested_date?: string | null
          notes?: string | null
          phone: string
          primary_contact_name: string
          requested_docs?: string[] | null
          service_areas?: Database["public"]["Enums"]["service_area"][]
          status?: Database["public"]["Enums"]["entity_status"]
          trade_type?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          w9_status?: Database["public"]["Enums"]["doc_status"]
        }
        Update: {
          coi_expiration_date?: string | null
          coi_status?: Database["public"]["Enums"]["doc_status"]
          company_name?: string
          created_at?: string
          created_by?: string | null
          docs_due_date?: string | null
          email?: string
          ic_agreement_status?: Database["public"]["Enums"]["doc_status"]
          id?: string
          internal_rating?: number | null
          last_received_date?: string | null
          last_requested_date?: string | null
          notes?: string | null
          phone?: string
          primary_contact_name?: string
          requested_docs?: string[] | null
          service_areas?: Database["public"]["Enums"]["service_area"][]
          status?: Database["public"]["Enums"]["entity_status"]
          trade_type?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          w9_status?: Database["public"]["Enums"]["doc_status"]
        }
        Relationships: []
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
          training_url: string | null
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
          training_url?: string | null
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
          training_url?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_commission_tiers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tier_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_commission_tiers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "commission_tiers"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          account_number: string | null
          coi_expiration_date: string | null
          coi_status: Database["public"]["Enums"]["doc_status"] | null
          created_at: string
          created_by: string | null
          docs_due_date: string | null
          email: string
          ic_agreement_status: Database["public"]["Enums"]["doc_status"] | null
          id: string
          last_received_date: string | null
          last_requested_date: string | null
          notes: string | null
          phone: string
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          primary_contact_name: string
          requested_docs: string[] | null
          service_areas: Database["public"]["Enums"]["service_area"][]
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          vendor_name: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
          w9_status: Database["public"]["Enums"]["doc_status"] | null
        }
        Insert: {
          account_number?: string | null
          coi_expiration_date?: string | null
          coi_status?: Database["public"]["Enums"]["doc_status"] | null
          created_at?: string
          created_by?: string | null
          docs_due_date?: string | null
          email: string
          ic_agreement_status?: Database["public"]["Enums"]["doc_status"] | null
          id?: string
          last_received_date?: string | null
          last_requested_date?: string | null
          notes?: string | null
          phone: string
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          primary_contact_name: string
          requested_docs?: string[] | null
          service_areas?: Database["public"]["Enums"]["service_area"][]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          vendor_name: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          w9_status?: Database["public"]["Enums"]["doc_status"] | null
        }
        Update: {
          account_number?: string | null
          coi_expiration_date?: string | null
          coi_status?: Database["public"]["Enums"]["doc_status"] | null
          created_at?: string
          created_by?: string | null
          docs_due_date?: string | null
          email?: string
          ic_agreement_status?: Database["public"]["Enums"]["doc_status"] | null
          id?: string
          last_received_date?: string | null
          last_requested_date?: string | null
          notes?: string | null
          phone?: string
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          primary_contact_name?: string
          requested_docs?: string[] | null
          service_areas?: Database["public"]["Enums"]["service_area"][]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          vendor_name?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          w9_status?: Database["public"]["Enums"]["doc_status"] | null
        }
        Relationships: []
      }
      warranty_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
          warranty_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          warranty_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_documents_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranty_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_notes_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranty_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_requests: {
        Row: {
          assigned_production_member: string | null
          closeout_photos_uploaded: boolean | null
          created_at: string
          created_by: string | null
          customer_name: string
          date_assigned: string | null
          date_completed: string | null
          date_submitted: string
          id: string
          is_manufacturer_claim_filed: boolean | null
          issue_description: string
          job_address: string
          labor_cost: number | null
          last_status_change_at: string
          manufacturer: string | null
          material_cost: number | null
          original_install_date: string
          original_job_number: string
          priority_level: string
          resolution_summary: string | null
          roof_type: string
          secondary_support: string | null
          source_of_request: string
          status: string
          updated_at: string
          warranty_coverage_description: string
          warranty_expiration_date: string
          warranty_type: string
        }
        Insert: {
          assigned_production_member?: string | null
          closeout_photos_uploaded?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          id?: string
          is_manufacturer_claim_filed?: boolean | null
          issue_description: string
          job_address: string
          labor_cost?: number | null
          last_status_change_at?: string
          manufacturer?: string | null
          material_cost?: number | null
          original_install_date: string
          original_job_number: string
          priority_level?: string
          resolution_summary?: string | null
          roof_type: string
          secondary_support?: string | null
          source_of_request: string
          status?: string
          updated_at?: string
          warranty_coverage_description: string
          warranty_expiration_date: string
          warranty_type: string
        }
        Update: {
          assigned_production_member?: string | null
          closeout_photos_uploaded?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          date_assigned?: string | null
          date_completed?: string | null
          date_submitted?: string
          id?: string
          is_manufacturer_claim_filed?: boolean | null
          issue_description?: string
          job_address?: string
          labor_cost?: number | null
          last_status_change_at?: string
          manufacturer?: string | null
          material_cost?: number | null
          original_install_date?: string
          original_job_number?: string
          priority_level?: string
          resolution_summary?: string | null
          roof_type?: string
          secondary_support?: string | null
          source_of_request?: string
          status?: string
          updated_at?: string
          warranty_coverage_description?: string
          warranty_expiration_date?: string
          warranty_type?: string
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
      can_process_payouts: { Args: { _user_id: string }; Returns: boolean }
      can_view_profile: {
        Args: { _target_id: string; _viewer_id: string }
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
      is_commission_reviewer: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      contact_method: "call" | "text" | "email"
      doc_status: "received" | "missing"
      entity_status: "active" | "on_hold" | "do_not_use"
      prospect_source: "inbound_call" | "referral" | "jobsite_meet" | "other"
      prospect_stage:
        | "new"
        | "contacted"
        | "waiting_docs"
        | "trial_job"
        | "approved"
        | "not_a_fit"
      prospect_type: "subcontractor" | "vendor"
      service_area:
        | "phoenix_metro"
        | "west_valley"
        | "east_valley"
        | "north_valley"
        | "prescott"
        | "other"
      trade_type:
        | "roofing"
        | "tile"
        | "shingle"
        | "foam"
        | "coatings"
        | "metal"
        | "gutters"
        | "drywall"
        | "paint"
        | "other"
      vendor_type:
        | "supplier"
        | "dump"
        | "equipment_rental"
        | "safety"
        | "marketing"
        | "other"
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
      contact_method: ["call", "text", "email"],
      doc_status: ["received", "missing"],
      entity_status: ["active", "on_hold", "do_not_use"],
      prospect_source: ["inbound_call", "referral", "jobsite_meet", "other"],
      prospect_stage: [
        "new",
        "contacted",
        "waiting_docs",
        "trial_job",
        "approved",
        "not_a_fit",
      ],
      prospect_type: ["subcontractor", "vendor"],
      service_area: [
        "phoenix_metro",
        "west_valley",
        "east_valley",
        "north_valley",
        "prescott",
        "other",
      ],
      trade_type: [
        "roofing",
        "tile",
        "shingle",
        "foam",
        "coatings",
        "metal",
        "gutters",
        "drywall",
        "paint",
        "other",
      ],
      vendor_type: [
        "supplier",
        "dump",
        "equipment_rental",
        "safety",
        "marketing",
        "other",
      ],
    },
  },
} as const
