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
      candidates: {
        Row: {
          constituency_id: string | null
          county_id: string
          created_at: string
          full_name: string
          id: string
          party: string
          position: Database["public"]["Enums"]["elective_position"]
          ward_id: string | null
        }
        Insert: {
          constituency_id?: string | null
          county_id: string
          created_at?: string
          full_name: string
          id?: string
          party: string
          position: Database["public"]["Enums"]["elective_position"]
          ward_id?: string | null
        }
        Update: {
          constituency_id?: string | null
          county_id?: string
          created_at?: string
          full_name?: string
          id?: string
          party?: string
          position?: Database["public"]["Enums"]["elective_position"]
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "constituencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      constituencies: {
        Row: {
          county_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          county_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          county_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "constituencies_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      evidence_photos: {
        Row: {
          agent_id: string
          created_at: string
          form_type: string
          id: string
          photo_url: string
          polling_station_id: string
          position: Database["public"]["Enums"]["elective_position"]
          total_valid_votes: number | null
          rejected_votes: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          form_type: string
          id?: string
          photo_url: string
          polling_station_id: string
          position: Database["public"]["Enums"]["elective_position"]
          total_valid_votes?: number | null
          rejected_votes?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          form_type?: string
          id?: string
          photo_url?: string
          polling_station_id?: string
          position?: Database["public"]["Enums"]["elective_position"]
          total_valid_votes?: number | null
          rejected_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_photos_polling_station_id_fkey"
            columns: ["polling_station_id"]
            isOneToOne: false
            referencedRelation: "polling_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          created_by: string | null
          polling_station_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_by?: string | null
          polling_station_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_by?: string | null
          polling_station_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      polling_stations: {
        Row: {
          code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          registered_voters: number
          ward_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          registered_voters?: number
          ward_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          registered_voters?: number
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polling_stations_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      result_submissions: {
        Row: {
          agent_id: string
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          polling_station_id: string
          position: Database["public"]["Enums"]["elective_position"]
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          votes: number
        }
        Insert: {
          agent_id: string
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          polling_station_id: string
          position: Database["public"]["Enums"]["elective_position"]
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          votes: number
        }
        Update: {
          agent_id?: string
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          polling_station_id?: string
          position?: Database["public"]["Enums"]["elective_position"]
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "result_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_submissions_polling_station_id_fkey"
            columns: ["polling_station_id"]
            isOneToOne: false
            referencedRelation: "polling_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          constituency_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          constituency_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          constituency_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "constituencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      elective_position: "governor" | "mp" | "mca" | "woman_rep" | "senator"
      submission_status: "pending" | "verified" | "flagged" | "rejected"
      user_role: "super_admin" | "admin" | "agent"
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
      elective_position: ["governor", "mp", "mca", "woman_rep", "senator"],
      submission_status: ["pending", "verified", "flagged", "rejected"],
      user_role: ["super_admin", "admin", "agent"],
    },
  },
} as const
