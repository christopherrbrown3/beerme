import { type Session, type User } from '@supabase/supabase-js';
import { createContext } from 'react';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
