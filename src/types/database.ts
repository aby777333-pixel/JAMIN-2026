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
      academy_courses: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string
          pass_mark: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string
          pass_mark?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string
          pass_mark?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_enrollments: {
        Row: {
          certified: boolean
          certified_at: string | null
          course_id: string
          created_at: string
          id: string
          progress: number
          score: number | null
          user_id: string
        }
        Insert: {
          certified?: boolean
          certified_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          progress?: number
          score?: number | null
          user_id: string
        }
        Update: {
          certified?: boolean
          certified_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          progress?: number
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz: {
        Row: {
          correct_index: number
          course_id: string
          id: string
          options: Json
          question: string
          sort_order: number
        }
        Insert: {
          correct_index?: number
          course_id: string
          id?: string
          options?: Json
          question: string
          sort_order?: number
        }
        Update: {
          correct_index?: number
          course_id?: string
          id?: string
          options?: Json
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          captured_at: string | null
          created_at: string
          format: string
          geo: Json | null
          id: string
          image_path: string | null
          place: string | null
          property_id: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          format?: string
          geo?: Json | null
          id?: string
          image_path?: string | null
          place?: string | null
          property_id?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          format?: string
          geo?: Json | null
          id?: string
          image_path?: string | null
          place?: string | null
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_messages: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          name: string | null
          sender: string
          slug: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          name?: string | null
          sender: string
          slug: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          name?: string | null
          sender?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_messages_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "shared_ads"
            referencedColumns: ["slug"]
          },
        ]
      }
      agent_availability: {
        Row: {
          agent_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          created_at: string
          feature: string
          id: string
          input: Json
          meta: Json
          output: string | null
          score: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          input?: Json
          meta?: Json
          output?: string | null
          score?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          input?: Json
          meta?: Json
          output?: string | null
          score?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          audience: string
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      app_content: {
        Row: {
          grp: string
          key: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
          value: string | null
        }
        Insert: {
          grp?: string
          key: string
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          grp?: string
          key?: string
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      app_features: {
        Row: {
          category: string
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          icon: string
          id: string
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
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
        Relationships: []
      }
      badges: {
        Row: {
          active: boolean
          bonus: number
          created_at: string
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          key: string
          name: string
          tier: string
        }
        Insert: {
          active?: boolean
          bonus?: number
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
          tier?: string
        }
        Update: {
          active?: boolean
          bonus?: number
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
          tier?: string
        }
        Relationships: []
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
      brochure_templates: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          is_default: boolean
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          name: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
        }
        Relationships: []
      }
      brochures: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          property_id: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brochures_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "brochure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      buyer_journeys: {
        Row: {
          id: string
          property_id: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          property_id: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          property_id?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_journeys_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_journeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_requirements: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          label: string | null
          location: string | null
          min_area: string | null
          notify: boolean
          property_type_id: string | null
          purpose: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          label?: string | null
          location?: string | null
          min_area?: string | null
          notify?: boolean
          property_type_id?: string | null
          purpose?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          label?: string | null
          location?: string | null
          min_area?: string | null
          notify?: boolean
          property_type_id?: string | null
          purpose?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requirements_property_type_id_fkey"
            columns: ["property_type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requirements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          created_at: string
          id: string
          initiator: string | null
          kind: string | null
          property_id: string | null
          room: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          initiator?: string | null
          kind?: string | null
          property_id?: string | null
          room?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          initiator?: string | null
          kind?: string | null
          property_id?: string | null
          room?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          artifact_type: string
          channel: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          active?: boolean
          artifact_type?: string
          channel?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          active?: boolean
          artifact_type?: string
          channel?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
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
      chat_threads: {
        Row: {
          agent_id: string | null
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string | null
        }
        Insert: {
          agent_id?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
        }
        Update: {
          agent_id?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cobroke_interests: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          status: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobroke_interests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobroke_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "cobroke_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      cobroke_listings: {
        Row: {
          created_at: string
          id: string
          note: string | null
          posted_by: string
          property_id: string
          split_pct: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          posted_by: string
          property_id: string
          split_pct: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          posted_by?: string
          property_id?: string
          split_pct?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobroke_listings_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobroke_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      deal_documents: {
        Row: {
          booking_id: string | null
          created_at: string
          doc_path: string | null
          doc_url: string
          id: string
          kind: string
          lead_id: string | null
          owner_id: string
          property_id: string | null
          sign_status: string
          title: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          doc_path?: string | null
          doc_url: string
          id?: string
          kind?: string
          lead_id?: string | null
          owner_id: string
          property_id?: string | null
          sign_status?: string
          title: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          doc_path?: string | null
          doc_url?: string
          id?: string
          kind?: string
          lead_id?: string | null
          owner_id?: string
          property_id?: string | null
          sign_status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          details: string | null
          id: string
          property_id: string | null
          raised_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string | null
          raised_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string | null
          raised_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_key: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_key: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_key?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      lead_score_factors: {
        Row: {
          band: string | null
          computed_at: string
          factors: Json
          id: string
          lead_id: string
          model_version: string
          score: number
        }
        Insert: {
          band?: string | null
          computed_at?: string
          factors?: Json
          id?: string
          lead_id: string
          model_version?: string
          score: number
        }
        Update: {
          band?: string | null
          computed_at?: string
          factors?: Json
          id?: string
          lead_id?: string
          model_version?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_factors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact: Json
          created_at: string
          expected_close: string | null
          id: string
          owner_id: string
          property_id: string | null
          score: number
          score_band: string | null
          source: string | null
          stage_changed_at: string
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          contact?: Json
          created_at?: string
          expected_close?: string | null
          id?: string
          owner_id: string
          property_id?: string | null
          score?: number
          score_band?: string | null
          source?: string | null
          stage_changed_at?: string
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          contact?: Json
          created_at?: string
          expected_close?: string | null
          id?: string
          owner_id?: string
          property_id?: string | null
          score?: number
          score_band?: string | null
          source?: string | null
          stage_changed_at?: string
          status?: string
          updated_at?: string
          value?: number | null
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
      lenders: {
        Row: {
          active: boolean
          blurb: string | null
          created_at: string
          id: string
          interest_from: number | null
          logo_url: string | null
          max_tenure_years: number | null
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          blurb?: string | null
          created_at?: string
          id?: string
          interest_from?: number | null
          logo_url?: string | null
          max_tenure_years?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          blurb?: string | null
          created_at?: string
          id?: string
          interest_from?: number | null
          logo_url?: string | null
          max_tenure_years?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          lender_id: string | null
          monthly_income: number | null
          note: string | null
          property_id: string | null
          status: string
          tenure_years: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          lender_id?: string | null
          monthly_income?: number | null
          note?: string | null
          property_id?: string | null
          status?: string
          tenure_years?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          lender_id?: string | null
          monthly_income?: number | null
          note?: string | null
          property_id?: string | null
          status?: string
          tenure_years?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "lenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
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
      offers: {
        Row: {
          amount: number
          buyer_id: string
          counter_amount: number | null
          counter_message: string | null
          created_at: string
          id: string
          message: string | null
          property_id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          counter_amount?: number | null
          counter_message?: string | null
          created_at?: string
          id?: string
          message?: string | null
          property_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          counter_amount?: number | null
          counter_message?: string | null
          created_at?: string
          id?: string
          message?: string | null
          property_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          gateway: string | null
          gateway_payment_id: string | null
          gateway_ref: string | null
          id: string
          method: string | null
          purpose: string | null
          short_url: string | null
          status: string
          txn_ref: string | null
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          gateway?: string | null
          gateway_payment_id?: string | null
          gateway_ref?: string | null
          id?: string
          method?: string | null
          purpose?: string | null
          short_url?: string | null
          status?: string
          txn_ref?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          gateway?: string | null
          gateway_payment_id?: string | null
          gateway_ref?: string | null
          id?: string
          method?: string | null
          purpose?: string | null
          short_url?: string | null
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
      price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_price: number
          old_price: number | null
          property_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price: number
          old_price?: number | null
          property_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price?: number
          old_price?: number | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          notification_prefs: Json
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
          notification_prefs?: Json
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
          notification_prefs?: Json
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
          neighborhood: Json
          rera_doc_path: string | null
          rera_number: string | null
          rera_status: string
          rera_valid_till: string | null
          rera_verified_at: string | null
          rera_verified_by: string | null
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
          neighborhood?: Json
          rera_doc_path?: string | null
          rera_number?: string | null
          rera_status?: string
          rera_valid_till?: string | null
          rera_verified_at?: string | null
          rera_verified_by?: string | null
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
          neighborhood?: Json
          rera_doc_path?: string | null
          rera_number?: string | null
          rera_status?: string
          rera_valid_till?: string | null
          rera_verified_at?: string | null
          rera_verified_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          approval_note: string | null
          approval_status: string
          attrs: Json
          coordinates: Json | null
          created_at: string
          id: string
          is_premium: boolean
          media: Json
          plan_id: string | null
          plot_code: string
          price: number
          project_id: string
          property_type_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string | null
          status: string
          updated_at: string
          verified_documents: boolean
          verified_location: boolean
          verified_seller: boolean
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          attrs?: Json
          coordinates?: Json | null
          created_at?: string
          id?: string
          is_premium?: boolean
          media?: Json
          plan_id?: string | null
          plot_code: string
          price?: number
          project_id: string
          property_type_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
          verified_documents?: boolean
          verified_location?: boolean
          verified_seller?: boolean
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          attrs?: Json
          coordinates?: Json | null
          created_at?: string
          id?: string
          is_premium?: boolean
          media?: Json
          plan_id?: string | null
          plot_code?: string
          price?: number
          project_id?: string
          property_type_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
          verified_documents?: boolean
          verified_location?: boolean
          verified_seller?: boolean
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
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media_submissions: {
        Row: {
          created_at: string
          id: string
          name: string | null
          path: string
          property_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          path: string
          property_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          path?: string
          property_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          project_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          project_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          project_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      property_views: {
        Row: {
          created_at: string
          id: string
          property_id: string
          viewed_on: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          viewed_on?: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          viewed_on?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_watches: {
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
            foreignKeyName: "property_watches_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_events: {
        Row: {
          artifact_type: string
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
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
            foreignKeyName: "referral_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
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
      requirement_matches: {
        Row: {
          created_at: string
          id: string
          property_id: string
          reason: string
          requirement_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          reason: string
          requirement_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          reason?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_matches_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_matches_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "buyer_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          level: number
          name: string
          permissions: Json
          self_selectable: boolean
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
          self_selectable?: boolean
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
          self_selectable?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_ads: {
        Row: {
          agent_name: string | null
          agent_phone: string | null
          agent_referral: string | null
          caption: string | null
          captured_at: string | null
          created_at: string
          id: string
          image_url: string
          lat: number | null
          lng: number | null
          owner_id: string
          place: string | null
          slug: string
          video_url: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_phone?: string | null
          agent_referral?: string | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          image_url: string
          lat?: number | null
          lng?: number | null
          owner_id: string
          place?: string | null
          slug: string
          video_url?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_phone?: string | null
          agent_referral?: string | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          image_url?: string
          lat?: number | null
          lng?: number | null
          owner_id?: string
          place?: string | null
          slug?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_ads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          item_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          item_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shortlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_items: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          property_id: string
          shortlist_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          property_id: string
          shortlist_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          property_id?: string
          shortlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          shortlist_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          shortlist_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          shortlist_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_members_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_votes: {
        Row: {
          id: string
          item_id: string
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          value: number
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shortlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          share_token?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          agent_id: string | null
          buyer_contact: Json
          buyer_id: string | null
          checkin_at: string | null
          checkin_distance_m: number | null
          checkin_lat: number | null
          checkin_lng: number | null
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          property_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          buyer_contact?: Json
          buyer_id?: string | null
          checkin_at?: string | null
          checkin_distance_m?: number | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          property_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          buyer_contact?: Json
          buyer_id?: string | null
          checkin_at?: string | null
          checkin_distance_m?: number | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          property_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          bonus_claimed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          bonus_claimed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          bonus_claimed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media: {
        Row: {
          created_at: string
          id: string
          name: string | null
          path: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          path: string
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          path?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      web_signups: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
          user_agent?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_public_profile: { Args: { p_code: string }; Returns: Json }
      app_audit: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_payload: Json
        }
        Returns: undefined
      }
      approve_photo_submission: { Args: { p_id: string }; Returns: undefined }
      auth_hierarchy_path: { Args: never; Returns: unknown }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_role_slug: { Args: never; Returns: string }
      auto_assign_lead: { Args: { p_lead: string }; Returns: string }
      become_partner: { Args: never; Returns: string }
      book_site_visit: {
        Args: {
          p_contact?: Json
          p_note?: string
          p_property: string
          p_scheduled_at: string
        }
        Returns: string
      }
      broadcast_notification: {
        Args: { p_body: string; p_segment: string; p_title: string }
        Returns: number
      }
      can_see_thread: { Args: { t: string }; Returns: boolean }
      checkin_site_visit: {
        Args: { p_lat: number; p_lng: number; p_visit: string }
        Returns: Json
      }
      claim_badge_bonus: { Args: { p_badge: string }; Returns: number }
      close_sale: { Args: { p_booking: string }; Returns: number }
      complete_onboarding: {
        Args: { p_full_name: string; p_phone: string; p_referral_code?: string }
        Returns: undefined
      }
      compute_commission: {
        Args: { p_formula: Json; p_price: number }
        Returns: number
      }
      compute_referral_fraud: {
        Args: {
          p_device: Json
          p_prospect: string
          p_sharer: string
          p_stage: string
        }
        Returns: number
      }
      evaluate_badges: { Args: { p_user: string }; Returns: undefined }
      express_cobroke_interest: {
        Args: { p_listing: string; p_message?: string }
        Returns: string
      }
      gen_referral_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: { p_limit?: number; p_metric?: string }
        Returns: {
          full_name: string
          rank: number
          role_name: string
          user_id: string
          value: number
        }[]
      }
      get_public_settings: { Args: never; Returns: Json }
      get_quiz: {
        Args: { p_course: string }
        Returns: {
          id: string
          options: Json
          question: string
          sort_order: number
        }[]
      }
      investment_hotspots: {
        Args: never
        Returns: {
          avg_price: number
          demand: number
          location: string
          score: number
          supply: number
        }[]
      }
      is_shortlist_member: { Args: { p_sl: string }; Returns: boolean }
      join_shortlist: { Args: { p_token: string }; Returns: string }
      lead_score_band: { Args: { p_score: number }; Returns: string }
      log_admin_action: {
        Args: {
          p_action: string
          p_entity?: string
          p_entity_id?: string
          p_payload?: Json
        }
        Returns: undefined
      }
      log_property_view: { Args: { p_property: string }; Returns: undefined }
      log_referral_click:
        | {
            Args: {
              p_artifact?: string
              p_channel?: string
              p_code: string
              p_device?: Json
            }
            Returns: boolean
          }
        | {
            Args: {
              p_artifact: string
              p_campaign: string
              p_channel: string
              p_code: string
              p_device: Json
            }
            Returns: boolean
          }
      make_offer: {
        Args: { p_amount: number; p_message?: string; p_property: string }
        Returns: string
      }
      market_trends: {
        Args: never
        Returns: {
          available: number
          avg_price: number
          listings: number
          location: string
          sold: number
        }[]
      }
      next_plot_code: { Args: { p_type: string }; Returns: string }
      notify: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      pipeline_summary: {
        Args: never
        Returns: {
          lead_count: number
          status: string
          total_value: number
        }[]
      }
      project_rating: {
        Args: { p_project: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      public_selectable_roles: {
        Args: never
        Returns: {
          id: string
          level: number
          name: string
          slug: string
        }[]
      }
      radar_notify: {
        Args: { p_property: string; p_reason: string }
        Returns: undefined
      }
      referral_funnel: { Args: { p_days?: number }; Returns: Json }
      request_withdrawal: {
        Args: { p_amount: number; p_rail?: string }
        Returns: string
      }
      requirement_demand: {
        Args: never
        Returns: {
          location: string
          requirement_count: number
          with_budget: number
        }[]
      }
      respond_cobroke_interest: {
        Args: { p_decision: string; p_interest: string }
        Returns: undefined
      }
      respond_offer: {
        Args: {
          p_counter_amount?: number
          p_counter_message?: string
          p_decision: string
          p_offer: string
        }
        Returns: undefined
      }
      route_lead: {
        Args: { p_agent: string; p_lead: string }
        Returns: undefined
      }
      rule_matches: {
        Args: {
          p_match: Json
          p_plan: string
          p_project: string
          p_type: string
        }
        Returns: boolean
      }
      run_commission_for_property: {
        Args: { p_agent: string; p_property: string }
        Returns: number
      }
      score_lead: { Args: { p_lead: string }; Returns: Json }
      season_leaderboard: {
        Args: { p_from: string; p_to: string }
        Returns: {
          earnings: number
          full_name: string
          rank: number
          role_name: string
          user_id: string
        }[]
      }
      seller_listing_stats: {
        Args: never
        Returns: {
          approval_status: string
          bookings: number
          enquiries: number
          offers: number
          plot_code: string
          price: number
          property_id: string
          saves: number
          status: string
          views: number
        }[]
      }
      set_site_visit_status: {
        Args: { p_status: string; p_visit: string }
        Returns: undefined
      }
      shortlist_id_for_item: { Args: { p_item: string }; Returns: string }
      submit_kyc: { Args: { p_data: Json }; Returns: undefined }
      submit_quiz: {
        Args: { p_answers: Json; p_course: string }
        Returns: Json
      }
      switch_role: { Args: { p_slug: string }; Returns: string }
      team_member_stats: { Args: { p_member: string }; Returns: Json }
      team_summary: { Args: never; Returns: Json }
      text2ltree: { Args: { "": string }; Returns: unknown }
      uuid_label: { Args: { p: string }; Returns: string }
      verify_rera: {
        Args: {
          p_doc_path?: string
          p_number: string
          p_project: string
          p_status: string
          p_valid_till?: string
        }
        Returns: undefined
      }
      withdraw_offer: { Args: { p_offer: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
