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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          organization_id: string
          role: string
          team_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          organization_id: string
          role?: string
          team_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          organization_id?: string
          role?: string
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_team_id_organization_id_fkey"
            columns: ["team_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          display_name: string
          organization_id: string
          role: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          organization_id: string
          role: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          organization_id?: string
          role?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_team_id_organization_id_fkey"
            columns: ["team_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string
          name: string
          play_days: number[]
          time_zone: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string
          name: string
          play_days?: number[]
          time_zone?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          name?: string
          play_days?: number[]
          time_zone?: string
        }
        Relationships: []
      }
      round_answers: {
        Row: {
          answer: string | null
          answered_at: string | null
          is_correct: boolean | null
          points: number | null
          position: number
          round_id: string
          scenario_id: string
          streak: number | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          is_correct?: boolean | null
          points?: number | null
          position: number
          round_id: string
          scenario_id: string
          streak?: number | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          is_correct?: boolean | null
          points?: number | null
          position?: number
          round_id?: string
          scenario_id?: string
          streak?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_answers_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          best_streak: number | null
          card_count: number
          completed_at: string | null
          id: string
          is_practice: boolean
          organization_id: string
          points: number | null
          round_date: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          card_count: number
          completed_at?: string | null
          id?: string
          is_practice?: boolean
          organization_id: string
          points?: number | null
          round_date: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number | null
          card_count?: number
          completed_at?: string | null
          id?: string
          is_practice?: boolean
          organization_id?: string
          points?: number | null
          round_date?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          body: string
          channel: string
          created_at: string
          difficulty: number
          id: string
          industry: string
          legit_reason: string | null
          links: Json
          locale: string
          red_flags: Json
          scam_type: string
          sender_address: string
          sender_name: string
          status: string
          subject: string | null
          tip: string
          updated_at: string
          verdict: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          difficulty: number
          id: string
          industry: string
          legit_reason?: string | null
          links?: Json
          locale: string
          red_flags?: Json
          scam_type: string
          sender_address: string
          sender_name: string
          status?: string
          subject?: string | null
          tip: string
          updated_at?: string
          verdict: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          difficulty?: number
          id?: string
          industry?: string
          legit_reason?: string | null
          links?: Json
          locale?: string
          red_flags?: Json
          scam_type?: string
          sender_address?: string
          sender_name?: string
          status?: string
          subject?: string | null
          tip?: string
          updated_at?: string
          verdict?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { invite_token: string; member_display_name: string }
        Returns: string
      }
      create_organization: {
        Args: {
          member_display_name: string
          org_industry: string
          org_name: string
          org_time_zone?: string
          team_name: string
        }
        Returns: string
      }
      set_play_days: { Args: { days: number[] }; Returns: number[] }
      training_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cards: number
          correct: number
          display_name: string
          email: string
          joined_on: string
          points: number
          role: string
          round_dates: string[]
          team_name: string
          user_id: string
        }[]
      }
      training_topics: {
        Args: { p_from: string; p_to: string }
        Returns: {
          attempts: number
          misses: number
          scam_type: string
        }[]
      }
      weekly_league: {
        Args: { week_start: string }
        Returns: {
          display_name: string
          points: number
          rounds: number
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
