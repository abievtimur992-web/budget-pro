import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  isSupabaseMode: boolean;
  isCloudPrimary: boolean; // TRUE if migration is complete and we use Cloud state
  session: any | null;
  error: string | null;
  
  initialize: () => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  completeMigration: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  loading: true,
  isSupabaseMode: isSupabaseConfigured,
  isCloudPrimary: false,
  session: null,
  error: null,
  
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, isAuthenticated: true }); // Demo/Local Mode passes through
      return;
    }
    
    let session = await supabase.auth.getSession();
    // Handle both mock format (direct session/null) and standard Supabase format ({ data: { session } })
    if (session && session.data !== undefined) {
      session = session.data.session;
    }
    
    if (session) {
      set({ session, isAuthenticated: true, loading: false });
    } else {
      set({ session: null, isAuthenticated: false, loading: false });
    }
  },

  completeMigration: () => set({ isCloudPrimary: true }),


  setUser: (user, session) => set({ user, session, isAuthenticated: !!user }),
  
  logout: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      // Reset sensitive local state if needed (e.g., using finance store clear method later)
    }
    set({ user: null, session: null, isAuthenticated: false });
  }
}));
