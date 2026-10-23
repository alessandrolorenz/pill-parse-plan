export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string | null
          date: string
          done: boolean | null
          id: string
          label: string
          time: string
          treatment_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          done?: boolean | null
          id?: string
          label: string
          time: string
          treatment_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          done?: boolean | null
          id?: string
          label?: string
          time?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string | null
          id: string
          image_path: string | null
          notes: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_path?: string | null
          notes?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_path?: string | null
          notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active_subscription: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          provider: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_subscription?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_subscription?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
