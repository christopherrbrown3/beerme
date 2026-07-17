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
    };
    Views: Record<string, never>;
    Functions: {
      is_username_available: {
        Args: { candidate: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
