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
      assinaturas: {
        Row: {
          aviso_renovacao_enviado: boolean
          cancelada_em: string | null
          created_at: string
          empreendimento_id: string | null
          expira_em: string | null
          external_subscription_id: string | null
          id: string
          iniciada_em: string | null
          metadata: Json | null
          plano_id: string
          renovacao_automatica: boolean
          status: Database["public"]["Enums"]["assinatura_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          aviso_renovacao_enviado?: boolean
          cancelada_em?: string | null
          created_at?: string
          empreendimento_id?: string | null
          expira_em?: string | null
          external_subscription_id?: string | null
          id?: string
          iniciada_em?: string | null
          metadata?: Json | null
          plano_id: string
          renovacao_automatica?: boolean
          status?: Database["public"]["Enums"]["assinatura_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          aviso_renovacao_enviado?: boolean
          cancelada_em?: string | null
          created_at?: string
          empreendimento_id?: string | null
          expira_em?: string | null
          external_subscription_id?: string | null
          id?: string
          iniciada_em?: string | null
          metadata?: Json | null
          plano_id?: string
          renovacao_automatica?: boolean
          status?: Database["public"]["Enums"]["assinatura_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          corretor_id: string
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          finalizado_em: string | null
          id: string
          iniciado_em: string
          observacoes: string | null
          plantao_id: string | null
          status: Database["public"]["Enums"]["atendimento_status"]
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          corretor_id: string
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          observacoes?: string | null
          plantao_id?: string | null
          status?: Database["public"]["Enums"]["atendimento_status"]
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          corretor_id?: string
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          observacoes?: string | null
          plantao_id?: string | null
          status?: Database["public"]["Enums"]["atendimento_status"]
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          recurso: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          recurso?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          recurso?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      avisos_renovacao: {
        Row: {
          assinatura_id: string
          canal: string
          enviado_em: string
          id: string
          payload: Json | null
          status: string
          tipo: string
          user_id: string
        }
        Insert: {
          assinatura_id: string
          canal?: string
          enviado_em?: string
          id?: string
          payload?: Json | null
          status?: string
          tipo: string
          user_id: string
        }
        Update: {
          assinatura_id?: string
          canal?: string
          enviado_em?: string
          id?: string
          payload?: Json | null
          status?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_renovacao_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      corretores: {
        Row: {
          ativo: boolean
          created_at: string
          creci: string | null
          email: string | null
          empreendimento_id: string
          equipe: string | null
          foto_url: string | null
          id: string
          nome: string
          ordem_roleta: number
          status_habilitacao: string
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          creci?: string | null
          email?: string | null
          empreendimento_id: string
          equipe?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          ordem_roleta?: number
          status_habilitacao?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          creci?: string | null
          email?: string | null
          empreendimento_id?: string
          equipe?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          ordem_roleta?: number
          status_habilitacao?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corretores_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          assunto: string
          created_at: string
          destinatario: string
          empreendimento_id: string | null
          id: string
          payload: Json | null
          status: string
        }
        Insert: {
          assunto: string
          created_at?: string
          destinatario: string
          empreendimento_id?: string | null
          id?: string
          payload?: Json | null
          status: string
        }
        Update: {
          assunto?: string
          created_at?: string
          destinatario?: string
          empreendimento_id?: string | null
          id?: string
          payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      empreendimentos: {
        Row: {
          ativo: boolean
          ciclo_roleta: string
          cnpj: string | null
          cor_destaque: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          criado_por: string | null
          endereco: string | null
          equipe_alfa_nome: string
          equipe_beta_nome: string
          horario_comercial_fim: string | null
          horario_comercial_inicio: string | null
          horario_matutino_fim: string | null
          horario_matutino_inicio: string | null
          horario_vespertino_fim: string | null
          horario_vespertino_inicio: string | null
          id: string
          ip_homologado: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          metodos_presenca: string[]
          nome: string
          pin_intervalo_min: number
          qrcode_token: string | null
          raio_metros: number
          regras_pdf_url: string | null
          roleta_auto_horarios: string[]
          roleta_automatica: boolean
          updated_at: string
          whatsapp_grupo_url: string | null
          wifi_ssid: string | null
        }
        Insert: {
          ativo?: boolean
          ciclo_roleta?: string
          cnpj?: string | null
          cor_destaque?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          criado_por?: string | null
          endereco?: string | null
          equipe_alfa_nome?: string
          equipe_beta_nome?: string
          horario_comercial_fim?: string | null
          horario_comercial_inicio?: string | null
          horario_matutino_fim?: string | null
          horario_matutino_inicio?: string | null
          horario_vespertino_fim?: string | null
          horario_vespertino_inicio?: string | null
          id?: string
          ip_homologado?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metodos_presenca?: string[]
          nome: string
          pin_intervalo_min?: number
          qrcode_token?: string | null
          raio_metros?: number
          regras_pdf_url?: string | null
          roleta_auto_horarios?: string[]
          roleta_automatica?: boolean
          updated_at?: string
          whatsapp_grupo_url?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          ativo?: boolean
          ciclo_roleta?: string
          cnpj?: string | null
          cor_destaque?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          criado_por?: string | null
          endereco?: string | null
          equipe_alfa_nome?: string
          equipe_beta_nome?: string
          horario_comercial_fim?: string | null
          horario_comercial_inicio?: string | null
          horario_matutino_fim?: string | null
          horario_matutino_inicio?: string | null
          horario_vespertino_fim?: string | null
          horario_vespertino_inicio?: string | null
          id?: string
          ip_homologado?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metodos_presenca?: string[]
          nome?: string
          pin_intervalo_min?: number
          qrcode_token?: string | null
          raio_metros?: number
          regras_pdf_url?: string | null
          roleta_auto_horarios?: string[]
          roleta_automatica?: boolean
          updated_at?: string
          whatsapp_grupo_url?: string | null
          wifi_ssid?: string | null
        }
        Relationships: []
      }
      escala_semanal: {
        Row: {
          corretor_id: string | null
          created_at: string
          criado_por: string | null
          data: string
          empreendimento_id: string
          equipe: string
          id: string
        }
        Insert: {
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          data: string
          empreendimento_id: string
          equipe: string
          id?: string
        }
        Update: {
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          empreendimento_id?: string
          equipe?: string
          id?: string
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          empreendimento_id: string
          id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          empreendimento_id: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          empreendimento_id?: string
          id?: string
        }
        Relationships: []
      }
      historico_semanal: {
        Row: {
          created_at: string
          empreendimento_id: string
          id: string
          payload: Json
          semana_fim: string
          semana_inicio: string
        }
        Insert: {
          created_at?: string
          empreendimento_id: string
          id?: string
          payload: Json
          semana_fim: string
          semana_inicio: string
        }
        Update: {
          created_at?: string
          empreendimento_id?: string
          id?: string
          payload?: Json
          semana_fim?: string
          semana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_semanal_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_crm: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          empreendimento_id: string | null
          headers: Json | null
          id: string
          nome: string
          provider: string
          secret: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          headers?: Json | null
          id?: string
          nome: string
          provider?: string
          secret?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          headers?: Json | null
          id?: string
          nome?: string
          provider?: string
          secret?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          ativa: boolean
          autor_id: string | null
          canal: string
          corpo: string
          created_at: string
          destinatarios: string
          empreendimento_id: string
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          autor_id?: string | null
          canal?: string
          corpo: string
          created_at?: string
          destinatarios?: string
          empreendimento_id: string
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          autor_id?: string | null
          canal?: string
          corpo?: string
          created_at?: string
          destinatarios?: string
          empreendimento_id?: string
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      opcoes_triagem: {
        Row: {
          action: string
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          label: string
          ordem: number
          updated_at: string
        }
        Insert: {
          action: string
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          action?: string
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          assinatura_id: string | null
          created_at: string
          external_id: string | null
          external_status: string | null
          id: string
          metodo: string | null
          moeda: string
          pago_em: string | null
          payload: Json | null
          plano_id: string | null
          provider: string
          status: Database["public"]["Enums"]["pagamento_status"]
          updated_at: string
          user_id: string
          valor_centavos: number
        }
        Insert: {
          assinatura_id?: string | null
          created_at?: string
          external_id?: string | null
          external_status?: string | null
          id?: string
          metodo?: string | null
          moeda?: string
          pago_em?: string | null
          payload?: Json | null
          plano_id?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          user_id: string
          valor_centavos: number
        }
        Update: {
          assinatura_id?: string | null
          created_at?: string
          external_id?: string | null
          external_status?: string | null
          id?: string
          metodo?: string | null
          moeda?: string
          pago_em?: string | null
          payload?: Json | null
          plano_id?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          user_id?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          beneficios: Json | null
          ciclo: Database["public"]["Enums"]["ciclo_plano"]
          codigo: string
          created_at: string
          descricao: string | null
          destaque: boolean
          dias_duracao: number
          id: string
          moeda: string
          nome: string
          ordem: number
          preco_centavos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          beneficios?: Json | null
          ciclo: Database["public"]["Enums"]["ciclo_plano"]
          codigo: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dias_duracao: number
          id?: string
          moeda?: string
          nome: string
          ordem?: number
          preco_centavos: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          beneficios?: Json | null
          ciclo?: Database["public"]["Enums"]["ciclo_plano"]
          codigo?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dias_duracao?: number
          id?: string
          moeda?: string
          nome?: string
          ordem?: number
          preco_centavos?: number
          updated_at?: string
        }
        Relationships: []
      }
      plantoes: {
        Row: {
          corretor_id: string
          created_at: string
          data: string
          empreendimento_id: string
          hora_fim: string
          hora_inicio: string
          id: string
          presenca_confirmada_em: string | null
          presenca_lat: number | null
          presenca_lng: number | null
          status: Database["public"]["Enums"]["plantao_status"]
        }
        Insert: {
          corretor_id: string
          created_at?: string
          data: string
          empreendimento_id: string
          hora_fim: string
          hora_inicio: string
          id?: string
          presenca_confirmada_em?: string | null
          presenca_lat?: number | null
          presenca_lng?: number | null
          status?: Database["public"]["Enums"]["plantao_status"]
        }
        Update: {
          corretor_id?: string
          created_at?: string
          data?: string
          empreendimento_id?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          presenca_confirmada_em?: string | null
          presenca_lat?: number | null
          presenca_lng?: number | null
          status?: Database["public"]["Enums"]["plantao_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plantoes_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantoes_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      triagens: {
        Row: {
          acao: string
          atendimento_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          opcao_codigo: string
          origem: string
          payload: Json | null
        }
        Insert: {
          acao: string
          atendimento_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          opcao_codigo: string
          origem?: string
          payload?: Json | null
        }
        Update: {
          acao?: string
          atendimento_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          opcao_codigo?: string
          origem?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "triagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empreendimento_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empreendimento_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empreendimento_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assinatura_status: {
        Args: { _uid?: string }
        Returns: {
          assinatura_id: string
          dias_duracao: number
          dias_restantes: number
          expira_em: string
          plano_codigo: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_empreendimento: {
        Args: {
          _empreendimento_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      is_master_email: { Args: { _email: string }; Returns: boolean }
      reset_escala_semanal: { Args: never; Returns: undefined }
      user_in_empreendimento: {
        Args: { _emp: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "incorporadora" | "gerente" | "coordenador" | "corretor"
      assinatura_status:
        | "pendente"
        | "ativa"
        | "cancelada"
        | "expirada"
        | "inadimplente"
        | "trial"
      atendimento_status:
        | "aberto"
        | "em_negociacao"
        | "fechado"
        | "perdido"
        | "transferido"
      ciclo_plano: "mensal" | "trimestral" | "anual"
      pagamento_status:
        | "pendente"
        | "aprovado"
        | "recusado"
        | "estornado"
        | "cancelado"
      plantao_status: "agendado" | "em_andamento" | "concluido" | "cancelado"
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
      app_role: ["incorporadora", "gerente", "coordenador", "corretor"],
      assinatura_status: [
        "pendente",
        "ativa",
        "cancelada",
        "expirada",
        "inadimplente",
        "trial",
      ],
      atendimento_status: [
        "aberto",
        "em_negociacao",
        "fechado",
        "perdido",
        "transferido",
      ],
      ciclo_plano: ["mensal", "trimestral", "anual"],
      pagamento_status: [
        "pendente",
        "aprovado",
        "recusado",
        "estornado",
        "cancelado",
      ],
      plantao_status: ["agendado", "em_andamento", "concluido", "cancelado"],
    },
  },
} as const
