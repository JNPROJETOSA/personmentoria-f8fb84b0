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
      flashcard_reviews: {
        Row: {
          created_at: string
          difficulty: number
          flashcard_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty: number
          flashcard_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          flashcard_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_study_sessions: {
        Row: {
          cards_reviewed: number | null
          created_at: string
          duration_seconds: number | null
          ended_at: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          cards_reviewed?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at: string
          id?: string
          started_at: string
          user_id: string
        }
        Update: {
          cards_reviewed?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_folders: {
        Row: {
          area: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          area: string
          back: string
          created_at: string | null
          folder_id: string | null
          front: string
          id: string
          user_id: string
          type: string | null
        }
        Insert: {
          area: string
          back: string
          created_at?: string | null
          folder_id?: string | null
          front: string
          id?: string
          user_id: string
          type?: string | null
        }
        Update: {
          area?: string
          back?: string
          created_at?: string | null
          folder_id?: string | null
          front?: string
          id?: string
          user_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "flashcard_folders"
            referencedColumns: ["id"]
          },
        ]
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
      meeting_slots: {
        Row: {
          id: string
          mentor_id: string
          student_id: string | null
          student_name: string | null
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          student_id?: string | null
          student_name?: string | null
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          mentor_id?: string
          student_id?: string | null
          student_name?: string | null
          start_time?: string
          end_time?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_slots_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          sender_id: string | null
          student_id: string
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          sender_id?: string | null
          student_id: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          sender_id?: string | null
          student_id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_strategies: {
        Row: {
          id: string
          student_id: string
          macro_strategy: string | null
          micro_strategy: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          student_id: string
          macro_strategy?: string | null
          micro_strategy?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          macro_strategy?: string | null
          micro_strategy?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_strategies_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_strategies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          frozen: boolean
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
          frozen?: boolean
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
          frozen?: boolean
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_agenda: {
        Row: {
          completed_indices: number[] | null
          created_at: string
          day_of_week: number
          id: string
          tasks: string[] | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          completed_indices?: number[] | null
          created_at?: string
          day_of_week: number
          id?: string
          tasks?: string[] | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          completed_indices?: number[] | null
          created_at?: string
          day_of_week?: number
          id?: string
          tasks?: string[] | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_frozen: { Args: { check_user_id: string }; Returns: boolean }
      validate_invite_code: { Args: { code_input: string }; Returns: boolean }
      book_meeting: {
        Args: { slot_id: string; student_name?: string }
        Returns: { success: boolean; message: string }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
