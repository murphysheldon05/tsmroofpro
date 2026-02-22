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
      admin_audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_value: Json | null
          notes: string | null
          object_id: string
          object_type: string
          performed_by: string
          performed_by_email: string | null
          performed_by_name: string | null
          previous_value: Json | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          object_id: string
          object_type: string
          performed_by: string
          performed_by_email?: string | null
          performed_by_name?: string | null
          previous_value?: Json | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          object_id?: string
          object_type?: string
          performed_by?: string
          performed_by_email?: string | null
          performed_by_name?: string | null
          previous_value?: Json | null
        }
        Relationships: []
      }
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
      app_assignments: {
        Row: {
          app_id: string
          assignment_role: Database["public"]["Enums"]["assignment_role"]
          created_at: string
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
          is_primary: boolean
          permission_level: Database["public"]["Enums"]["permission_level"]
          scope_notes: string | null
          updated_at: string
        }
        Insert: {
          app_id: string
          assignment_role: Database["public"]["Enums"]["assignment_role"]
          created_at?: string
          effective_date?: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          permission_level?: Database["public"]["Enums"]["permission_level"]
          scope_notes?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          assignment_role?: Database["public"]["Enums"]["assignment_role"]
          created_at?: string
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          permission_level?: Database["public"]["Enums"]["permission_level"]
          scope_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_assignments_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          access_method: Database["public"]["Enums"]["app_access_method"] | null
          app_name: string
          category: Database["public"]["Enums"]["app_category"]
          created_at: string
          description: string | null
          id: string
          notes: string | null
          source_of_truth: string | null
          status: string
          updated_at: string
          vendor_contact: string | null
        }
        Insert: {
          access_method?:
            | Database["public"]["Enums"]["app_access_method"]
            | null
          app_name: string
          category?: Database["public"]["Enums"]["app_category"]
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          source_of_truth?: string | null
          status?: string
          updated_at?: string
          vendor_contact?: string | null
        }
        Update: {
          access_method?:
            | Database["public"]["Enums"]["app_access_method"]
            | null
          app_name?: string
          category?: Database["public"]["Enums"]["app_category"]
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          source_of_truth?: string | null
          status?: string
          updated_at?: string
          vendor_contact?: string | null
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
      checklist_items: {
        Row: {
          app_id: string | null
          checklist_id: string
          comments: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence_link: string | null
          id: string
          owner_employee_id: string | null
          status: Database["public"]["Enums"]["checklist_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          checklist_id: string
          comments?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_link?: string | null
          id?: string
          owner_employee_id?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          checklist_id?: string
          comments?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_link?: string | null
          id?: string
          owner_employee_id?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "user_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          app_id: string | null
          applies_to_assignment_role:
            | Database["public"]["Enums"]["assignment_role"]
            | null
          category: Database["public"]["Enums"]["checklist_category"]
          created_at: string
          default_due_days: number
          id: string
          is_active: boolean
          steps: string | null
          template_type: Database["public"]["Enums"]["checklist_type"]
          title: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          applies_to_assignment_role?:
            | Database["public"]["Enums"]["assignment_role"]
            | null
          category?: Database["public"]["Enums"]["checklist_category"]
          created_at?: string
          default_due_days?: number
          id?: string
          is_active?: boolean
          steps?: string | null
          template_type: Database["public"]["Enums"]["checklist_type"]
          title: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          applies_to_assignment_role?:
            | Database["public"]["Enums"]["assignment_role"]
            | null
          category?: Database["public"]["Enums"]["checklist_category"]
          created_at?: string
          default_due_days?: number
          id?: string
          is_active?: boolean
          steps?: string | null
          template_type?: Database["public"]["Enums"]["checklist_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "applications"
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
          accounting_approved_at: string | null
          accounting_approved_by: string | null
          advance_total: number
          approval_comment: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate: number
          company_profit: number
          company_profit_percent: number | null
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
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_id: string | null
          material_cost: number
          neg_exp_1: number
          neg_exp_2: number
          neg_exp_3: number
          neg_exp_4: number | null
          net_profit: number
          notes: string | null
          op_percent: number
          paid_at: string | null
          paid_by: string | null
          pos_exp_1: number
          pos_exp_2: number
          pos_exp_3: number
          pos_exp_4: number
          profit_split_label: string | null
          rep_commission: number
          rep_profit_percent: number | null
          review_completed_at: string | null
          review_completed_by: string | null
          review_completed_notes: string | null
          review_notes: string | null
          review_requested_at: string | null
          review_requested_by: string | null
          review_requested_to: string | null
          review_requested_to_name: string | null
          revision_count: number | null
          revision_reason: string | null
          sales_rep: string
          sales_rep_id: string | null
          scheduled_pay_date: string | null
          starting_claim_amount: number | null
          status: string
          submitted_at: string | null
          submitter_email: string | null
          supplement_fee: number | null
          supplement_fees_expense: number
          updated_at: string
        }
        Insert: {
          accounting_approved_at?: string | null
          accounting_approved_by?: string | null
          advance_total?: number
          approval_comment?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          company_profit?: number
          company_profit_percent?: number | null
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
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_id?: string | null
          material_cost?: number
          neg_exp_1?: number
          neg_exp_2?: number
          neg_exp_3?: number
          neg_exp_4?: number | null
          net_profit?: number
          notes?: string | null
          op_percent?: number
          paid_at?: string | null
          paid_by?: string | null
          pos_exp_1?: number
          pos_exp_2?: number
          pos_exp_3?: number
          pos_exp_4?: number
          profit_split_label?: string | null
          rep_commission?: number
          rep_profit_percent?: number | null
          review_completed_at?: string | null
          review_completed_by?: string | null
          review_completed_notes?: string | null
          review_notes?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          review_requested_to?: string | null
          review_requested_to_name?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          sales_rep: string
          sales_rep_id?: string | null
          scheduled_pay_date?: string | null
          starting_claim_amount?: number | null
          status?: string
          submitted_at?: string | null
          submitter_email?: string | null
          supplement_fee?: number | null
          supplement_fees_expense?: number
          updated_at?: string
        }
        Update: {
          accounting_approved_at?: string | null
          accounting_approved_by?: string | null
          advance_total?: number
          approval_comment?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          company_profit?: number
          company_profit_percent?: number | null
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
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_id?: string | null
          material_cost?: number
          neg_exp_1?: number
          neg_exp_2?: number
          neg_exp_3?: number
          neg_exp_4?: number | null
          net_profit?: number
          notes?: string | null
          op_percent?: number
          paid_at?: string | null
          paid_by?: string | null
          pos_exp_1?: number
          pos_exp_2?: number
          pos_exp_3?: number
          pos_exp_4?: number
          profit_split_label?: string | null
          rep_commission?: number
          rep_profit_percent?: number | null
          review_completed_at?: string | null
          review_completed_by?: string | null
          review_completed_notes?: string | null
          review_notes?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          review_requested_to?: string | null
          review_requested_to_name?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          sales_rep?: string
          sales_rep_id?: string | null
          scheduled_pay_date?: string | null
          starting_claim_amount?: number | null
          status?: string
          submitted_at?: string | null
          submitter_email?: string | null
          supplement_fee?: number | null
          supplement_fees_expense?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_documents_accounting_approved_by_fkey"
            columns: ["accounting_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_documents_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_documents_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_documents_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          amount_paid: number
          applied_bank: number | null
          approved_date: string | null
          check_type: string | null
          created_at: string
          customer: string | null
          earned_comm: number | null
          has_paid: boolean
          id: string
          job: string | null
          job_value: number | null
          notes: string | null
          paid_date: string
          pay_run_id: string | null
          pay_type_id: string
          rep_id: string
        }
        Insert: {
          amount_paid?: number
          applied_bank?: number | null
          approved_date?: string | null
          check_type?: string | null
          created_at?: string
          customer?: string | null
          earned_comm?: number | null
          has_paid?: boolean
          id?: string
          job?: string | null
          job_value?: number | null
          notes?: string | null
          paid_date: string
          pay_run_id?: string | null
          pay_type_id: string
          rep_id: string
        }
        Update: {
          amount_paid?: number
          applied_bank?: number | null
          approved_date?: string | null
          check_type?: string | null
          created_at?: string
          customer?: string | null
          earned_comm?: number | null
          has_paid?: boolean
          id?: string
          job?: string | null
          job_value?: number | null
          notes?: string | null
          paid_date?: string
          pay_run_id?: string | null
          pay_type_id?: string
          rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "commission_pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_pay_type_id_fkey"
            columns: ["pay_type_id"]
            isOneToOne: false
            referencedRelation: "commission_pay_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "commission_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_pay_runs: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          run_date: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          run_date: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          run_date?: string
          status?: string
        }
        Relationships: []
      }
      commission_pay_types: {
        Row: {
          badge_bg: string
          badge_border: string
          badge_text: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          badge_bg?: string
          badge_border?: string
          badge_text?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          badge_bg?: string
          badge_border?: string
          badge_text?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      commission_reps: {
        Row: {
          color: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          user_id?: string | null
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
      commission_revision_log: {
        Row: {
          commission_id: string
          created_at: string
          id: string
          new_amount: number | null
          previous_amount: number | null
          reason: string
          requested_by: string
          requested_by_name: string | null
          requested_by_role: string | null
          revision_number: number
        }
        Insert: {
          commission_id: string
          created_at?: string
          id?: string
          new_amount?: number | null
          previous_amount?: number | null
          reason: string
          requested_by: string
          requested_by_name?: string | null
          requested_by_role?: string | null
          revision_number: number
        }
        Update: {
          commission_id?: string
          created_at?: string
          id?: string
          new_amount?: number | null
          previous_amount?: number | null
          reason?: string
          requested_by?: string
          requested_by_name?: string | null
          requested_by_role?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_revision_log_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_submissions"
            referencedColumns: ["id"]
          },
        ]
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
          admin_approved_at: string | null
          admin_approved_by: string | null
          advances_paid: number
          approval_stage: string | null
          approved_at: string | null
          approved_by: string | null
          commission_approved: number | null
          commission_approved_at: string | null
          commission_approved_by: string | null
          commission_percentage: number
          commission_requested: number | null
          commission_tier: string | null
          contract_amount: number
          contract_date: string
          created_at: string
          custom_commission_percentage: number | null
          denied_at: string | null
          denied_by: string | null
          flat_fee_amount: number | null
          gross_commission: number | null
          id: string
          install_completion_date: string | null
          is_flat_fee: boolean | null
          is_manager_submission: boolean | null
          job_address: string
          job_name: string
          job_type: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          net_commission_owed: number | null
          override_amount: number | null
          override_commission_number: number | null
          override_manager_id: string | null
          paid_at: string | null
          paid_by: string | null
          payout_batch_id: string | null
          rejection_reason: string | null
          rep_role: string | null
          reviewer_notes: string | null
          revision_count: number | null
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
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          advances_paid?: number
          approval_stage?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_approved?: number | null
          commission_approved_at?: string | null
          commission_approved_by?: string | null
          commission_percentage?: number
          commission_requested?: number | null
          commission_tier?: string | null
          contract_amount?: number
          contract_date: string
          created_at?: string
          custom_commission_percentage?: number | null
          denied_at?: string | null
          denied_by?: string | null
          flat_fee_amount?: number | null
          gross_commission?: number | null
          id?: string
          install_completion_date?: string | null
          is_flat_fee?: boolean | null
          is_manager_submission?: boolean | null
          job_address: string
          job_name: string
          job_type: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          net_commission_owed?: number | null
          override_amount?: number | null
          override_commission_number?: number | null
          override_manager_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          rejection_reason?: string | null
          rep_role?: string | null
          reviewer_notes?: string | null
          revision_count?: number | null
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
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          advances_paid?: number
          approval_stage?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_approved?: number | null
          commission_approved_at?: string | null
          commission_approved_by?: string | null
          commission_percentage?: number
          commission_requested?: number | null
          commission_tier?: string | null
          contract_amount?: number
          contract_date?: string
          created_at?: string
          custom_commission_percentage?: number | null
          denied_at?: string | null
          denied_by?: string | null
          flat_fee_amount?: number | null
          gross_commission?: number | null
          id?: string
          install_completion_date?: string | null
          is_flat_fee?: boolean | null
          is_manager_submission?: boolean | null
          job_address?: string
          job_name?: string
          job_type?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          net_commission_owed?: number | null
          override_amount?: number | null
          override_commission_number?: number | null
          override_manager_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          rejection_reason?: string | null
          rep_role?: string | null
          reviewer_notes?: string | null
          revision_count?: number | null
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
        Relationships: [
          {
            foreignKeyName: "commission_submissions_override_manager_id_fkey"
            columns: ["override_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      compliance_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      compliance_escalations: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by_user_id: string | null
          escalated_by_user_id: string | null
          escalated_to_user_id: string | null
          final_decision_notes: string | null
          id: string
          reason: string | null
          status: string | null
          violation_id: string
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decided_by_user_id?: string | null
          escalated_by_user_id?: string | null
          escalated_to_user_id?: string | null
          final_decision_notes?: string | null
          id?: string
          reason?: string | null
          status?: string | null
          violation_id: string
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decided_by_user_id?: string | null
          escalated_by_user_id?: string | null
          escalated_to_user_id?: string | null
          final_decision_notes?: string | null
          id?: string
          reason?: string | null
          status?: string | null
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_escalations_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "compliance_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_holds: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          hold_type: string
          id: string
          job_id: string | null
          reason: string
          related_entity_id: string | null
          related_entity_type: string | null
          released_at: string | null
          released_by_user_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          hold_type: string
          id?: string
          job_id?: string | null
          reason: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          released_at?: string | null
          released_by_user_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          hold_type?: string
          id?: string
          job_id?: string | null
          reason?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          released_at?: string | null
          released_by_user_id?: string | null
          status?: string | null
          user_id?: string | null
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
      compliance_violations: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          department: string | null
          description: string
          escalated_to_user_id: string | null
          escalation_required: boolean | null
          evidence: Json | null
          id: string
          job_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          severity: string
          sop_key: string
          status: string | null
          violation_type: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          department?: string | null
          description: string
          escalated_to_user_id?: string | null
          escalation_required?: boolean | null
          evidence?: Json | null
          id?: string
          job_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity: string
          sop_key: string
          status?: string | null
          violation_type: string
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          department?: string | null
          description?: string
          escalated_to_user_id?: string | null
          escalation_required?: boolean | null
          evidence?: Json | null
          id?: string
          job_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string
          sop_key?: string
          status?: string | null
          violation_type?: string
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
          status: string
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
          status?: string
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
          status?: string
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
      denied_job_numbers: {
        Row: {
          commission_id: string | null
          created_at: string
          denial_reason: string
          denied_at: string
          denied_by: string
          id: string
          job_number: string
        }
        Insert: {
          commission_id?: string | null
          created_at?: string
          denial_reason: string
          denied_at?: string
          denied_by: string
          id?: string
          job_number: string
        }
        Update: {
          commission_id?: string | null
          created_at?: string
          denial_reason?: string
          denied_at?: string
          denied_by?: string
          id?: string
          job_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "denied_job_numbers_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_submissions"
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
      draw_applications: {
        Row: {
          amount: number
          applied_at: string
          applied_by: string
          commission_id: string
          draw_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          applied_at?: string
          applied_by: string
          commission_id: string
          draw_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          applied_at?: string
          applied_by?: string
          commission_id?: string
          draw_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_applications_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deducted_at: string | null
          deducted_from_commission_id: string | null
          denial_reason: string | null
          denied_at: string | null
          denied_by: string | null
          estimated_commission: number | null
          id: string
          job_name: string | null
          job_number: string
          notes: string | null
          paid_at: string | null
          remaining_balance: number | null
          requested_amount: number
          requires_manager_approval: boolean | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deducted_at?: string | null
          deducted_from_commission_id?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          estimated_commission?: number | null
          id?: string
          job_name?: string | null
          job_number: string
          notes?: string | null
          paid_at?: string | null
          remaining_balance?: number | null
          requested_amount: number
          requires_manager_approval?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deducted_at?: string | null
          deducted_from_commission_id?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          estimated_commission?: number | null
          id?: string
          job_name?: string | null
          job_number?: string
          notes?: string | null
          paid_at?: string | null
          remaining_balance?: number | null
          requested_amount?: number
          requires_manager_approval?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      draw_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          commission_id: string | null
          created_at: string
          denial_reason: string | null
          denied_by: string | null
          id: string
          job_number: string | null
          notes: string | null
          paid_off_at: string | null
          reason: string | null
          remaining_balance: number
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          commission_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_by?: string | null
          id?: string
          job_number?: string | null
          notes?: string | null
          paid_off_at?: string | null
          reason?: string | null
          remaining_balance?: number
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          commission_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_by?: string | null
          id?: string
          job_number?: string | null
          notes?: string | null
          paid_off_at?: string | null
          reason?: string | null
          remaining_balance?: number
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draws_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_denied_by_fkey"
            columns: ["denied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      it_requests: {
        Row: {
          app_id: string | null
          assigned_to_id: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["it_request_priority"]
          request_type: Database["public"]["Enums"]["it_request_type"]
          requester_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["it_request_status"]
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          assigned_to_id?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["it_request_priority"]
          request_type: Database["public"]["Enums"]["it_request_type"]
          requester_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["it_request_status"]
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          assigned_to_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["it_request_priority"]
          request_type?: Database["public"]["Enums"]["it_request_type"]
          requester_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["it_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "it_requests_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_requests_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "it_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_sop_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          sop_number: number
          sop_version: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          sop_number: number
          sop_version: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          sop_number?: number
          sop_version?: string
          user_id?: string
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
      offboarding_audit_log: {
        Row: {
          apps_affected: number
          checklist_id: string | null
          created_at: string
          employee_id: string
          executed_by: string
          id: string
          it_request_ids: string[] | null
          notes: string | null
        }
        Insert: {
          apps_affected?: number
          checklist_id?: string | null
          created_at?: string
          employee_id: string
          executed_by: string
          id?: string
          it_request_ids?: string[] | null
          notes?: string | null
        }
        Update: {
          apps_affected?: number
          checklist_id?: string | null
          created_at?: string
          employee_id?: string
          executed_by?: string
          id?: string
          it_request_ids?: string[] | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_audit_log_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "user_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_audit_log_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to_role: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to_role?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to_role?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_at: string
          invited_by: string | null
          link_accessed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          link_accessed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          link_accessed_at?: string | null
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
          commission_admin_only: boolean
          commission_tier_id: string | null
          company_name: string | null
          created_at: string
          data_consent_given: boolean | null
          data_consent_given_at: string | null
          department: string | null
          department_id: string | null
          email: string | null
          employee_status: string | null
          end_date: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          job_title: string | null
          last_login_at: string | null
          manager_id: string | null
          must_reset_password: boolean | null
          phone_number: string | null
          requested_department: string | null
          requested_role: string | null
          role_title: string | null
          start_date: string | null
          updated_at: string
          weather_location_lat: number | null
          weather_location_lon: number | null
          weather_location_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          commission_admin_only?: boolean
          commission_tier_id?: string | null
          company_name?: string | null
          created_at?: string
          data_consent_given?: boolean | null
          data_consent_given_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          employee_status?: string | null
          end_date?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          manager_id?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          requested_department?: string | null
          requested_role?: string | null
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
          weather_location_lat?: number | null
          weather_location_lon?: number | null
          weather_location_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          commission_admin_only?: boolean
          commission_tier_id?: string | null
          company_name?: string | null
          created_at?: string
          data_consent_given?: boolean | null
          data_consent_given_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          employee_status?: string | null
          end_date?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          manager_id?: string | null
          must_reset_password?: boolean | null
          phone_number?: string | null
          requested_department?: string | null
          requested_role?: string | null
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
          weather_location_lat?: number | null
          weather_location_lon?: number | null
          weather_location_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_commission_tier_id_fkey"
            columns: ["commission_tier_id"]
            isOneToOne: false
            referencedRelation: "commission_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          archived_at: string | null
          archived_by: string | null
          body: string | null
          category_id: string | null
          common_mistakes: string[] | null
          created_at: string
          description: string | null
          effective_date: string | null
          file_path: string | null
          id: string
          last_updated_by: string | null
          owner_id: string | null
          owner_role: string | null
          published_at: string | null
          published_by: string | null
          purpose: string | null
          role_target: string[] | null
          status: Database["public"]["Enums"]["sop_status"]
          tags: string[] | null
          task_type: string | null
          title: string
          updated_at: string
          urgency: string | null
          url: string | null
          version: string | null
          view_count: number | null
          visibility: Database["public"]["Enums"]["app_role"]
          when_to_use: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          body?: string | null
          category_id?: string | null
          common_mistakes?: string[] | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          last_updated_by?: string | null
          owner_id?: string | null
          owner_role?: string | null
          published_at?: string | null
          published_by?: string | null
          purpose?: string | null
          role_target?: string[] | null
          status?: Database["public"]["Enums"]["sop_status"]
          tags?: string[] | null
          task_type?: string | null
          title: string
          updated_at?: string
          urgency?: string | null
          url?: string | null
          version?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["app_role"]
          when_to_use?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          body?: string | null
          category_id?: string | null
          common_mistakes?: string[] | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          last_updated_by?: string | null
          owner_id?: string | null
          owner_role?: string | null
          published_at?: string | null
          published_by?: string | null
          purpose?: string | null
          role_target?: string[] | null
          status?: Database["public"]["Enums"]["sop_status"]
          tags?: string[] | null
          task_type?: string | null
          title?: string
          updated_at?: string
          urgency?: string | null
          url?: string | null
          version?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["app_role"]
          when_to_use?: string | null
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
      role_onboarding_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          ip_address: string | null
          section_id: string
          sop_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          section_id: string
          sop_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          section_id?: string
          sop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_onboarding_acknowledgments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "role_onboarding_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_onboarding_acknowledgments_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "role_onboarding_sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_onboarding_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_onboarding_completions: {
        Row: {
          completed_at: string
          electronic_signature: string
          id: string
          signature_date: string
          sop_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          electronic_signature: string
          id?: string
          signature_date?: string
          sop_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          electronic_signature?: string
          id?: string
          signature_date?: string
          sop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_onboarding_completions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "role_onboarding_sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_onboarding_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_onboarding_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          is_acknowledgment_required: boolean
          section_number: number
          section_type: string
          sop_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_acknowledgment_required?: boolean
          section_number: number
          section_type?: string
          sop_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_acknowledgment_required?: boolean
          section_number?: number
          section_type?: string
          sop_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_onboarding_sections_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "role_onboarding_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      role_onboarding_sops: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          id: string
          is_active: boolean
          role: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          role: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean
          role?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_onboarding_sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_manager_overrides: {
        Row: {
          commission_id: string
          commission_number: number
          created_at: string
          id: string
          net_profit: number
          override_amount: number
          override_percentage: number
          sales_manager_id: string
          sales_rep_id: string
        }
        Insert: {
          commission_id: string
          commission_number: number
          created_at?: string
          id?: string
          net_profit?: number
          override_amount?: number
          override_percentage?: number
          sales_manager_id: string
          sales_rep_id: string
        }
        Update: {
          commission_id?: string
          commission_number?: number
          created_at?: string
          id?: string
          net_profit?: number
          override_amount?: number
          override_percentage?: number
          sales_manager_id?: string
          sales_rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_manager_overrides_sales_manager_id_fkey"
            columns: ["sales_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_manager_overrides_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_rep_override_tracking: {
        Row: {
          approved_commission_count: number
          created_at: string
          id: string
          manually_adjusted_at: string | null
          manually_adjusted_by: string | null
          override_phase_complete: boolean
          sales_rep_id: string
          updated_at: string
        }
        Insert: {
          approved_commission_count?: number
          created_at?: string
          id?: string
          manually_adjusted_at?: string | null
          manually_adjusted_by?: string | null
          override_phase_complete?: boolean
          sales_rep_id: string
          updated_at?: string
        }
        Update: {
          approved_commission_count?: number
          created_at?: string
          id?: string
          manually_adjusted_at?: string | null
          manually_adjusted_by?: string | null
          override_phase_complete?: boolean
          sales_rep_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_rep_override_tracking_manually_adjusted_by_fkey"
            columns: ["manually_adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_rep_override_tracking_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      sop_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          device_info: string | null
          document_url: string | null
          id: string
          ip_address: string | null
          method: string | null
          signature_data: string | null
          signed_name: string | null
          sop_key: string
          user_id: string
          version: string
        }
        Insert: {
          acknowledged_at?: string | null
          device_info?: string | null
          document_url?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          signature_data?: string | null
          signed_name?: string | null
          sop_key: string
          user_id: string
          version: string
        }
        Update: {
          acknowledged_at?: string | null
          device_info?: string | null
          document_url?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          signature_data?: string | null
          signed_name?: string | null
          sop_key?: string
          user_id?: string
          version?: string
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
      today_deliveries: {
        Row: {
          acculynx_job_url: string
          address_full: string
          created_at: string
          id: string
          job_id: string
          job_name: string
          last_synced_at: string
          map_url_google: string | null
          map_url_primary: string
          scheduled_datetime: string
          source_event_id: string
        }
        Insert: {
          acculynx_job_url: string
          address_full: string
          created_at?: string
          id?: string
          job_id: string
          job_name: string
          last_synced_at?: string
          map_url_google?: string | null
          map_url_primary: string
          scheduled_datetime: string
          source_event_id: string
        }
        Update: {
          acculynx_job_url?: string
          address_full?: string
          created_at?: string
          id?: string
          job_id?: string
          job_name?: string
          last_synced_at?: string
          map_url_google?: string | null
          map_url_primary?: string
          scheduled_datetime?: string
          source_event_id?: string
        }
        Relationships: []
      }
      today_labor: {
        Row: {
          acculynx_job_url: string
          address_full: string
          created_at: string
          id: string
          job_id: string
          job_name: string
          last_synced_at: string
          map_url_google: string | null
          map_url_primary: string
          roof_type: string | null
          scheduled_datetime: string
          source_event_id: string
          squares: number | null
        }
        Insert: {
          acculynx_job_url: string
          address_full: string
          created_at?: string
          id?: string
          job_id: string
          job_name: string
          last_synced_at?: string
          map_url_google?: string | null
          map_url_primary: string
          roof_type?: string | null
          scheduled_datetime: string
          source_event_id: string
          squares?: number | null
        }
        Update: {
          acculynx_job_url?: string
          address_full?: string
          created_at?: string
          id?: string
          job_id?: string
          job_name?: string
          last_synced_at?: string
          map_url_google?: string | null
          map_url_primary?: string
          roof_type?: string | null
          scheduled_datetime?: string
          source_event_id?: string
          squares?: number | null
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
      training_document_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      training_documents: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_checklists: {
        Row: {
          checklist_type: Database["public"]["Enums"]["checklist_type"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["checklist_status"]
        }
        Insert: {
          checklist_type: Database["public"]["Enums"]["checklist_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
        }
        Update: {
          checklist_type?: Database["public"]["Enums"]["checklist_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
        }
        Relationships: [
          {
            foreignKeyName: "user_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_tutorial_completions: {
        Row: {
          completed_at: string
          created_at: string
          dismissed: boolean
          id: string
          last_step_index: number | null
          page_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          last_step_index?: number | null
          page_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          last_step_index?: number | null
          page_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tutorial_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          mention_responded: boolean | null
          mentioned_users: string[] | null
          note: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mention_responded?: boolean | null
          mentioned_users?: string[] | null
          note: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mention_responded?: boolean | null
          mentioned_users?: string[] | null
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
          closed_by: string | null
          closed_date: string | null
          closeout_photos_uploaded: boolean | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_notified_of_completion: boolean | null
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
          original_install_date: string | null
          original_job_number: string
          priority_level: string
          resolution_summary: string | null
          roof_type: string
          secondary_support: string | null
          source_of_request: string
          status: string
          updated_at: string
          warranty_coverage_description: string | null
          warranty_expiration_date: string | null
          warranty_type: string
        }
        Insert: {
          assigned_production_member?: string | null
          closed_by?: string | null
          closed_date?: string | null
          closeout_photos_uploaded?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_notified_of_completion?: boolean | null
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
          original_install_date?: string | null
          original_job_number: string
          priority_level?: string
          resolution_summary?: string | null
          roof_type: string
          secondary_support?: string | null
          source_of_request: string
          status?: string
          updated_at?: string
          warranty_coverage_description?: string | null
          warranty_expiration_date?: string | null
          warranty_type: string
        }
        Update: {
          assigned_production_member?: string | null
          closed_by?: string | null
          closed_date?: string | null
          closeout_photos_uploaded?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_notified_of_completion?: boolean | null
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
          original_install_date?: string | null
          original_job_number?: string
          priority_level?: string
          resolution_summary?: string | null
          roof_type?: string
          secondary_support?: string | null
          source_of_request?: string
          status?: string
          updated_at?: string
          warranty_coverage_description?: string | null
          warranty_expiration_date?: string | null
          warranty_type?: string
        }
        Relationships: []
      }
      warranty_watchers: {
        Row: {
          created_at: string
          id: string
          user_id: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_watchers_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranty_requests"
            referencedColumns: ["id"]
          },
        ]
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
      is_active_employee: { Args: { _user_id: string }; Returns: boolean }
      is_commission_reviewer: { Args: { _user_id: string }; Returns: boolean }
      is_ops_compliance: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_access_method:
        | "sso_microsoft"
        | "sso_google"
        | "vendor_login"
        | "api_key"
        | "other"
      app_category:
        | "crm"
        | "accounting"
        | "communications"
        | "suppliers"
        | "financing"
        | "training"
        | "marketing"
        | "storage"
        | "social"
        | "productivity"
        | "other"
      app_role:
        | "admin"
        | "manager"
        | "employee"
        | "ops_compliance"
        | "sales_rep"
        | "sales_manager"
        | "accounting"
        | "user"
      assignment_role:
        | "business_owner"
        | "system_admin"
        | "onboarding_owner"
        | "access_monitor"
        | "it_triage_owner"
        | "operator"
        | "profile_owner"
        | "external_vendor"
      checklist_category: "access" | "training" | "security" | "compliance"
      checklist_item_status: "open" | "blocked" | "done"
      checklist_status: "not_started" | "in_progress" | "completed"
      checklist_type: "onboarding" | "offboarding"
      contact_method: "call" | "text" | "email"
      doc_status: "received" | "missing"
      employee_status: "active" | "pending" | "inactive"
      entity_status: "active" | "on_hold" | "do_not_use"
      it_request_priority: "cant_work" | "workaround" | "nice_to_have"
      it_request_status:
        | "new"
        | "in_progress"
        | "waiting_on_vendor"
        | "resolved"
      it_request_type: "access" | "issue" | "change" | "training"
      permission_level:
        | "top_tier_admin"
        | "admin"
        | "standard_user"
        | "limited_user"
        | "none"
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
      sop_status: "draft" | "live" | "archived"
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
      app_access_method: [
        "sso_microsoft",
        "sso_google",
        "vendor_login",
        "api_key",
        "other",
      ],
      app_category: [
        "crm",
        "accounting",
        "communications",
        "suppliers",
        "financing",
        "training",
        "marketing",
        "storage",
        "social",
        "productivity",
        "other",
      ],
      app_role: [
        "admin",
        "manager",
        "employee",
        "ops_compliance",
        "sales_rep",
        "sales_manager",
        "accounting",
        "user",
      ],
      assignment_role: [
        "business_owner",
        "system_admin",
        "onboarding_owner",
        "access_monitor",
        "it_triage_owner",
        "operator",
        "profile_owner",
        "external_vendor",
      ],
      checklist_category: ["access", "training", "security", "compliance"],
      checklist_item_status: ["open", "blocked", "done"],
      checklist_status: ["not_started", "in_progress", "completed"],
      checklist_type: ["onboarding", "offboarding"],
      contact_method: ["call", "text", "email"],
      doc_status: ["received", "missing"],
      employee_status: ["active", "pending", "inactive"],
      entity_status: ["active", "on_hold", "do_not_use"],
      it_request_priority: ["cant_work", "workaround", "nice_to_have"],
      it_request_status: [
        "new",
        "in_progress",
        "waiting_on_vendor",
        "resolved",
      ],
      it_request_type: ["access", "issue", "change", "training"],
      permission_level: [
        "top_tier_admin",
        "admin",
        "standard_user",
        "limited_user",
        "none",
      ],
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
      sop_status: ["draft", "live", "archived"],
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
