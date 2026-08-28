import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, PieChart, CreditCard, Shield, TrendingDown, TrendingUp, Globe, LogOut, Settings, Moon, Sun, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoiceAssistantFab } from '../voice/VoiceAssistantFab';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { MigrationModal } from '../migration/MigrationModal';
import { NotificationBell } from '../notifications/NotificationBell';

export const AppLayout = () => {

  // Run Cyrillic to Latin transliteration for user data (LocalStorage)
  React.useEffect(() => {
    const store = useFinanceStore.getState();
    const hasCyrillic = (str: string) => /[Рђ-РЇР°-СЏРЃС‘ТљТ›Т’Т“Т®ТЇТ°Т±УЁУ©Р†С–ТўТЈУУ™ТєТ»]/.test(str);
    
    const translitMap: Record<string, string> = {
        "Рђ": "A", "Р°": "a", "Р‘": "B", "Р±": "b", "Р’": "V", "РІ": "v",
        "Р“": "G", "Рі": "g", "Т’": "Зґ", "Т“": "Зµ", "Р”": "D", "Рґ": "d",
        "Р•": "E", "Рµ": "e", "РЃ": "Yo", "С‘": "yo", "Р–": "J", "Р¶": "j",
        "Р—": "Z", "Р·": "z", "Р": "I", "Рё": "i", "Р™": "Y", "Р№": "y",
        "Рљ": "K", "Рє": "k", "Тљ": "Q", "Т›": "q", "Р›": "L", "Р»": "l",
        "Рњ": "M", "Рј": "m", "Рќ": "N", "РЅ": "n", "Тў": "Еѓ", "ТЈ": "Е„",
        "Рћ": "O", "Рѕ": "o", "УЁ": "Г“", "У©": "Гі", "Рџ": "P", "Рї": "p",
        "Р ": "R", "СЂ": "r", "РЎ": "S", "СЃ": "s", "Рў": "T", "С‚": "t",
        "РЈ": "W", "Сѓ": "w", "Т°": "U", "Т±": "u", "Т®": "Гљ", "ТЇ": "Гє",
        "Р¤": "F", "С„": "f", "РҐ": "X", "С…": "x", "Тє": "H", "Т»": "h",
        "Р¦": "C", "С†": "c", "Р§": "Ch", "С‡": "ch", "РЁ": "Sh", "С€": "sh",
        "Р©": "Sh", "С‰": "sh", "РЄ": "", "СЉ": "", "Р«": "I", "С‹": "Д±",
        "Р†": "I", "С–": "i", "Р¬": "", "СЊ": "", "Р­": "E", "СЌ": "e",
        "Р®": "Yu", "СЋ": "yu", "РЇ": "Ya", "СЏ": "ya", "У": "ГЃ", "У™": "ГЎ"
    };
    
    const transliterate = (text: string) => text.split('').map(c => translitMap[c] || c).join('');

    let updated = false;
    
    const newCategories = store.categories?.map(c => {
      if (c.name && hasCyrillic(c.name)) {
        updated = true;
        return { ...c, name: transliterate(c.name) };
      }
      return c;
    }) || [];

    const newTransactions = store.transactions?.map(t => {
      if (t.description && hasCyrillic(t.description)) {
        updated = true;
        return { ...t, description: transliterate(t.description) };
      }
      return t;
    }) || [];

    const newFunds = store.funds?.map(f => {
      if (f.name && hasCyrillic(f.name)) {
        updated = true;
        return { ...f, name: transliterate(f.name) };
      }
      return f;
    }) || [];

    const newDebts = store.debts?.map(d => {
      if (d.name && hasCyrillic(d.name)) {
        updated = true;
        return { ...d, name: transliterate(d.name) };
      }
      return d;
    }) || [];

    if (updated) {
      useFinanceStore.setState({ 
        categories: newCategories,
        transactions: newTransactions,
        funds: newFunds,
        debts: newDebts
      });
    }
  }, []);

  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSupabaseMode, logout } = useAuthStore();
  const { syncStatus, conflictOperation, resolveConflict } = useFinanceStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: Home },
    { path: '/analytics', label: t('nav.analytics'), icon: PieChart },
    { path: '/budget', label: t('nav.budget'), icon: PieChart },
    { path: '/accounts', label: t('nav.accounts'), icon: CreditCard },
    { path: '/transactions', label: t('nav.transactions'), icon: CreditCard },
    { path: '/funds', label: t('nav.funds'), icon: Shield },
    { path: '/debts', label: t('nav.debts'), icon: TrendingDown },
    { path: '/invest', label: t('nav.invest'), icon: TrendingUp },
    { path: '/family', label: t('nav.family'), icon: Settings },
  ];
  
  const switchLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  const LanguageSelector = () => (
    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
      <Globe size={18} />
      <select 
        value={i18n.language} 
        onChange={switchLanguage}
        className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
      >
        <option value="kk">Qaraqalpaqsha</option>
        <option value="uz">O'zbekcha</option>
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
    </div>
  );

  const SyncIndicator = () => {
    if (!isSupabaseMode || !syncStatus) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-700">
        {syncStatus === 'online' && <><div className="w-2 h-2 rounded-full bg-green-500"></div> Onlayn</>}
        {syncStatus === 'syncing' && <><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div> Sinxronlanbaqta</>}
        {syncStatus === 'offline' && <><div className="w-2 h-2 rounded-full bg-red-500"></div> Oflayn</>}
        {syncStatus === 'conflict' && <><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div> Konflikt</>}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Budget PRO</h1>
        </div>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <LanguageSelector />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={toggleTheme} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <SyncIndicator />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Logout Button (Only if authenticated cloud mode) */}
        {isSupabaseMode && (
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
            >
              <LogOut size={20} />
              <span>{t('auth.logout') || 'ShД±ЗµД±Сћ'}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 md:hidden flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Budget PRO</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={toggleTheme} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <SyncIndicator />
            <LanguageSelector />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around p-2 pb-safe z-30">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center flex-1 p-2 ${
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] mt-1 truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center flex-1 p-2 text-gray-500 dark:text-gray-400"
        >
          <Menu size={24} />
          <span className="text-[10px] mt-1 truncate w-full text-center">Menyu</span>
        </button>
      </nav>

      {/* Mobile Full Screen Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-gray-800 dark:bg-gray-900 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold dark:text-white">Menyu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-4 p-4 rounded-xl ${
                    isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={24} />
                  <span className="font-medium text-lg">{item.label}</span>
                </Link>
              );
            })}
            
            {isSupabaseMode && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center space-x-4 p-4 rounded-xl text-red-600 dark:text-red-400 w-full hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={24} />
                <span className="font-medium text-lg">{t('auth.logout') || 'ShД±ЗµД±w'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <VoiceAssistantFab />
      
      <MigrationModal />

      {/* Conflict Resolution Dialog */}
      {conflictOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">SinxronlaСћ Konflikti</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bwl maЗµlД±Сћmat basqa qwrД±lmada Гіzgertilgen. QaysД± versiyasД±n saqlaСћdД± qГЎleysiz?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => resolveConflict('server')}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Serverdegini qabД±llaСћ
              </button>
              <button 
                onClick={() => resolveConflict('client')}
                className="w-full py-2.5 px-4 bg-primary-600 text-white hover:bg-primary-700 rounded-xl font-medium transition-colors"
              >
                Г“zgerisimdi saqlaСћ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};







