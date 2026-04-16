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
      achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_insights_cache: {
        Row: {
          expires_at: string
          generated_at: string | null
          id: string
          insights: Json
          user_id: string
        }
        Insert: {
          expires_at: string
          generated_at?: string | null
          id?: string
          insights: Json
          user_id: string
        }
        Update: {
          expires_at?: string
          generated_at?: string | null
          id?: string
          insights?: Json
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_type: string | null
          auto_import: boolean | null
          available_balance: number | null
          balance: number | null
          created_at: string | null
          id: string
          institution_color: string | null
          institution_logo: string | null
          institution_name: string
          last_sync_at: string | null
          pluggy_item_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_type?: string | null
          auto_import?: boolean | null
          available_balance?: number | null
          balance?: number | null
          created_at?: string | null
          id?: string
          institution_color?: string | null
          institution_logo?: string | null
          institution_name: string
          last_sync_at?: string | null
          pluggy_item_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_type?: string | null
          auto_import?: boolean | null
          available_balance?: number | null
          balance?: number | null
          created_at?: string | null
          id?: string
          institution_color?: string | null
          institution_logo?: string | null
          institution_name?: string
          last_sync_at?: string | null
          pluggy_item_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions_raw: {
        Row: {
          amount: number
          category: string | null
          connection_id: string
          created_at: string | null
          date: string
          description: string
          id: string
          ignored: boolean | null
          imported: boolean | null
          matched_transaction_id: string | null
          merchant_name: string | null
          pluggy_transaction_id: string
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          connection_id: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          ignored?: boolean | null
          imported?: boolean | null
          matched_transaction_id?: string | null
          merchant_name?: string | null
          pluggy_transaction_id: string
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          connection_id?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          ignored?: boolean | null
          imported?: boolean | null
          matched_transaction_id?: string | null
          merchant_name?: string | null
          pluggy_transaction_id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_raw_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_raw_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          created_at: string | null
          id: string
          limit_amount: number
          month_year: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          limit_amount: number
          month_year: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          limit_amount?: number
          month_year?: string
          user_id?: string
        }
        Relationships: []
      }
      card_bills: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          month_year: string
          paid: boolean | null
          paid_at: string | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          month_year: string
          paid?: boolean | null
          paid_at?: string | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          month_year?: string
          paid?: boolean | null
          paid_at?: string | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_bills_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          actions: string[] | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          actions?: string[] | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          actions?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          closing_day: number | null
          color: string | null
          created_at: string | null
          credit_limit: number
          due_day: number | null
          id: string
          last_four: string | null
          name: string
          network: string | null
          notes: string | null
          used_amount: number | null
          user_id: string
        }
        Insert: {
          closing_day?: number | null
          color?: string | null
          created_at?: string | null
          credit_limit: number
          due_day?: number | null
          id?: string
          last_four?: string | null
          name: string
          network?: string | null
          notes?: string | null
          used_amount?: number | null
          user_id: string
        }
        Update: {
          closing_day?: number | null
          color?: string | null
          created_at?: string | null
          credit_limit?: number
          due_day?: number | null
          id?: string
          last_four?: string | null
          name?: string
          network?: string | null
          notes?: string | null
          used_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string | null
          debt_id: string
          id: string
          notes: string | null
          payment_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          debt_id: string
          id?: string
          notes?: string | null
          payment_date: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          debt_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          color: string | null
          created_at: string | null
          creditor: string
          debt_type: string
          deleted_at: string | null
          due_day: number | null
          id: string
          interest_rate: number | null
          min_payment: number | null
          name: string
          notes: string | null
          priority: number | null
          remaining_amount: number
          status: string | null
          strategy: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          creditor: string
          debt_type: string
          deleted_at?: string | null
          due_day?: number | null
          id?: string
          interest_rate?: number | null
          min_payment?: number | null
          name: string
          notes?: string | null
          priority?: number | null
          remaining_amount: number
          status?: string | null
          strategy?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          creditor?: string
          debt_type?: string
          deleted_at?: string | null
          due_day?: number | null
          id?: string
          interest_rate?: number | null
          min_payment?: number | null
          name?: string
          notes?: string | null
          priority?: number | null
          remaining_amount?: number
          status?: string | null
          strategy?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      goal_checkins: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          goal_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_checkins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_deposits: {
        Row: {
          amount: number
          created_at: string | null
          deposit_date: string
          goal_id: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          deposit_date?: string
          goal_id?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          deposit_date?: string
          goal_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_deposits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          created_at: string | null
          current_amount: number | null
          deadline: string | null
          deleted_at: string | null
          id: string
          is_highlighted: boolean | null
          name: string
          objective_type: string | null
          start_date: string | null
          target_amount: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          is_highlighted?: boolean | null
          name: string
          objective_type?: string | null
          start_date?: string | null
          target_amount: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          is_highlighted?: boolean | null
          name?: string
          objective_type?: string | null
          start_date?: string | null
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      integration_suggestions: {
        Row: {
          created_at: string | null
          id: string
          platform_name: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform_name: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform_name?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          api_key_encrypted: string | null
          config: Json | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          method: string | null
          platform: string
          platform_display_name: string
          status: string | null
          total_imported: number | null
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          method?: string | null
          platform: string
          platform_display_name: string
          status?: string | null
          total_imported?: number | null
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          method?: string | null
          platform?: string
          platform_display_name?: string
          status?: string | null
          total_imported?: number | null
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      investment_history: {
        Row: {
          amount: number
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          investment_id: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          event_date?: string
          event_type: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_history_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          asset_type: string
          created_at: string | null
          current_amount: number
          date: string | null
          id: string
          invested_amount: number
          name: string
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          current_amount: number
          date?: string | null
          id?: string
          invested_amount: number
          name: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          current_amount?: number
          date?: string | null
          id?: string
          invested_amount?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          data: Json | null
          id: string
          month_year: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          data?: Json | null
          id?: string
          month_year: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json | null
          id?: string
          month_year?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          budget_alerts: boolean | null
          card_due_alerts: boolean | null
          created_at: string | null
          debt_reminders: boolean | null
          goal_alerts: boolean | null
          id: string
          streak_alerts: boolean | null
          user_id: string
          weekly_summary: boolean | null
        }
        Insert: {
          budget_alerts?: boolean | null
          card_due_alerts?: boolean | null
          created_at?: string | null
          debt_reminders?: boolean | null
          goal_alerts?: boolean | null
          id?: string
          streak_alerts?: boolean | null
          user_id: string
          weekly_summary?: boolean | null
        }
        Update: {
          budget_alerts?: boolean | null
          card_due_alerts?: boolean | null
          created_at?: string | null
          debt_reminders?: boolean | null
          goal_alerts?: boolean | null
          id?: string
          streak_alerts?: boolean | null
          user_id?: string
          weekly_summary?: boolean | null
        }
        Relationships: []
      }
      pluggy_webhooks: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          item_id: string | null
          payload: Json | null
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          item_id?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          item_id?: string | null
          payload?: Json | null
          processed?: boolean | null
        }
        Relationships: []
      }
      prediction_alerts: {
        Row: {
          action_taken: boolean | null
          alert_type: string
          created_at: string | null
          description: string | null
          dismissed: boolean | null
          id: string
          severity: string
          title: string
          triggered_date: string
          user_id: string
        }
        Insert: {
          action_taken?: boolean | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          id?: string
          severity?: string
          title: string
          triggered_date: string
          user_id: string
        }
        Update: {
          action_taken?: boolean | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          id?: string
          severity?: string
          title?: string
          triggered_date?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_cache: {
        Row: {
          generated_at: string | null
          horizon_days: number | null
          id: string
          predictions: Json
          user_id: string
        }
        Insert: {
          generated_at?: string | null
          horizon_days?: number | null
          id?: string
          predictions: Json
          user_id: string
        }
        Update: {
          generated_at?: string | null
          horizon_days?: number | null
          id?: string
          predictions?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          marketing_emails: boolean | null
          plan: string | null
          plan_expires_at: string | null
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          marketing_emails?: boolean | null
          plan?: string | null
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          marketing_emails?: boolean | null
          plan?: string | null
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          subscription: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          subscription: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          subscription?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          active: boolean | null
          amount: number
          category: string
          created_at: string | null
          day_of_month: number | null
          description: string
          frequency: string
          id: string
          last_created: string | null
          next_date: string
          origin: string
          type: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          amount: number
          category: string
          created_at?: string | null
          day_of_month?: number | null
          description: string
          frequency: string
          id?: string
          last_created?: string | null
          next_date: string
          origin: string
          type: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          amount?: number
          category?: string
          created_at?: string | null
          day_of_month?: number | null
          description?: string
          frequency?: string
          id?: string
          last_created?: string | null
          next_date?: string
          origin?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_email: string
          referrer_id: string
          reward_granted: boolean | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_email: string
          referrer_id: string
          reward_granted?: boolean | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_email?: string
          referrer_id?: string
          reward_granted?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
      scheduled_bills: {
        Row: {
          amount: number
          card_id: string | null
          category: string
          created_at: string | null
          description: string
          due_date: string
          frequency: string | null
          id: string
          notes: string | null
          origin: string | null
          paid_at: string | null
          recurrent: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          category: string
          created_at?: string | null
          description: string
          due_date: string
          frequency?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          paid_at?: string | null
          recurrent?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          category?: string
          created_at?: string | null
          description?: string
          due_date?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          paid_at?: string | null
          recurrent?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_bills_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          card_id: string | null
          category: string
          created_at: string | null
          date: string
          deleted_at: string | null
          description: string
          id: string
          notes: string | null
          origin: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          category: string
          created_at?: string | null
          date: string
          deleted_at?: string | null
          description: string
          id?: string
          notes?: string | null
          origin: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          origin?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_config: {
        Row: {
          bank_sync_enabled: boolean | null
          created_at: string | null
          currency: string | null
          debt_strategy: string | null
          default_save_pct: number | null
          financial_objectives: string[] | null
          financial_score: number | null
          id: string
          last_activity_date: string | null
          last_period: string | null
          level: string | null
          notification_push_token: string | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          pluggy_connect_token: string | null
          profile_type: string | null
          project_name: string | null
          referral_code: string | null
          referred_by: string | null
          streak_days: number | null
          theme: string | null
          user_id: string
          xp_points: number | null
        }
        Insert: {
          bank_sync_enabled?: boolean | null
          created_at?: string | null
          currency?: string | null
          debt_strategy?: string | null
          default_save_pct?: number | null
          financial_objectives?: string[] | null
          financial_score?: number | null
          id?: string
          last_activity_date?: string | null
          last_period?: string | null
          level?: string | null
          notification_push_token?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          pluggy_connect_token?: string | null
          profile_type?: string | null
          project_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number | null
          theme?: string | null
          user_id: string
          xp_points?: number | null
        }
        Update: {
          bank_sync_enabled?: boolean | null
          created_at?: string | null
          currency?: string | null
          debt_strategy?: string | null
          default_save_pct?: number | null
          financial_objectives?: string[] | null
          financial_score?: number | null
          id?: string
          last_activity_date?: string | null
          last_period?: string | null
          level?: string | null
          notification_push_token?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          pluggy_connect_token?: string | null
          profile_type?: string | null
          project_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number | null
          theme?: string | null
          user_id?: string
          xp_points?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notified: boolean | null
          position: number | null
          referrer: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notified?: boolean | null
          position?: number | null
          referrer?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notified?: boolean | null
          position?: number | null
          referrer?: string | null
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          active: boolean | null
          connected_at: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          total_messages: number | null
          user_id: string
          verification_code: string | null
          verification_expires_at: string | null
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          total_messages?: number | null
          user_id: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          total_messages?: number | null
          user_id?: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      whatsapp_context: {
        Row: {
          id: string
          last_intent: string | null
          messages: Json | null
          pending_confirmation: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_intent?: string | null
          messages?: Json | null
          pending_confirmation?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_intent?: string | null
          messages?: Json | null
          pending_confirmation?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          action_taken: string | null
          created_at: string | null
          direction: string
          error: string | null
          id: string
          intent: string | null
          message: string
          phone_number: string
          processed: boolean | null
          transaction_created_id: string | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          direction: string
          error?: string | null
          id?: string
          intent?: string | null
          message: string
          phone_number: string
          processed?: boolean | null
          transaction_created_id?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          intent?: string | null
          message?: string
          phone_number?: string
          processed?: boolean | null
          transaction_created_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
