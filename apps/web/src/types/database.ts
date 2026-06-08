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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      content_items: {
        Row: {
          id: string
          operation_id: string
          workspace_id: string
          format: string
          dor: string | null
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          workspace_id: string
          format: string
          dor?: string | null
          content?: Json
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          workspace_id?: string
          format?: string
          dor?: string | null
          content?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprints: {
        Row: {
          id: string
          operation_id: string
          sections: Json
          updated_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          angulos_criativos: Json
          created_at: string
          fonte: string | null
          id: string
          instagram: string | null
          nome: string
          oferta: string | null
          operation_id: string
          pontos_fortes: string | null
          pontos_fracos: string | null
          posicionamento: string | null
          ticket_estimado: string | null
          url: string | null
        }
        Insert: {
          angulos_criativos?: Json
          created_at?: string
          fonte?: string | null
          id?: string
          instagram?: string | null
          nome: string
          oferta?: string | null
          operation_id: string
          pontos_fortes?: string | null
          pontos_fracos?: string | null
          posicionamento?: string | null
          ticket_estimado?: string | null
          url?: string | null
        }
        Update: {
          angulos_criativos?: Json
          created_at?: string
          fonte?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          oferta?: string | null
          operation_id?: string
          pontos_fortes?: string | null
          pontos_fracos?: string | null
          posicionamento?: string | null
          ticket_estimado?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_reports: {
        Row: {
          content: Json
          cost_usd: number | null
          generated_at: string
          id: string
          model: string | null
          operation_id: string
        }
        Insert: {
          content?: Json
          cost_usd?: number | null
          generated_at?: string
          id?: string
          model?: string | null
          operation_id: string
        }
        Update: {
          content?: Json
          cost_usd?: number | null
          generated_at?: string
          id?: string
          model?: string | null
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparison_reports_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: true
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          blueprint_id: string
          created_at: string
          formato: string
          id: string
          storage_path: string | null
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          formato: string
          id?: string
          storage_path?: string | null
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          formato?: string
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      method_profiles: {
        Row: {
          extensoes: Json
          id: string
          nicho: string
          posicionamento: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          extensoes?: Json
          id?: string
          nicho: string
          posicionamento: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          extensoes?: Json
          id?: string
          nicho?: string
          posicionamento?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_events: {
        Row: {
          competitor_id: string | null
          competitor_nome: string
          created_at: string
          detected_at: string
          event_type: string
          fonte: string | null
          id: string
          operation_id: string
          resumo: string | null
          scan_id: string
          titulo: string
          url: string | null
        }
        Insert: {
          competitor_id?: string | null
          competitor_nome: string
          created_at?: string
          detected_at?: string
          event_type: string
          fonte?: string | null
          id?: string
          operation_id: string
          resumo?: string | null
          scan_id?: string
          titulo: string
          url?: string | null
        }
        Update: {
          competitor_id?: string | null
          competitor_nome?: string
          created_at?: string
          detected_at?: string
          event_type?: string
          fonte?: string | null
          id?: string
          operation_id?: string
          resumo?: string | null
          scan_id?: string
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intel_events_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_events_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_metrics: {
        Row: {
          agendamentos: number
          conteudos_criados: number
          conteudos_publicados: number
          created_at: string
          id: string
          leads_captados: number
          notas: string | null
          operation_id: string
          period_month: string
          reunioes_realizadas: number
          updated_at: string
        }
        Insert: {
          agendamentos?: number
          conteudos_criados?: number
          conteudos_publicados?: number
          created_at?: string
          id?: string
          leads_captados?: number
          notas?: string | null
          operation_id: string
          period_month: string
          reunioes_realizadas?: number
          updated_at?: string
        }
        Update: {
          agendamentos?: number
          conteudos_criados?: number
          conteudos_publicados?: number
          created_at?: string
          id?: string
          leads_captados?: number
          notas?: string | null
          operation_id?: string
          period_month?: string
          reunioes_realizadas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_metrics_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          concorrentes_seeds: Json
          cost_usd: number | null
          created_at: string
          created_by: string
          current_phase: string | null
          error: string | null
          finished_at: string | null
          id: string
          intel_scan_hours: number
          job_mode: string
          last_intel_scan_at: string | null
          modelo_entrega: string
          nicho: string
          operador_perfil: Json | null
          operador_tipo: string
          posicionamento: string
          refine_params: Json | null
          content_params: Json | null
          restricoes: string
          status: string
          ticket_alvo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          concorrentes_seeds?: Json
          cost_usd?: number | null
          created_at?: string
          created_by: string
          current_phase?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          intel_scan_hours?: number
          job_mode?: string
          last_intel_scan_at?: string | null
          modelo_entrega: string
          nicho: string
          operador_perfil?: Json | null
          operador_tipo?: string
          posicionamento: string
          refine_params?: Json | null
          content_params?: Json | null
          restricoes?: string
          status?: string
          ticket_alvo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          concorrentes_seeds?: Json
          cost_usd?: number | null
          created_at?: string
          created_by?: string
          current_phase?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          intel_scan_hours?: number
          job_mode?: string
          last_intel_scan_at?: string | null
          modelo_entrega?: string
          nicho?: string
          operador_perfil?: Json | null
          operador_tipo?: string
          posicionamento?: string
          refine_params?: Json | null
          content_params?: Json | null
          restricoes?: string
          status?: string
          ticket_alvo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_events: {
        Row: {
          finished_at: string | null
          id: string
          log: string | null
          operation_id: string
          phase: string
          started_at: string | null
          status: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          log?: string | null
          operation_id: string
          phase: string
          started_at?: string | null
          status?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          log?: string | null
          operation_id?: string
          phase?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_events_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          hera_premium_client_id: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          hera_premium_client_id?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          hera_premium_client_id?: string | null
          id?: string
          name?: string
          owner_id?: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
