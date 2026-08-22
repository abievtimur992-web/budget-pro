import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'admin' | 'adult' | 'child';
  status: string;
  user_profiles?: { display_name: string; email: string };
  allowed_accounts?: string[];
  allowed_categories?: string[];
  monthly_limit?: number;
}

interface FamilyState {
  currentFamilyId: string | null;
  family: any | null;
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
  fetchFamily: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  currentFamilyId: null,
  family: null,
  members: [],
  loading: false,
  error: null,

  fetchFamily: async () => {
    if (!isSupabaseConfigured) return;
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true, error: null });
    try {
      const session = useAuthStore.getState().session;
      const token = session?.access_token;
      
      // Get user's active family
      const memRes = await supabase.from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (memRes.data && memRes.data.length > 0) {
        const fId = memRes.data[0].family_id;
        
        // Fetch family details
        const fRes = await supabase.from('families').select('*').eq('id', fId);
        
        // Fetch members
        const mRes = await supabase.from('family_members').select('*,user_profiles(display_name,email)').eq('family_id', fId);
        
        set({
          currentFamilyId: fId,
          family: fRes.data?.[0] || null,
          members: mRes.data || [],
          loading: false
        });
      } else {
        set({ currentFamilyId: null, family: null, members: [], loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createFamily: async (name: string) => {
    if (!isSupabaseConfigured) return;
    set({ loading: true, error: null });
    try {
      const session = useAuthStore.getState().session;
      const token = session?.access_token;
      
      const { data, error } = await supabase.from('families').insert({ name }).select('*').single();
      if (error) throw error;
      
      // Auto-insert member if not handled by trigger
      const user = useAuthStore.getState().user;
      if (user && data) {
        await supabase.from('family_members').insert({
          family_id: data.id,
          user_id: user.id,
          email: user.email,
          role: 'admin',
          status: 'active'
        });
      }
      
      await get().fetchFamily();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  inviteMember: async (email: string, role: string) => {
    if (!isSupabaseConfigured) return;
    const fId = get().currentFamilyId;
    if (!fId) return;
    
    set({ loading: true, error: null });
    try {
      const session = useAuthStore.getState().session;
      const token = session?.access_token;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      await supabase.from('invitations').insert({
        family_id: fId,
        email,
        role,
        expires_at: expiresAt.toISOString()
      });
      
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));
