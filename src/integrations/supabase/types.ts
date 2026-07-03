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
      admin_activity_events: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          area: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          meta: Json
          path: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          area: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
          path?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          area?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
          path?: string | null
        }
        Relationships: []
      }
      admin_audit: {
        Row: {
          acao: string
          created_at: string | null
          id: number
          oportunidade_id: string | null
          payload: Json | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string | null
          id?: never
          oportunidade_id?: string | null
          payload?: Json | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string | null
          id?: never
          oportunidade_id?: string | null
          payload?: Json | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_pages: {
        Row: {
          affiliate_name: string
          basic_url: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          premium_url: string
          slug: string
          updated_at: string
        }
        Insert: {
          affiliate_name: string
          basic_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          premium_url: string
          slug: string
          updated_at?: string
        }
        Update: {
          affiliate_name?: string
          basic_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          premium_url?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_name: string
          id: string
          meta: Json | null
          path: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name: string
          id?: string
          meta?: Json | null
          path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Update: {
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string
          id?: string
          meta?: Json | null
          path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      anonymous_course_suggestions_rate_limit: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: unknown
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
        }
        Relationships: []
      }
      atualizacoes_oportunidade: {
        Row: {
          created_at: string
          created_by: string | null
          data_atualizacao: string
          id: string
          oportunidade_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_atualizacao?: string
          id?: string
          oportunidade_id: string
          texto: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_atualizacao?: string
          id?: string
          oportunidade_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atualizacoes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      brevo_config: {
        Row: {
          allow_resend_welcome: boolean
          api_key_encrypted: string | null
          created_at: string
          default_list_id: string
          default_tags: string[]
          error_message_already_subscribed: string
          error_message_generic: string
          id: string
          opt_in_mode: string
          success_message_doi: string
          success_message_single: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          allow_resend_welcome?: boolean
          api_key_encrypted?: string | null
          created_at?: string
          default_list_id?: string
          default_tags?: string[]
          error_message_already_subscribed?: string
          error_message_generic?: string
          id?: string
          opt_in_mode?: string
          success_message_doi?: string
          success_message_single?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          allow_resend_welcome?: boolean
          api_key_encrypted?: string | null
          created_at?: string
          default_list_id?: string
          default_tags?: string[]
          error_message_already_subscribed?: string
          error_message_generic?: string
          id?: string
          opt_in_mode?: string
          success_message_doi?: string
          success_message_single?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      coleta_config: {
        Row: {
          ano_alvo: number
          caminhos_bloqueados: Json
          caminhos_permitidos: Json
          created_at: string
          escopo: string
          extensoes_bloqueadas: Json
          id: string
          limite_paginas: number
          limite_resultados: number
          profundidade: number
          tema_consulta: string | null
          updated_at: string
        }
        Insert: {
          ano_alvo?: number
          caminhos_bloqueados?: Json
          caminhos_permitidos?: Json
          created_at?: string
          escopo?: string
          extensoes_bloqueadas?: Json
          id?: string
          limite_paginas?: number
          limite_resultados?: number
          profundidade?: number
          tema_consulta?: string | null
          updated_at?: string
        }
        Update: {
          ano_alvo?: number
          caminhos_bloqueados?: Json
          caminhos_permitidos?: Json
          created_at?: string
          escopo?: string
          extensoes_bloqueadas?: Json
          id?: string
          limite_paginas?: number
          limite_resultados?: number
          profundidade?: number
          tema_consulta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coleta_run_items: {
        Row: {
          ano_alvo: number
          created_at: string
          data_coleta: string
          dominio: string
          hash_conteudo: string | null
          id: string
          meta_obs: string | null
          metodo_coleta: string
          motivo_descartar: string | null
          run_id: string
          status: string
          texto_bruto: string | null
          tipo_pagina: string
          url: string
        }
        Insert: {
          ano_alvo: number
          created_at?: string
          data_coleta?: string
          dominio: string
          hash_conteudo?: string | null
          id?: string
          meta_obs?: string | null
          metodo_coleta: string
          motivo_descartar?: string | null
          run_id: string
          status?: string
          texto_bruto?: string | null
          tipo_pagina?: string
          url: string
        }
        Update: {
          ano_alvo?: number
          created_at?: string
          data_coleta?: string
          dominio?: string
          hash_conteudo?: string | null
          id?: string
          meta_obs?: string | null
          metodo_coleta?: string
          motivo_descartar?: string | null
          run_id?: string
          status?: string
          texto_bruto?: string | null
          tipo_pagina?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "coleta_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "coleta_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      coleta_runs: {
        Row: {
          ano_alvo: number
          created_at: string
          executed_at: string
          filtros_snapshot: Json
          id: string
          limite_paginas: number | null
          limite_resultados: number | null
          profundidade: number | null
          sites_env: Json
          status_execucao: string
          tema_consulta: string | null
          tipo_coleta: string
          total_erros: number
          total_ignoradas: number
          total_novas: number
          total_urls: number
        }
        Insert: {
          ano_alvo: number
          created_at?: string
          executed_at?: string
          filtros_snapshot?: Json
          id?: string
          limite_paginas?: number | null
          limite_resultados?: number | null
          profundidade?: number | null
          sites_env?: Json
          status_execucao?: string
          tema_consulta?: string | null
          tipo_coleta: string
          total_erros?: number
          total_ignoradas?: number
          total_novas?: number
          total_urls?: number
        }
        Update: {
          ano_alvo?: number
          created_at?: string
          executed_at?: string
          filtros_snapshot?: Json
          id?: string
          limite_paginas?: number | null
          limite_resultados?: number | null
          profundidade?: number | null
          sites_env?: Json
          status_execucao?: string
          tema_consulta?: string | null
          tipo_coleta?: string
          total_erros?: number
          total_ignoradas?: number
          total_novas?: number
          total_urls?: number
        }
        Relationships: []
      }
      concursos_analyzed_urls: {
        Row: {
          analyzed_at: string
          ano: number | null
          content_hash: string | null
          created_at: string
          id: string
          ignore_reason: string | null
          ignored: boolean
          orgao: string | null
          situacao: string | null
          tema: string | null
          tipo: string | null
          url: string
          url_hash: string
        }
        Insert: {
          analyzed_at?: string
          ano?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          ignore_reason?: string | null
          ignored?: boolean
          orgao?: string | null
          situacao?: string | null
          tema?: string | null
          tipo?: string | null
          url: string
          url_hash: string
        }
        Update: {
          analyzed_at?: string
          ano?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          ignore_reason?: string | null
          ignored?: boolean
          orgao?: string | null
          situacao?: string | null
          tema?: string | null
          tipo?: string | null
          url?: string
          url_hash?: string
        }
        Relationships: []
      }
      concursos_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      concursos_pending_items: {
        Row: {
          abrangencia_detectada: string | null
          ai_engine: string | null
          ai_executed_at: string | null
          ai_response: Json | null
          ano_detectado: number | null
          banca_detectada: string | null
          categoria_detectada: string | null
          collected_at: string
          confiabilidade: number | null
          created_at: string
          curated_at: string | null
          curated_by: string | null
          escolaridade_detectada: string | null
          id: string
          link_edital: string | null
          oportunidade_id: string | null
          orgao_detectado: string | null
          rejection_reason: string | null
          resumo_editorial: string | null
          situacao_detectada: string | null
          source_domain: string | null
          source_title: string | null
          source_url: string
          status: string
          tipo_detectado: string | null
          titulo_sugerido: string | null
          updated_at: string
        }
        Insert: {
          abrangencia_detectada?: string | null
          ai_engine?: string | null
          ai_executed_at?: string | null
          ai_response?: Json | null
          ano_detectado?: number | null
          banca_detectada?: string | null
          categoria_detectada?: string | null
          collected_at?: string
          confiabilidade?: number | null
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          escolaridade_detectada?: string | null
          id?: string
          link_edital?: string | null
          oportunidade_id?: string | null
          orgao_detectado?: string | null
          rejection_reason?: string | null
          resumo_editorial?: string | null
          situacao_detectada?: string | null
          source_domain?: string | null
          source_title?: string | null
          source_url: string
          status?: string
          tipo_detectado?: string | null
          titulo_sugerido?: string | null
          updated_at?: string
        }
        Update: {
          abrangencia_detectada?: string | null
          ai_engine?: string | null
          ai_executed_at?: string | null
          ai_response?: Json | null
          ano_detectado?: number | null
          banca_detectada?: string | null
          categoria_detectada?: string | null
          collected_at?: string
          confiabilidade?: number | null
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          escolaridade_detectada?: string | null
          id?: string
          link_edital?: string | null
          oportunidade_id?: string | null
          orgao_detectado?: string | null
          rejection_reason?: string | null
          resumo_editorial?: string | null
          situacao_detectada?: string | null
          source_domain?: string | null
          source_title?: string | null
          source_url?: string
          status?: string
          tipo_detectado?: string | null
          titulo_sugerido?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concursos_pending_items_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concursos_pending_items_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          audit_score_after: number | null
          audit_score_before: number | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          field_data: Json
          id: string
          previous_version_id: string | null
          profile_key: string
          source: string
          summary: string | null
          url: string
        }
        Insert: {
          audit_score_after?: number | null
          audit_score_before?: number | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          field_data?: Json
          id?: string
          previous_version_id?: string | null
          profile_key: string
          source?: string
          summary?: string | null
          url: string
        }
        Update: {
          audit_score_after?: number | null
          audit_score_before?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          field_data?: Json
          id?: string
          previous_version_id?: string | null
          profile_key?: string
          source?: string
          summary?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_suggestions: {
        Row: {
          created_at: string
          id: string
          is_anonymous: boolean | null
          status: string | null
          suggestion: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          status?: string | null
          suggestion: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          status?: string | null
          suggestion?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      course_votes: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_votes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "active_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_votes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_votes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          affiliate_link: string | null
          badge: Database["public"]["Enums"]["course_badge"] | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          downvotes: number | null
          duration: string
          id: string
          image_url: string | null
          institution: string
          is_active: boolean
          is_hidden: boolean
          level: string
          price: string
          rating: number
          students: number
          title: string
          updated_at: string
          updated_by: string | null
          upvotes: number | null
          views: number
          vote_score: number | null
        }
        Insert: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          downvotes?: number | null
          duration: string
          id?: string
          image_url?: string | null
          institution: string
          is_active?: boolean
          is_hidden?: boolean
          level: string
          price: string
          rating?: number
          students?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          upvotes?: number | null
          views?: number
          vote_score?: number | null
        }
        Update: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          downvotes?: number | null
          duration?: string
          id?: string
          image_url?: string | null
          institution?: string
          is_active?: boolean
          is_hidden?: boolean
          level?: string
          price?: string
          rating?: number
          students?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          upvotes?: number | null
          views?: number
          vote_score?: number | null
        }
        Relationships: []
      }
      curation_page_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_type: string | null
          order: number
          page_id: string
          tool_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          order?: number
          page_id: string
          tool_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          order?: number
          page_id?: string
          tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curation_page_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "curation_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curation_page_items_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curation_page_items_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      curation_pages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          card_image_url: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_visible: boolean
          sort_order: number
          status: Database["public"]["Enums"]["feature_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          card_image_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["feature_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          card_image_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["feature_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      feature_votes: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_votes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_requests_with_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_oportunidade: {
        Row: {
          created_at: string
          id: string
          oportunidade_id: string
          source_date: string | null
          source_tipo: string
          source_title: string | null
          source_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          oportunidade_id: string
          source_date?: string | null
          source_tipo: string
          source_title?: string | null
          source_url: string
        }
        Update: {
          created_at?: string
          id?: string
          oportunidade_id?: string
          source_date?: string | null
          source_tipo?: string
          source_title?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fontes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fontes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: string
          report_reason: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction: string
          report_reason?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: string
          report_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "guide_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_comments: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          content: string
          created_at: string
          edited_at: string | null
          guide_id: string
          helpful_count: number
          id: string
          is_pinned: boolean
          not_helpful_count: number
          report_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          edited_at?: string | null
          guide_id: string
          helpful_count?: number
          id?: string
          is_pinned?: boolean
          not_helpful_count?: number
          report_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          edited_at?: string | null
          guide_id?: string
          helpful_count?: number
          id?: string
          is_pinned?: boolean
          not_helpful_count?: number
          report_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_comments_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_flow_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          extraction_status: string
          id: string
          is_active: boolean
          sort_order: number
          source_bucket: string | null
          source_path: string | null
          source_type: string
          synced_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          extraction_status?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          source_bucket?: string | null
          source_path?: string | null
          source_type?: string
          synced_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          extraction_status?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          source_bucket?: string | null
          source_path?: string | null
          source_type?: string
          synced_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guide_moderation_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          meta: Json
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      guide_public_categories: {
        Row: {
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          is_active?: boolean
          name: string
          sort_order: number
        }
        Update: {
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      guide_related_contests: {
        Row: {
          contest_id: string
          created_at: string
          guide_id: string
          id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          guide_id: string
          id?: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          guide_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_related_contests_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_related_contests_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_related_contests_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_related_guides: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          related_guide_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          related_guide_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          related_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_related_guides_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_related_guides_related_guide_id_fkey"
            columns: ["related_guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_related_tools: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          tool_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_related_tools_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_related_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_related_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_user_moderation: {
        Row: {
          approved_count: number
          is_banned: boolean
          suspended_until: string | null
          updated_at: string
          user_id: string
          warning_count: number
        }
        Insert: {
          approved_count?: number
          is_banned?: boolean
          suspended_until?: string | null
          updated_at?: string
          user_id: string
          warning_count?: number
        }
        Update: {
          approved_count?: number
          is_banned?: boolean
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      guides: {
        Row: {
          author_name: string
          category: string
          content_markdown: string
          cover_image_url: string | null
          created_at: string
          cta_final_label: string | null
          cta_final_text: string | null
          cta_final_url: string | null
          cta_middle_label: string | null
          cta_middle_text: string | null
          cta_middle_url: string | null
          cta_top_label: string | null
          cta_top_text: string | null
          cta_top_url: string | null
          flow_data: Json | null
          id: string
          internal_code: string
          internal_links: Json | null
          is_featured: boolean
          is_published: boolean
          public_category: string
          seo_description: string
          seo_title: string
          short_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_name?: string
          category: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          flow_data?: Json | null
          id?: string
          internal_code: string
          internal_links?: Json | null
          is_featured?: boolean
          is_published?: boolean
          public_category?: string
          seo_description?: string
          seo_title?: string
          short_description: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_name?: string
          category?: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          flow_data?: Json | null
          id?: string
          internal_code?: string
          internal_links?: Json | null
          is_featured?: boolean
          is_published?: boolean
          public_category?: string
          seo_description?: string
          seo_title?: string
          short_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      insights_audit_findings: {
        Row: {
          audit_type: string
          created_at: string
          id: string
          issues: Json
          path: string
          raw: Json
          run_id: string
          score: number
          url: string
        }
        Insert: {
          audit_type: string
          created_at?: string
          id?: string
          issues?: Json
          path: string
          raw?: Json
          run_id: string
          score?: number
          url: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          id?: string
          issues?: Json
          path?: string
          raw?: Json
          run_id?: string
          score?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "insights_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      insights_audit_runs: {
        Row: {
          audit_type: string
          created_at: string
          finished_at: string | null
          id: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          summary: Json | null
        }
        Insert: {
          audit_type: string
          created_at?: string
          finished_at?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          summary?: Json | null
        }
        Update: {
          audit_type?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          summary?: Json | null
        }
        Relationships: []
      }
      itens_brutos: {
        Row: {
          ano_alvo: number
          created_at: string
          data_coleta: string
          dominio: string
          hash_conteudo: string | null
          id: string
          meta_obs: string | null
          metodo_coleta: string
          motivo_status: string | null
          status: string
          texto_bruto: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ano_alvo?: number
          created_at?: string
          data_coleta?: string
          dominio: string
          hash_conteudo?: string | null
          id?: string
          meta_obs?: string | null
          metodo_coleta: string
          motivo_status?: string | null
          status?: string
          texto_bruto?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ano_alvo?: number
          created_at?: string
          data_coleta?: string
          dominio?: string
          hash_conteudo?: string | null
          id?: string
          meta_obs?: string | null
          metodo_coleta?: string
          motivo_status?: string | null
          status?: string
          texto_bruto?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          created_at: string
          id: string
          pdf_url: string | null
          route: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_url?: string | null
          route: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_url?: string | null
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_sections: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_items: {
        Row: {
          created_at: string
          href: string
          icon: string | null
          id: string
          is_active: boolean
          is_external: boolean
          is_new: boolean
          label: string
          open_in_new_tab: boolean
          order_index: number
          show_icon_desktop: boolean
          show_icon_mobile: boolean
          show_icon_tablet: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_external?: boolean
          is_new?: boolean
          label: string
          open_in_new_tab?: boolean
          order_index?: number
          show_icon_desktop?: boolean
          show_icon_mobile?: boolean
          show_icon_tablet?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_external?: boolean
          is_new?: boolean
          label?: string
          open_in_new_tab?: boolean
          order_index?: number
          show_icon_desktop?: boolean
          show_icon_mobile?: boolean
          show_icon_tablet?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      nav_settings: {
        Row: {
          default_h: string | null
          id: string
          logo_dark_url: string
          logo_href: string | null
          logo_light_url: string
          scrolled_backdrop_blur: string | null
          scrolled_bg_opacity: string | null
          scrolled_h: string | null
          scrolled_mt: string | null
          scrolled_px: string | null
          scrolled_rounded: string | null
          scrolled_width: string | null
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          default_h?: string | null
          id?: string
          logo_dark_url?: string
          logo_href?: string | null
          logo_light_url?: string
          scrolled_backdrop_blur?: string | null
          scrolled_bg_opacity?: string | null
          scrolled_h?: string | null
          scrolled_mt?: string | null
          scrolled_px?: string | null
          scrolled_rounded?: string | null
          scrolled_width?: string | null
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          default_h?: string | null
          id?: string
          logo_dark_url?: string
          logo_href?: string | null
          logo_light_url?: string
          scrolled_backdrop_blur?: string | null
          scrolled_bg_opacity?: string | null
          scrolled_h?: string | null
          scrolled_mt?: string | null
          scrolled_px?: string | null
          scrolled_rounded?: string | null
          scrolled_width?: string | null
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author: string | null
          category: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          image_url: string | null
          lang: string | null
          published_at: string
          source: string
          source_url: string
          summary: string
          title: string
          title_hash: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          lang?: string | null
          published_at: string
          source: string
          source_url: string
          summary: string
          title: string
          title_hash: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          lang?: string | null
          published_at?: string
          source?: string
          source_url?: string
          summary?: string
          title?: string
          title_hash?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      news_generation_logs: {
        Row: {
          candidates_fetched: number | null
          created_at: string
          discarded_duplicate_hash: number | null
          discarded_duplicate_semantic: number | null
          discarded_duplicate_topic: number | null
          discarded_duplicate_url: number | null
          discarded_old: number | null
          executed_by: string | null
          execution_details: Json | null
          id: string
          published_count: number | null
        }
        Insert: {
          candidates_fetched?: number | null
          created_at?: string
          discarded_duplicate_hash?: number | null
          discarded_duplicate_semantic?: number | null
          discarded_duplicate_topic?: number | null
          discarded_duplicate_url?: number | null
          discarded_old?: number | null
          executed_by?: string | null
          execution_details?: Json | null
          id?: string
          published_count?: number | null
        }
        Update: {
          candidates_fetched?: number | null
          created_at?: string
          discarded_duplicate_hash?: number | null
          discarded_duplicate_semantic?: number | null
          discarded_duplicate_topic?: number | null
          discarded_duplicate_url?: number | null
          discarded_old?: number | null
          executed_by?: string | null
          execution_details?: Json | null
          id?: string
          published_count?: number | null
        }
        Relationships: []
      }
      news_generator_config: {
        Row: {
          created_at: string
          duplicate_similarity_threshold: number
          id: string
          max_age_days: number
          max_candidates: number
          min_category_distance: number
          target_news_count: number
          topic_repost_days: number
          topic_similarity_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duplicate_similarity_threshold?: number
          id?: string
          max_age_days?: number
          max_candidates?: number
          min_category_distance?: number
          target_news_count?: number
          topic_repost_days?: number
          topic_similarity_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duplicate_similarity_threshold?: number
          id?: string
          max_age_days?: number
          max_candidates?: number
          min_category_distance?: number
          target_news_count?: number
          topic_repost_days?: number
          topic_similarity_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_bonus_pages: {
        Row: {
          cards: Json
          created_at: string
          id: string
          intro: string
          slug: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cards?: Json
          created_at?: string
          id?: string
          intro: string
          slug: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cards?: Json
          created_at?: string
          id?: string
          intro?: string
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_events: {
        Row: {
          created_at: string
          email_hash: string
          error_message: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          page_slug: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          email_hash: string
          error_message?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          page_slug?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          email_hash?: string
          error_message?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          page_slug?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      newsletter_rate_limit: {
        Row: {
          attempts: number
          created_at: string
          id: string
          ip_hash: string
          window_start: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          ip_hash: string
          window_start?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          brevo_synced_at: string | null
          confirmed: boolean
          confirmed_at: string | null
          consent_at: string | null
          created_at: string
          email: string
          id: string
          last_sync_attempt_at: string | null
          page_slug: string | null
          source: string
          subscribed_at: string
          sync_attempts: number
          sync_error: string | null
          sync_status: string
          unsubscribed_at: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          brevo_synced_at?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          consent_at?: string | null
          created_at?: string
          email: string
          id?: string
          last_sync_attempt_at?: string | null
          page_slug?: string | null
          source?: string
          subscribed_at?: string
          sync_attempts?: number
          sync_error?: string | null
          sync_status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          brevo_synced_at?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string
          id?: string
          last_sync_attempt_at?: string | null
          page_slug?: string | null
          source?: string
          subscribed_at?: string
          sync_attempts?: number
          sync_error?: string | null
          sync_status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      oportunidade_view_fingerprints: {
        Row: {
          created_at: string | null
          dia: string
          fp: string
          id: number
          oportunidade_id: string
          ua: string | null
        }
        Insert: {
          created_at?: string | null
          dia: string
          fp: string
          id?: never
          oportunidade_id: string
          ua?: string | null
        }
        Update: {
          created_at?: string | null
          dia?: string
          fp?: string
          id?: never
          oportunidade_id?: string
          ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_view_fingerprints_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_view_fingerprints_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidade_views: {
        Row: {
          created_at: string | null
          dia: string
          id: number
          oportunidade_id: string
          total: number
        }
        Insert: {
          created_at?: string | null
          dia: string
          id?: never
          oportunidade_id: string
          total?: number
        }
        Update: {
          created_at?: string | null
          dia?: string
          id?: never
          oportunidade_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_views_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_views_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          abrangencia: string
          banca: string | null
          categoria: string
          conteudo_html: string | null
          conteudo_markdown: string | null
          conteudo_principal: string | null
          created_at: string
          created_by: string | null
          data_publicacao: string
          deleted_at: string | null
          deleted_by: string | null
          escolaridade: string
          escolaridades: string[]
          id: string
          link_edital: string | null
          meta_description: string | null
          meta_title: string | null
          orgao: string | null
          publicado: boolean
          published_at: string | null
          resumo_editorial: string | null
          situacao: string
          slug: string
          slug_locked: boolean
          status_admin: string
          tipo: string
          titulo: string
          updated_at: string
          updated_by: string | null
          views_total: number
          visualizacoes: number
        }
        Insert: {
          abrangencia: string
          banca?: string | null
          categoria: string
          conteudo_html?: string | null
          conteudo_markdown?: string | null
          conteudo_principal?: string | null
          created_at?: string
          created_by?: string | null
          data_publicacao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          escolaridade: string
          escolaridades?: string[]
          id?: string
          link_edital?: string | null
          meta_description?: string | null
          meta_title?: string | null
          orgao?: string | null
          publicado?: boolean
          published_at?: string | null
          resumo_editorial?: string | null
          situacao: string
          slug: string
          slug_locked?: boolean
          status_admin?: string
          tipo: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          views_total?: number
          visualizacoes?: number
        }
        Update: {
          abrangencia?: string
          banca?: string | null
          categoria?: string
          conteudo_html?: string | null
          conteudo_markdown?: string | null
          conteudo_principal?: string | null
          created_at?: string
          created_by?: string | null
          data_publicacao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          escolaridade?: string
          escolaridades?: string[]
          id?: string
          link_edital?: string | null
          meta_description?: string | null
          meta_title?: string | null
          orgao?: string | null
          publicado?: boolean
          published_at?: string | null
          resumo_editorial?: string | null
          situacao?: string
          slug?: string
          slug_locked?: boolean
          status_admin?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          views_total?: number
          visualizacoes?: number
        }
        Relationships: []
      }
      oportunidades_audit: {
        Row: {
          action: string
          actor: string
          actor_email: string | null
          created_at: string
          id: string
          oportunidade_id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor: string
          actor_email?: string | null
          created_at?: string
          id?: string
          oportunidade_id: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor?: string
          actor_email?: string | null
          created_at?: string
          id?: string
          oportunidade_id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      oportunidades_slug_redirects: {
        Row: {
          created_at: string
          id: string
          old_slug: string
          oportunidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          old_slug: string
          oportunidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          old_slug?: string
          oportunidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_slug_redirects_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_slug_redirects_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      page_settings: {
        Row: {
          created_at: string
          header_description: string
          header_title: string
          id: string
          meta_description: string
          route: string
          title_tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          header_description: string
          header_title: string
          id?: string
          meta_description: string
          route: string
          title_tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          header_description?: string
          header_title?: string
          id?: string
          meta_description?: string
          route?: string
          title_tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          actor_type: string
          created_at: string
          id: string
          meta: Json | null
          path: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          actor_type?: string
          created_at?: string
          id?: string
          meta?: Json | null
          path: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          actor_type?: string
          created_at?: string
          id?: string
          meta?: Json | null
          path?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          logo_url: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      premium_items: {
        Row: {
          created_at: string
          created_by: string | null
          description_full: string | null
          description_short: string | null
          external_url: string | null
          id: string
          item_type: Database["public"]["Enums"]["premium_item_type"]
          logo_url: string | null
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_full?: string | null
          description_short?: string | null
          external_url?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["premium_item_type"]
          logo_url?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_full?: string | null
          description_short?: string | null
          external_url?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["premium_item_type"]
          logo_url?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      premium_page_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          page_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          page_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          page_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "premium_page_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "premium_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_page_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "premium_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_pages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          clicks_count: number
          created_at: string
          cta_url: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          clicks_count?: number
          created_at?: string
          cta_url: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          clicks_count?: number
          created_at?: string
          cta_url?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      redeem_tokens: {
        Row: {
          buyer_email: string | null
          cakto_event: string | null
          cakto_offer_id: string | null
          cakto_order_id: string | null
          cakto_product_id: string | null
          cakto_ref_id: string | null
          cakto_subscription_id: string | null
          created_at: string
          email_sent_at: string | null
          expires_at: string
          id: string
          plan_tier: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          revoked_at: string | null
          revoked_reason: string | null
          status: Database["public"]["Enums"]["redeem_token_status"]
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          cakto_event?: string | null
          cakto_offer_id?: string | null
          cakto_order_id?: string | null
          cakto_product_id?: string | null
          cakto_ref_id?: string | null
          cakto_subscription_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          expires_at: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["redeem_token_status"]
          token: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          cakto_event?: string | null
          cakto_offer_id?: string | null
          cakto_order_id?: string | null
          cakto_product_id?: string | null
          cakto_ref_id?: string | null
          cakto_subscription_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["redeem_token_status"]
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      saved_tools: {
        Row: {
          created_at: string
          id: string
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_findings: {
        Row: {
          category: string
          evidence: string | null
          fix: string | null
          id: string
          impact: string
          issue: string
          meta: Json | null
          priority: number
          run_id: string
          url_id: string
        }
        Insert: {
          category: string
          evidence?: string | null
          fix?: string | null
          id?: string
          impact: string
          issue: string
          meta?: Json | null
          priority?: number
          run_id: string
          url_id: string
        }
        Update: {
          category?: string
          evidence?: string | null
          fix?: string | null
          id?: string
          impact?: string
          issue?: string
          meta?: Json | null
          priority?: number
          run_id?: string
          url_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_audit_findings_url_id_fkey"
            columns: ["url_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          scheduled: boolean
          started_at: string | null
          status: string
          summary: Json | null
          urls_count: number
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          scheduled?: boolean
          started_at?: string | null
          status?: string
          summary?: Json | null
          urls_count?: number
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          scheduled?: boolean
          started_at?: string | null
          status?: string
          summary?: Json | null
          urls_count?: number
        }
        Relationships: []
      }
      seo_audit_urls: {
        Row: {
          canonical: string | null
          content_type: string | null
          h1: string | null
          h1_count: number
          h2_count: number
          health: string
          id: string
          meta_description: string | null
          og_present: boolean
          path: string
          robots_meta: string | null
          run_id: string
          schema_types: string[]
          score: number
          status_code: number | null
          title: string | null
          ttfb_ms: number | null
          url: string
        }
        Insert: {
          canonical?: string | null
          content_type?: string | null
          h1?: string | null
          h1_count?: number
          h2_count?: number
          health?: string
          id?: string
          meta_description?: string | null
          og_present?: boolean
          path: string
          robots_meta?: string | null
          run_id: string
          schema_types?: string[]
          score?: number
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          url: string
        }
        Update: {
          canonical?: string | null
          content_type?: string | null
          h1?: string | null
          h1_count?: number
          h2_count?: number
          health?: string
          id?: string
          meta_description?: string | null
          og_present?: boolean
          path?: string
          robots_meta?: string | null
          run_id?: string
          schema_types?: string[]
          score?: number
          status_code?: number | null
          title?: string | null
          ttfb_ms?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_urls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          plan_tier: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_plan_tier"]
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_related_guides: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          tool_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          tool_id?: string
        }
        Relationships: []
      }
      tool_related_tools: {
        Row: {
          created_at: string
          id: string
          related_tool_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_tool_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_tool_id?: string
          tool_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          attachment_url: string | null
          cons: string | null
          content_markdown: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          cta_final_label: string | null
          cta_final_text: string | null
          cta_final_url: string | null
          cta_middle_label: string | null
          cta_middle_text: string | null
          cta_middle_url: string | null
          cta_top_label: string | null
          cta_top_text: string | null
          cta_top_url: string | null
          description: string
          extra_markdown: string | null
          featured_end: string | null
          featured_indefinite: boolean
          featured_start: string | null
          how_helps: string | null
          icon_url: string | null
          id: string
          internal_links: Json
          is_featured: boolean
          is_visible: boolean
          name: string
          pros: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          sort_order: number
          tags: string[]
          updated_at: string
          updated_by: string | null
          url: string | null
          what_is: string | null
          who_for: string | null
        }
        Insert: {
          attachment_url?: string | null
          cons?: string | null
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          description: string
          extra_markdown?: string | null
          featured_end?: string | null
          featured_indefinite?: boolean
          featured_start?: string | null
          how_helps?: string | null
          icon_url?: string | null
          id?: string
          internal_links?: Json
          is_featured?: boolean
          is_visible?: boolean
          name: string
          pros?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          what_is?: string | null
          who_for?: string | null
        }
        Update: {
          attachment_url?: string | null
          cons?: string | null
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          description?: string
          extra_markdown?: string | null
          featured_end?: string | null
          featured_indefinite?: boolean
          featured_start?: string | null
          how_helps?: string | null
          icon_url?: string | null
          id?: string
          internal_links?: Json
          is_featured?: boolean
          is_visible?: boolean
          name?: string
          pros?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          what_is?: string | null
          who_for?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_update_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          section: string
          sort_order: number
          update_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          section: string
          sort_order?: number
          update_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          section?: string
          sort_order?: number
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_update_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "premium_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_update_items_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "weekly_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_updates: {
        Row: {
          created_at: string
          created_by: string | null
          highlight: string | null
          id: string
          intro: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          highlight?: string | null
          id?: string
          intro?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          highlight?: string | null
          id?: string
          intro?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_courses: {
        Row: {
          affiliate_link: string | null
          badge: Database["public"]["Enums"]["course_badge"] | null
          category: string | null
          created_at: string | null
          description: string | null
          dislikes: number | null
          downvotes: number | null
          duration: string | null
          id: string | null
          image_url: string | null
          institution: string | null
          is_active: boolean | null
          is_hidden: boolean | null
          level: string | null
          likes: number | null
          price: string | null
          rating: number | null
          students: number | null
          title: string | null
          updated_at: string | null
          upvotes: number | null
          views: number | null
          vote_score: number | null
        }
        Insert: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dislikes?: number | null
          downvotes?: number | null
          duration?: string | null
          id?: string | null
          image_url?: string | null
          institution?: string | null
          is_active?: boolean | null
          is_hidden?: boolean | null
          level?: string | null
          likes?: number | null
          price?: string | null
          rating?: number | null
          students?: number | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          views?: number | null
          vote_score?: number | null
        }
        Update: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dislikes?: number | null
          downvotes?: number | null
          duration?: string | null
          id?: string | null
          image_url?: string | null
          institution?: string | null
          is_active?: boolean | null
          is_hidden?: boolean | null
          level?: string | null
          likes?: number | null
          price?: string | null
          rating?: number | null
          students?: number | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          views?: number | null
          vote_score?: number | null
        }
        Relationships: []
      }
      active_partners: {
        Row: {
          display_order: number | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          partner_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          partner_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          partner_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      atualizacoes_oportunidade_public: {
        Row: {
          created_at: string | null
          data_atualizacao: string | null
          id: string | null
          oportunidade_id: string | null
          texto: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atualizacoes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      course_suggestions_me: {
        Row: {
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          status: string | null
          suggestion: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          status?: string | null
          suggestion?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          status?: string | null
          suggestion?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      course_suggestions_public: {
        Row: {
          is_anonymous: boolean | null
          status: string | null
          submission_date: string | null
          submitter_type: string | null
          suggestion_count: number | null
        }
        Relationships: []
      }
      courses_public: {
        Row: {
          affiliate_link: string | null
          badge: Database["public"]["Enums"]["course_badge"] | null
          category: string | null
          created_at: string | null
          description: string | null
          dislikes: number | null
          downvotes: number | null
          duration: string | null
          id: string | null
          image_url: string | null
          institution: string | null
          is_active: boolean | null
          is_hidden: boolean | null
          level: string | null
          likes: number | null
          price: string | null
          rating: number | null
          students: number | null
          title: string | null
          updated_at: string | null
          upvotes: number | null
          views: number | null
          vote_score: number | null
        }
        Insert: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dislikes?: number | null
          downvotes?: number | null
          duration?: string | null
          id?: string | null
          image_url?: string | null
          institution?: string | null
          is_active?: boolean | null
          is_hidden?: boolean | null
          level?: string | null
          likes?: number | null
          price?: string | null
          rating?: number | null
          students?: number | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          views?: number | null
          vote_score?: number | null
        }
        Update: {
          affiliate_link?: string | null
          badge?: Database["public"]["Enums"]["course_badge"] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dislikes?: number | null
          downvotes?: number | null
          duration?: string | null
          id?: string | null
          image_url?: string | null
          institution?: string | null
          is_active?: boolean | null
          is_hidden?: boolean | null
          level?: string | null
          likes?: number | null
          price?: string | null
          rating?: number | null
          students?: number | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          views?: number | null
          vote_score?: number | null
        }
        Relationships: []
      }
      feature_requests_with_votes: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_visible: boolean | null
          sort_order: number | null
          status: Database["public"]["Enums"]["feature_status"] | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
          votes_count: number | null
        }
        Relationships: []
      }
      fontes_oportunidade_public: {
        Row: {
          id: string | null
          oportunidade_id: string | null
          source_date: string | null
          source_tipo: string | null
          source_title: string | null
          source_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fontes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fontes_oportunidade_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_items_public: {
        Row: {
          href: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          is_external: boolean | null
          is_new: boolean | null
          label: string | null
          open_in_new_tab: boolean | null
          order_index: number | null
          show_icon_desktop: boolean | null
          show_icon_mobile: boolean | null
          show_icon_tablet: boolean | null
        }
        Insert: {
          href?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          is_external?: boolean | null
          is_new?: boolean | null
          label?: string | null
          open_in_new_tab?: boolean | null
          order_index?: number | null
          show_icon_desktop?: boolean | null
          show_icon_mobile?: boolean | null
          show_icon_tablet?: boolean | null
        }
        Update: {
          href?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          is_external?: boolean | null
          is_new?: boolean | null
          label?: string | null
          open_in_new_tab?: boolean | null
          order_index?: number | null
          show_icon_desktop?: boolean | null
          show_icon_mobile?: boolean | null
          show_icon_tablet?: boolean | null
        }
        Relationships: []
      }
      nav_settings_public: {
        Row: {
          default_h: string | null
          id: string | null
          logo_dark_url: string | null
          logo_href: string | null
          logo_light_url: string | null
          scrolled_backdrop_blur: string | null
          scrolled_bg_opacity: string | null
          scrolled_h: string | null
          scrolled_mt: string | null
          scrolled_px: string | null
          scrolled_rounded: string | null
          scrolled_width: string | null
          social_links: Json | null
        }
        Relationships: []
      }
      oportunidades_public: {
        Row: {
          abrangencia: string | null
          banca: string | null
          categoria: string | null
          conteudo_html: string | null
          conteudo_markdown: string | null
          conteudo_principal: string | null
          created_at: string | null
          data_publicacao: string | null
          escolaridade: string | null
          escolaridades: string[] | null
          id: string | null
          link_edital: string | null
          meta_description: string | null
          meta_title: string | null
          orgao: string | null
          published_at: string | null
          resumo_editorial: string | null
          situacao: string | null
          slug: string | null
          tipo: string | null
          titulo: string | null
          updated_at: string | null
          visualizacoes: number | null
        }
        Insert: {
          abrangencia?: string | null
          banca?: string | null
          categoria?: string | null
          conteudo_html?: string | null
          conteudo_markdown?: string | null
          conteudo_principal?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          escolaridade?: string | null
          escolaridades?: string[] | null
          id?: string | null
          link_edital?: string | null
          meta_description?: string | null
          meta_title?: string | null
          orgao?: string | null
          published_at?: string | null
          resumo_editorial?: string | null
          situacao?: string | null
          slug?: string | null
          tipo?: string | null
          titulo?: string | null
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Update: {
          abrangencia?: string | null
          banca?: string | null
          categoria?: string | null
          conteudo_html?: string | null
          conteudo_markdown?: string | null
          conteudo_principal?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          escolaridade?: string | null
          escolaridades?: string[] | null
          id?: string | null
          link_edital?: string | null
          meta_description?: string | null
          meta_title?: string | null
          orgao?: string | null
          published_at?: string | null
          resumo_editorial?: string | null
          situacao?: string | null
          slug?: string | null
          tipo?: string | null
          titulo?: string | null
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Relationships: []
      }
      partners_public: {
        Row: {
          display_order: number | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          partner_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          partner_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          partner_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tools_public: {
        Row: {
          attachment_url: string | null
          cons: string | null
          content_markdown: string | null
          cover_image_url: string | null
          created_at: string | null
          cta_final_label: string | null
          cta_final_text: string | null
          cta_final_url: string | null
          cta_middle_label: string | null
          cta_middle_text: string | null
          cta_middle_url: string | null
          cta_top_label: string | null
          cta_top_text: string | null
          cta_top_url: string | null
          description: string | null
          extra_markdown: string | null
          featured_end: string | null
          featured_indefinite: boolean | null
          featured_start: string | null
          how_helps: string | null
          icon_url: string | null
          id: string | null
          internal_links: Json | null
          is_featured: boolean | null
          is_visible: boolean | null
          name: string | null
          pros: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
          url: string | null
          what_is: string | null
          who_for: string | null
        }
        Insert: {
          attachment_url?: string | null
          cons?: string | null
          content_markdown?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          description?: string | null
          extra_markdown?: string | null
          featured_end?: string | null
          featured_indefinite?: boolean | null
          featured_start?: string | null
          how_helps?: string | null
          icon_url?: string | null
          id?: string | null
          internal_links?: Json | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          name?: string | null
          pros?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
          what_is?: string | null
          who_for?: string | null
        }
        Update: {
          attachment_url?: string | null
          cons?: string | null
          content_markdown?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cta_final_label?: string | null
          cta_final_text?: string | null
          cta_final_url?: string | null
          cta_middle_label?: string | null
          cta_middle_text?: string | null
          cta_middle_url?: string | null
          cta_top_label?: string | null
          cta_top_text?: string | null
          cta_top_url?: string | null
          description?: string | null
          extra_markdown?: string | null
          featured_end?: string | null
          featured_indefinite?: boolean | null
          featured_start?: string | null
          how_helps?: string | null
          icon_url?: string | null
          id?: string | null
          internal_links?: Json | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          name?: string | null
          pros?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
          what_is?: string | null
          who_for?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _guide_comment_has_link: { Args: { p_text: string }; Returns: boolean }
      _guide_comment_has_profanity: {
        Args: { p_text: string }
        Returns: boolean
      }
      _guide_comment_letter_count: { Args: { p_text: string }; Returns: number }
      admin_activity_actions_list: {
        Args: {
          end_at: string
          p_action?: string
          p_admin_user_id?: string
          p_area?: string
          p_limit?: number
          start_at: string
        }
        Returns: {
          action: string
          admin_email: string
          admin_user_id: string
          area: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          meta: Json
          path: string
        }[]
      }
      admin_activity_by_admin: {
        Args: { end_at: string; start_at: string }
        Returns: {
          admin_email: string
          admin_user_id: string
          last_activity: string
          total_actions: number
          unique_areas: number
        }[]
      }
      admin_activity_by_area: {
        Args: { end_at: string; start_at: string }
        Returns: {
          area: string
          last_activity: string
          total_actions: number
          unique_admins: number
        }[]
      }
      admin_activity_overview: {
        Args: { end_at: string; start_at: string }
        Returns: Json
      }
      admin_activity_timeline: {
        Args: { end_at: string; start_at: string }
        Returns: {
          day: string
          total_actions: number
          total_pageviews: number
        }[]
      }
      admin_get_user_moderation: { Args: { p_user_id: string }; Returns: Json }
      admin_moderate_guide_comment: {
        Args: { p_action: string; p_id: string }
        Returns: Json
      }
      admin_overview_activity: {
        Args: { end_at?: string; p_limit?: number; start_at?: string }
        Returns: {
          entity: string
          event: string
          event_date: string
        }[]
      }
      admin_overview_devices: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          device: string
          visitors: number
        }[]
      }
      admin_overview_devices_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          device: string
          visitors: number
        }[]
      }
      admin_overview_online_visitors: {
        Args: { p_window_minutes?: number }
        Returns: number
      }
      admin_overview_saved_visitors: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          unique_users: number
          visitors: number
          views: number
        }[]
      }
      admin_overview_sources: {
        Args: { end_at?: string; p_limit?: number; start_at?: string }
        Returns: {
          source: string
          visitors: number
        }[]
      }
      admin_overview_sources_public: {
        Args: { end_at?: string; p_limit?: number; start_at?: string }
        Returns: {
          source: string
          visitors: number
        }[]
      }
      admin_overview_stats: {
        Args: { end_at?: string; start_at?: string }
        Returns: Json
      }
      admin_overview_top_pages: {
        Args: { end_at?: string; p_limit?: number; start_at?: string }
        Returns: {
          path: string
          visitors: number
        }[]
      }
      admin_overview_top_pages_public: {
        Args: { end_at?: string; p_limit?: number; start_at?: string }
        Returns: {
          path: string
          visitors: number
        }[]
      }
      admin_overview_visitors_chart:
        | {
            Args: { end_at?: string; start_at?: string }
            Returns: {
              day: string
              visitors: number
            }[]
          }
        | {
            Args: { end_at?: string; p_bucket?: string; start_at?: string }
            Returns: {
              bucket_at: string
              visitors: number
            }[]
          }
      admin_user_moderation_action: {
        Args: {
          p_action: string
          p_days?: number
          p_reason?: string
          p_target_user_id: string
        }
        Returns: Json
      }
      analytics_concurso_avg_read: {
        Args: { end_at: string; start_at: string }
        Returns: {
          avg_read_seconds: number
          concurso_label: string
          entity_id: string
          total_sessions: number
        }[]
      }
      analytics_concurso_event_counts: {
        Args: { end_at: string; start_at: string }
        Returns: {
          concurso_label: string
          edital_clicks: number
          entity_id: string
          opens: number
          saves: number
          shares: number
        }[]
      }
      analytics_guide_avg_read: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_read_seconds: number
          entity_id: string
          guide_label: string
          total_sessions: number
        }[]
      }
      analytics_guide_avg_read_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_read_seconds: number
          entity_id: string
          guide_label: string
          total_sessions: number
        }[]
      }
      analytics_guide_scroll_stats: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_max_scroll: number
          completion_rate: number
          entity_id: string
          guide_label: string
          total_sessions: number
        }[]
      }
      analytics_guide_scroll_stats_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_max_scroll: number
          completion_rate: number
          entity_id: string
          guide_label: string
          total_sessions: number
        }[]
      }
      analytics_guide_sources: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          source: string
          visitors: number
        }[]
      }
      analytics_guide_sources_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          source: string
          visitors: number
        }[]
      }
      analytics_guide_top_ctas: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          clicks: number
          cta_label: string
          cta_position: string
          cta_url: string
          guide_label: string
        }[]
      }
      analytics_guide_top_ctas_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          clicks: number
          cta_label: string
          cta_position: string
          cta_url: string
          guide_label: string
        }[]
      }
      analytics_guide_top_internal_links: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          clicks: number
          guide_label: string
          link_label: string
          link_url: string
        }[]
      }
      analytics_guide_top_internal_links_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          clicks: number
          guide_label: string
          link_label: string
          link_url: string
        }[]
      }
      analytics_guides_overview: {
        Args: { end_at?: string; start_at?: string }
        Returns: Json
      }
      analytics_guides_overview_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: Json
      }
      analytics_guides_ranking: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          cta_clicks: number
          entity_id: string
          guide_label: string
          internal_link_clicks: number
          opens: number
          slug: string
          views: number
        }[]
      }
      analytics_guides_ranking_public: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_max_scroll: number
          avg_read_seconds: number
          cta_clicks: number
          entity_id: string
          guide_label: string
          internal_link_clicks: number
          opens: number
          slug: string
          views: number
        }[]
      }
      analytics_top_tools: {
        Args: { end_at: string; start_at: string }
        Returns: {
          click_count: number
          entity_id: string
          tool_label: string
        }[]
      }
      cleanup_newsletter_events_180d: { Args: never; Returns: undefined }
      cleanup_newsletter_rate_limit: { Args: never; Returns: undefined }
      cleanup_newsletter_rate_limit_30d: { Args: never; Returns: undefined }
      cleanup_old_rate_limit_entries: { Args: never; Returns: undefined }
      cleanup_old_view_fingerprints: { Args: never; Returns: undefined }
      complete_feature_request: {
        Args: { p_feature_id: string }
        Returns: undefined
      }
      get_brevo_config: {
        Args: never
        Returns: {
          allow_resend_welcome: boolean
          default_list_id: string
          default_tags: string[]
          error_message_already_subscribed: string
          error_message_generic: string
          opt_in_mode: string
          success_message_doi: string
          success_message_single: string
          webhook_url: string
        }[]
      }
      has_active_subscription: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_guide_view: { Args: { p_slug: string }; Returns: undefined }
      increment_product_click: {
        Args: { product_id: string }
        Returns: undefined
      }
      insights_audit_history: {
        Args: { end_at?: string; p_audit_type: string; start_at?: string }
        Returns: {
          avg_score: number
          run_date: string
          run_id: string
          status: string
          total_findings: number
        }[]
      }
      insights_audit_issues_by_category: {
        Args: { p_audit_type: string }
        Returns: {
          category: string
          issue_count: number
        }[]
      }
      insights_audit_latest_findings: {
        Args: { p_audit_type: string }
        Returns: {
          issue_count: number
          issues: Json
          path: string
          raw: Json
          run_date: string
          score: number
          url: string
        }[]
      }
      insights_concurso_scroll_stats: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          avg_max_scroll: number
          concurso_label: string
          entity_id: string
          total_sessions: number
        }[]
      }
      insights_tools_ranking: {
        Args: { end_at?: string; start_at?: string }
        Returns: {
          clicks: number
          outbound: number
          saves: number
          tool_id: string
          tool_name: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_developer: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_feature_requests: {
        Args: { include_hidden?: boolean }
        Returns: {
          completed_at: string
          created_at: string
          description: string
          id: string
          is_visible: boolean
          sort_order: number
          status: Database["public"]["Enums"]["feature_status"]
          title: string
          updated_at: string
          user_voted: boolean
          votes_count: number
        }[]
      }
      public_users_count: { Args: never; Returns: number }
      react_guide_comment: {
        Args: { p_comment_id: string; p_reaction: string; p_reason?: string }
        Returns: Json
      }
      slugify_tool_name: { Args: { input_text: string }; Returns: string }
      submit_guide_comment: {
        Args: { p_content: string; p_guide_id: string }
        Returns: Json
      }
      unaccent_safe: { Args: { input_text: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "developer"
      content_status: "draft" | "published"
      course_badge: "trending" | "popular" | "community"
      feature_status: "open" | "completed"
      premium_item_type: "course" | "job"
      redeem_token_status: "new" | "used" | "expired" | "revoked"
      subscription_plan_tier: "basic" | "premium" | "founder"
      subscription_plan_type: "monthly" | "annual" | "trial_30d" | "lifetime"
      subscription_status: "active" | "inactive" | "expired" | "canceled"
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
      app_role: ["admin", "moderator", "user", "developer"],
      content_status: ["draft", "published"],
      course_badge: ["trending", "popular", "community"],
      feature_status: ["open", "completed"],
      premium_item_type: ["course", "job"],
      redeem_token_status: ["new", "used", "expired", "revoked"],
      subscription_plan_tier: ["basic", "premium", "founder"],
      subscription_plan_type: ["monthly", "annual", "trial_30d", "lifetime"],
      subscription_status: ["active", "inactive", "expired", "canceled"],
    },
  },
} as const
