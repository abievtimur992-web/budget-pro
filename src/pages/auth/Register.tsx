import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { User, Mail, Lock, AlertCircle, Shield } from 'lucide-react';

export const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Register with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { display_name: displayName } }
      });
      if (signupError) throw signupError;
      
      // 2. Create profile safely (Idempotent/Protected via RLS or trigger, but done here for client-side explicit creation)
      if (data?.user?.id) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          email,
          display_name: displayName,
          default_currency: 'UZS'
        }, data.session?.access_token).catch(() => {
          // If insert fails (e.g., due to a trigger already doing it), we ignore or handle gracefully
        });
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('auth.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm text-center max-w-md">
          <Shield className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2 dark:text-white">{t('auth.successRegister')}</h2>
          <button onClick={() => navigate('/login')} className="mt-6 text-primary-600 font-medium">{t('auth.backToLogin')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.register')}</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.displayName')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Timur"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="name@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-70 mt-2"
          >
            {loading ? '...' : t('auth.register')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          {t('auth.hasAccount')} <Link to="/login" className="text-primary-600 font-medium hover:underline">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
};



