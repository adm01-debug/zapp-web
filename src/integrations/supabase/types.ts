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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          earned_at: string
          id: string
          profile_id: string
          xp_earned: number
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          earned_at?: string
          id?: string
          profile_id: string
          xp_earned?: number
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          earned_at?: string
          id?: string
          profile_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_stats: {
        Row: {
          achievements_count: number
          avg_response_time_seconds: number | null
          best_streak: number
          conversations_resolved: number
          created_at: string
          current_streak: number
          customer_satisfaction_score: number | null
          id: string
          level: number
          messages_received: number
          messages_sent: number
          profile_id: string
          updated_at: string
          xp: number
        }
        Insert: {
          achievements_count?: number
          avg_response_time_seconds?: number | null
          best_streak?: number
          conversations_resolved?: number
          created_at?: string
          current_streak?: number
          customer_satisfaction_score?: number | null
          id?: string
          level?: number
          messages_received?: number
          messages_sent?: number
          profile_id: string
          updated_at?: string
          xp?: number
        }
        Update: {
          achievements_count?: number
          avg_response_time_seconds?: number | null
          best_streak?: number
          conversations_resolved?: number
          created_at?: string
          current_streak?: number
          customer_satisfaction_score?: number | null
          id?: string
          level?: number
          messages_received?: number
          messages_sent?: number
          profile_id?: string
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      away_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_enabled: boolean | null
          updated_at: string
          whatsapp_connection_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          whatsapp_connection_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "away_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          is_permanent: boolean | null
          last_attempt_at: string | null
          reason: string
          request_count: number | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          is_permanent?: boolean | null
          last_attempt_at?: string | null
          reason: string
          request_count?: number | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_permanent?: boolean | null
          last_attempt_at?: string | null
          reason?: string
          request_count?: number | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          close_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
          updated_at: string
          whatsapp_connection_id: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
          whatsapp_connection_id: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
          whatsapp_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          contact_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          recording_url: string | null
          started_at: string
          status: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          contact_id?: string | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_wallet_rules: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_wallet_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_wallet_rules_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_id: string
          contact_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          contact_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          company: string | null
          contact_type: string | null
          created_at: string
          email: string | null
          id: string
          job_title: string | null
          name: string
          nickname: string | null
          notes: string | null
          phone: string
          queue_id: string | null
          surname: string | null
          tags: string[] | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          phone: string
          queue_id?: string | null
          surname?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          phone?: string
          queue_id?: string | null
          surname?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analyses: {
        Row: {
          analyzed_by: string | null
          contact_id: string
          created_at: string
          customer_satisfaction: number | null
          id: string
          key_points: string[] | null
          message_count: number | null
          next_steps: string[] | null
          sentiment: string
          sentiment_score: number | null
          status: string
          summary: string
          topics: string[] | null
          urgency: string | null
        }
        Insert: {
          analyzed_by?: string | null
          contact_id: string
          created_at?: string
          customer_satisfaction?: number | null
          id?: string
          key_points?: string[] | null
          message_count?: number | null
          next_steps?: string[] | null
          sentiment?: string
          sentiment_score?: number | null
          status?: string
          summary: string
          topics?: string[] | null
          urgency?: string | null
        }
        Update: {
          analyzed_by?: string | null
          contact_id?: string
          created_at?: string
          customer_satisfaction?: number | null
          id?: string
          key_points?: string[] | null
          message_count?: number | null
          next_steps?: string[] | null
          sentiment?: string
          sentiment_score?: number | null
          status?: string
          summary?: string
          topics?: string[] | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analyses_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analyses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sla: {
        Row: {
          contact_id: string | null
          created_at: string
          first_message_at: string
          first_response_at: string | null
          first_response_breached: boolean | null
          id: string
          resolution_breached: boolean | null
          resolved_at: string | null
          sla_configuration_id: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          first_message_at?: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          first_message_at?: string
          first_response_at?: string | null
          first_response_breached?: boolean | null
          id?: string
          resolution_breached?: boolean | null
          resolved_at?: string | null
          sla_configuration_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sla_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sla_sla_configuration_id_fkey"
            columns: ["sla_configuration_id"]
            isOneToOne: false
            referencedRelation: "sla_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      goals_configurations: {
        Row: {
          created_at: string
          daily_target: number
          goal_type: string
          id: string
          is_active: boolean | null
          monthly_target: number
          profile_id: string | null
          queue_id: string | null
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          daily_target?: number
          goal_type: string
          id?: string
          is_active?: boolean | null
          monthly_target?: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          daily_target?: number
          goal_type?: string
          id?: string
          is_active?: boolean | null
          monthly_target?: number
          profile_id?: string | null
          queue_id?: string | null
          updated_at?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_configurations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_configurations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          contact_id: string | null
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_global: boolean | null
          shortcut: string | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent_id: string | null
          contact_id: string | null
          content: string
          created_at: string
          external_id: string | null
          id: string
          is_read: boolean | null
          media_url: string | null
          message_type: string
          sender: string
          status: string | null
          status_updated_at: string | null
          transcription: string | null
          transcription_status: string | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_id?: string | null
          content: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string
          sender: string
          status?: string | null
          status_updated_at?: string | null
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string
          sender?: string
          status?: string | null
          status_updated_at?: string | null
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          factor_id: string
          id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          factor_id: string
          id?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          factor_id?: string
          id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          retailer_id: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          retailer_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          retailer_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_level: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          max_chats: number | null
          name: string
          permissions: Json | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          max_chats?: number | null
          name: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          max_chats?: number | null
          name?: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queue_goals: {
        Row: {
          alerts_enabled: boolean | null
          created_at: string
          id: string
          max_avg_wait_minutes: number | null
          max_messages_pending: number | null
          max_waiting_contacts: number | null
          min_assignment_rate: number | null
          queue_id: string
          updated_at: string
        }
        Insert: {
          alerts_enabled?: boolean | null
          created_at?: string
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id: string
          updated_at?: string
        }
        Update: {
          alerts_enabled?: boolean | null
          created_at?: string
          id?: string
          max_avg_wait_minutes?: number | null
          max_messages_pending?: number | null
          max_waiting_contacts?: number | null
          min_assignment_rate?: number | null
          queue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_goals_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: true
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          profile_id: string
          queue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          profile_id: string
          queue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          profile_id?: string
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_wait_time_minutes: number | null
          name: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_wait_time_minutes?: number | null
          name: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_wait_time_minutes?: number | null
          name?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_configs: {
        Row: {
          block_duration_minutes: number
          created_at: string
          endpoint_pattern: string
          id: string
          is_active: boolean | null
          max_requests: number
          name: string
          updated_at: string
          window_seconds: number
        }
        Insert: {
          block_duration_minutes?: number
          created_at?: string
          endpoint_pattern: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          name: string
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string
          endpoint_pattern?: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          name?: string
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          blocked: boolean | null
          city: string | null
          country: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sla_configurations: {
        Row: {
          created_at: string
          first_response_minutes: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority: string
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          auto_assignment_enabled: boolean | null
          auto_assignment_method: string | null
          auto_transcription_enabled: boolean | null
          away_message: string | null
          browser_notifications_enabled: boolean | null
          business_hours_enabled: boolean | null
          business_hours_end: string | null
          business_hours_start: string | null
          closing_message: string | null
          compact_mode: boolean | null
          created_at: string
          goal_sound_type: string | null
          id: string
          inactivity_timeout: number | null
          language: string | null
          mention_sound_type: string | null
          message_sound_type: string | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sentiment_alert_enabled: boolean | null
          sentiment_alert_threshold: number | null
          sentiment_consecutive_count: number | null
          sla_sound_type: string | null
          sound_enabled: boolean | null
          theme: string | null
          transcription_notification_enabled: boolean | null
          transcription_sound_type: string | null
          tts_speed: number | null
          tts_voice_id: string | null
          updated_at: string
          user_id: string
          welcome_message: string | null
          work_days: number[] | null
        }
        Insert: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_method?: string | null
          auto_transcription_enabled?: boolean | null
          away_message?: string | null
          browser_notifications_enabled?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          closing_message?: string | null
          compact_mode?: boolean | null
          created_at?: string
          goal_sound_type?: string | null
          id?: string
          inactivity_timeout?: number | null
          language?: string | null
          mention_sound_type?: string | null
          message_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sentiment_alert_enabled?: boolean | null
          sentiment_alert_threshold?: number | null
          sentiment_consecutive_count?: number | null
          sla_sound_type?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          transcription_notification_enabled?: boolean | null
          transcription_sound_type?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          updated_at?: string
          user_id: string
          welcome_message?: string | null
          work_days?: number[] | null
        }
        Update: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_method?: string | null
          auto_transcription_enabled?: boolean | null
          away_message?: string | null
          browser_notifications_enabled?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          closing_message?: string | null
          compact_mode?: boolean | null
          created_at?: string
          goal_sound_type?: string | null
          id?: string
          inactivity_timeout?: number | null
          language?: string | null
          mention_sound_type?: string | null
          message_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sentiment_alert_enabled?: boolean | null
          sentiment_alert_threshold?: number | null
          sentiment_consecutive_count?: number | null
          sla_sound_type?: string | null
          sound_enabled?: boolean | null
          theme?: string | null
          transcription_notification_enabled?: boolean | null
          transcription_sound_type?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          updated_at?: string
          user_id?: string
          welcome_message?: string | null
          work_days?: number[] | null
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instance_id: string | null
          is_default: boolean | null
          name: string
          phone_number: string
          qr_code: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string | null
          is_default?: boolean | null
          name: string
          phone_number: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string | null
          is_default?: boolean | null
          name?: string
          phone_number?: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          group_id: string
          id: string
          is_admin: boolean | null
          name: string
          participant_count: number | null
          updated_at: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          is_admin?: boolean | null
          name: string
          participant_count?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          is_admin?: boolean | null
          name?: string
          participant_count?: number | null
          updated_at?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level: { Args: { xp_amount: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_supervisor: { Args: { _user_id: string }; Returns: boolean }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      is_within_business_hours: {
        Args: { connection_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "agent"
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
      app_role: ["admin", "supervisor", "agent"],
    },
  },
} as const
