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
    };
    Enums: {
      membership_role: 'owner' | 'member';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MembershipRole = Database['public']['Enums']['membership_role'];
