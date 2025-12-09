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
      burnout_checkins: {
        Row: {
          created_at: string | null
          date: string
          energy: number
          feeling: number
          id: string
          mood: number
          notes: string | null
          productivity: number
          sleep: string
          stress: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          energy: number
          feeling: number
          id?: string
          mood: number
          notes?: string | null
          productivity: number
          sleep: string
          stress: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          energy?: number
          feeling?: number
          id?: string
          mood?: number
          notes?: string | null
          productivity?: number
          sleep?: string
          stress?: number
          user_id?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string | null
          date: string
          id: string
          priority: number
          specialty: string
          studied: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          priority: number
          specialty: string
          studied?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          priority?: number
          specialty?: string
          studied?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      dream_board_items: {
        Row: {
          content: string
          created_at: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      editorial_progress: {
        Row: {
          area: string
          created_at: string | null
          editorial_id: string | null
          id: string
          status: string
          sub_area: string
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string | null
          editorial_id?: string | null
          id?: string
          status?: string
          sub_area: string
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string | null
          editorial_id?: string | null
          id?: string
          status?: string
          sub_area?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_progress_editorial_id_fkey"
            columns: ["editorial_id"]
            isOneToOne: false
            referencedRelation: "editorials"
            referencedColumns: ["id"]
          },
        ]
      }
      editorials: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          completed_at: string
          config: Json
          created_at: string | null
          diary_notes: string | null
          distractions: Json | null
          emotional_state: Json | null
          id: string
          post_emotions: Json | null
          user_id: string
        }
        Insert: {
          completed_at: string
          config: Json
          created_at?: string | null
          diary_notes?: string | null
          distractions?: Json | null
          emotional_state?: Json | null
          id?: string
          post_emotions?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string
          config?: Json
          created_at?: string | null
          diary_notes?: string | null
          distractions?: Json | null
          emotional_state?: Json | null
          id?: string
          post_emotions?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string | null
          date: string
          id: string
          institution: string
          name: string
          performance: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          institution: string
          name: string
          performance: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          institution?: string
          name?: string
          performance?: Json
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          correct_answers: number
          created_at: string | null
          date: string
          id: string
          specialty: string
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_answers: number
          created_at?: string | null
          date: string
          id?: string
          specialty: string
          topic: string
          total_questions: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string | null
          date?: string
          id?: string
          specialty?: string
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          area: string
          back: string
          created_at: string | null
          front: string
          id: string
          user_id: string
        }
        Insert: {
          area: string
          back: string
          created_at?: string | null
          front: string
          id?: string
          user_id: string
        }
        Update: {
          area?: string
          back?: string
          created_at?: string | null
          front?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string | null
          id: string
          target_accuracy: number
          target_topics_per_week: number
          updated_at: string | null
          user_id: string
          weekly_questions: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_accuracy?: number
          target_topics_per_week?: number
          updated_at?: string | null
          user_id: string
          weekly_questions?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          target_accuracy?: number
          target_topics_per_week?: number
          updated_at?: string | null
          user_id?: string
          weekly_questions?: number
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Relationships: []
      }
      notebook_entries: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          specialty: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          specialty: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          specialty?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          last_study_date: string | null
          level: number | null
          name: string
          streak: number | null
          total_activities: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          name: string
          streak?: number | null
          total_activities?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          name?: string
          streak?: number | null
          total_activities?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          priority: number
          topic: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          priority: number
          topic: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          priority?: number
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_invite_code: { Args: { code_input: string }; Returns: boolean }
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
