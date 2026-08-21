export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const getHeaders = (token?: string) => ({
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
});

// Fetch-based minimal Supabase client to avoid build errors from missing npm packages
export const supabase = {
  isConfigured: isSupabaseConfigured,
  auth: {
    async signUp({ email, password, options }: any) {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
      const res = await fetch(`${AUTH_URL}/signup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password, data: options?.data })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Signup failed');
      return { data, error: null };
    },
    async signInWithPassword({ email, password }: any) {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
      const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed');
      // Persist session safely
      localStorage.setItem('sb-session', JSON.stringify(data));
      return { data: { session: data, user: data.user }, error: null };
    },
    async signOut() {
      const sessionStr = localStorage.getItem('sb-session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        await fetch(`${AUTH_URL}/logout`, {
          method: 'POST',
          headers: getHeaders(session.access_token)
        }).catch(() => {});
      }
      localStorage.removeItem('sb-session');
    },
    async resetPasswordForEmail(email: string) {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
      const res = await fetch(`${AUTH_URL}/recover`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Recovery failed');
      }
    },
    getSession() {
      if (!isSupabaseConfigured) return null;
      const sessionStr = localStorage.getItem('sb-session');
      if (!sessionStr) return null;
      try {
        const session = JSON.parse(sessionStr);
        // Basic expiry check could go here
        return session;
      } catch (e) {
        return null;
      }
    }
  },
  from: (table: string) => {
    return {
      insert: async (payload: any, token?: string) => {
        if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
        const res = await fetch(`${REST_URL}/${table}`, {
          method: 'POST',
          headers: { ...getHeaders(token), 'Prefer': 'return=representation' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Insert failed');
        return { data, error: null };
      },
      select: async (query = '*', token?: string, filters = '') => {
        if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
        const res = await fetch(`${REST_URL}/${table}?select=${encodeURIComponent(query)}${filters}`, {
          method: 'GET',
          headers: getHeaders(token)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Select failed');
        return { data, error: null };
      },
      update: async (payload: any, token?: string, filters = '') => {
        if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
        const res = await fetch(`${REST_URL}/${table}?${filters}`, {
          method: 'PATCH',
          headers: { ...getHeaders(token), 'Prefer': 'return=representation' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Update failed');
        return { data, error: null };
      },
      delete: async (payload: any, token?: string, filters = '') => {
        if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
        const res = await fetch(`${REST_URL}/${table}?${filters}`, {
          method: 'DELETE',
          headers: getHeaders(token)
        });
        if (res.status !== 204 && !res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Delete failed');
        }
        return { data: null, error: null };
      }
    };
  }
};
