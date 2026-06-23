// Generated from Supabase (project oaqwnjgaypmuafvnfhxv). Regenerate after schema changes:
//   Supabase MCP generate_typescript_types, or
//   npx supabase gen types typescript --project-id oaqwnjgaypmuafvnfhxv > src/types/database.ts
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: string | null
          amount: number
          buyer_id: string | null
          created_at: string
          id: string
          property_id: string
          schedule: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          property_id: string
          schedule?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          property_id?: string
          schedule?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cards: {
        Row: {
          created_at: string
          fields: Json
          id: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_scans: {
        Row: {
          card_id: string
          created_at: string
          device: Json
          geo: Json | null
          id: string
          scanner_id: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          device?: Json
          geo?: Json | null
          id?: string
          scanner_id?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          device?: Json
          geo?: Json | null
          id?: string
          scanner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_scans_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_scans_scanner_id_fkey"
            columns: ["scanner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_shares: {
        Row: {
          card_id: string
          channel: string | null
          created_at: string
          id: string
          token: string | null
        }
        Insert: {
          card_id: string
          channel?: string | null
          created_at?: string
          id?: string
          token?: string | null
        }
        Update: {
          card_id?: string
          channel?: string | null
          created_at?: string
          id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_shares_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_templates: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      commission_ledger: {
        Row: {
          amount: number
          created_at: string
          direction: string
          id: string
          role_id: string | null
          source_ref: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          direction: string
          id?: string
          role_id?: string | null
          source_ref: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          direction?: string
          id?: string
          role_id?: string | null
          source_ref?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          formula: Json
          id: string
          match: Json
          name: string
          priority: number
          scope: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          formula?: Json
          id?: string
          match?: Json
          name: string
          priority?: number
          scope: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          formula?: Json
          id?: string
          match?: Json
          name?: string
          priority?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          created_at: string
          due_at: string
          id: string
          lead_id: string
          note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          due_at: string
          id?: string
          lead_id: string
          note?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          due_at?: string
          id?: string
          lead_id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          active: boolean
          created_at: string
          fields: Json
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fields?: Json
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fields?: Json
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_rules: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          key: string
          name: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      inventory_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          payload: Json
          property_id: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          property_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          property_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact: Json
          created_at: string
          id: string
          owner_id: string
          property_id: string | null
          score: number
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact?: Json
          created_at?: string
          id?: string
          owner_id: string
          property_id?: string | null
          score?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: Json
          created_at?: string
          id?: string
          owner_id?: string
          property_id?: string | null
          score?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: string | null
          status: string
          txn_ref: string | null
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          id?: string
          method?: string | null
          status?: string
          txn_ref?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string | null
          status?: string
          txn_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          attrs: Json
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          attrs?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          attrs?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plot_counters: {
        Row: {
          next: number
          prefix: string
        }
        Insert: {
          next?: number
          prefix: string
        }
        Update: {
          next?: number
          prefix?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          full_name: string | null
          hierarchy_path: unknown
          id: string
          kyc_status: string
          language: string
          parent_id: string | null
          phone: string | null
          phone_verified: boolean
          photo_url: string | null
          referral_code: string
          role_id: string | null
          status: string
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string | null
          hierarchy_path: unknown
          id: string
          kyc_status?: string
          language?: string
          parent_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          photo_url?: string | null
          referral_code: string
          role_id?: string | null
          status?: string
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string | null
          hierarchy_path?: unknown
          id?: string
          kyc_status?: string
          language?: string
          parent_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          photo_url?: string | null
          referral_code?: string
          role_id?: string | null
          status?: string
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          attrs: Json
          code: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          media: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          attrs?: Json
          code: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          media?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          attrs?: Json
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          media?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          attrs: Json
          coordinates: Json | null
          created_at: string
          id: string
          media: Json
          plan_id: string | null
          plot_code: string
          price: number
          project_id: string
          property_type_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attrs?: Json
          coordinates?: Json | null
          created_at?: string
          id?: string
          media?: Json
          plan_id?: string | null
          plot_code: string
          price?: number
          project_id: string
          property_type_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attrs?: Json
          coordinates?: Json | null
          created_at?: string
          id?: string
          media?: Json
          plan_id?: string | null
          plot_code?: string
          price?: number
          project_id?: string
          property_type_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_property_type_id_fkey"
            columns: ["property_type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
        ]
      }
      property_types: {
        Row: {
          active: boolean
          code_prefix: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          code_prefix: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          code_prefix?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          artifact_type: string
          channel: string | null
          created_at: string
          device: Json
          fraud_score: number
          geo: Json | null
          id: string
          prospect_id: string | null
          sharer_id: string | null
          stage: string
          token: string | null
        }
        Insert: {
          artifact_type: string
          channel?: string | null
          created_at?: string
          device?: Json
          fraud_score?: number
          geo?: Json | null
          id?: string
          prospect_id?: string | null
          sharer_id?: string | null
          stage?: string
          token?: string | null
        }
        Update: {
          artifact_type?: string
          channel?: string | null
          created_at?: string
          device?: Json
          fraud_score?: number
          geo?: Json | null
          id?: string
          prospect_id?: string | null
          sharer_id?: string | null
          stage?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_events_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rules: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          key: string
          name: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          level: number
          name: string
          permissions: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          level: number
          name: string
          permissions?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          level?: number
          name?: string
          permissions?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      territories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          id: string
          rail: string | null
          reference: string | null
          requested_at: string
          settled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          rail?: string | null
          reference?: string | null
          requested_at?: string
          settled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          rail?: string | null
          reference?: string | null
          requested_at?: string
          settled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_hierarchy_path: { Args: Record<PropertyKey, never>; Returns: unknown }
      auth_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      auth_role_slug: { Args: Record<PropertyKey, never>; Returns: string }
      complete_onboarding: {
        Args: { p_full_name: string; p_phone: string; p_referral_code?: string }
        Returns: undefined
      }
      gen_referral_code: { Args: Record<PropertyKey, never>; Returns: string }
      next_plot_code: { Args: { p_type: string }; Returns: string }
      request_withdrawal: { Args: { p_amount: number; p_rail?: string }; Returns: string }
      uuid_label: { Args: { p: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
