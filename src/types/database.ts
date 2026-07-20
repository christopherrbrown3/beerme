export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          invite_token: string;
          currency_name: string;
          currency_plural: string;
          currency_symbol: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          invite_token?: string;
          currency_name?: string;
          currency_plural?: string;
          currency_symbol?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          currency_name?: string;
          currency_plural?: string;
          currency_symbol?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          group_id: string;
          user_id: string;
          role: Database['public']['Enums']['membership_role'];
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: Database['public']['Enums']['membership_role'];
          joined_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'memberships_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          group_id: string;
          debtor_user_id: string;
          creditor_user_id: string;
          quantity: number;
          note: string | null;
          created_by: string;
          created_at: string;
          reversed_at: string | null;
          reversed_by: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          debtor_user_id: string;
          creditor_user_id: string;
          quantity: number;
          note?: string | null;
          created_by: string;
          created_at?: string;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Update: {
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_debtor_user_id_fkey';
            columns: ['debtor_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_creditor_user_id_fkey';
            columns: ['creditor_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_reversed_by_fkey';
            columns: ['reversed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_username_available: {
        Args: { candidate: string };
        Returns: boolean;
      };
      join_group: {
        Args: { token: string };
        Returns: string;
      };
      leave_group: {
        Args: { target_group_id: string };
        Returns: undefined;
      };
      delete_group: {
        Args: { target_group_id: string };
        Returns: undefined;
      };
      reverse_transaction: {
        Args: { transaction_id: string };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      transfer_group_ownership: {
        Args: { target_group_id: string; target_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      membership_role: 'owner' | 'member';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MembershipRole = Database['public']['Enums']['membership_role'];
