import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Lock, Mail, AlertCircle, Shield } from 'lucide-react';

export const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, isSupabaseMode } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      
      setUser(data.user, data.session);
      navigate('/');
    } catch (err: any) {
      setError(t('auth.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border dark:border-gray-700 border-yellow-200 text-center max-w-md">
          <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <p className="text-gray-700">{t('auth.demoMode')}</p>
          <button onClick={() => navigate('/')} className="mt-6 w-full bg-primary-600 text-white py-3 rounded-xl font-medium">Кіріў (Local Mode)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-primary-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.login')}</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
              <Link to="/recovery" className="text-sm text-primary-600 hover:underline">{t('auth.forgotPassword')}</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
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
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-70"
          >
            {loading ? '...' : t('auth.login')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          {t('auth.noAccount')} <Link to="/register" className="text-primary-600 font-medium hover:underline">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
};



