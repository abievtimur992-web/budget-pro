import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';

interface AppNotification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { isCloudPrimary, session } = useAuthStore();
  const { currentFamilyId } = useFamilyStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCloudPrimary || !currentFamilyId || !session?.access_token) return;

    // Initial fetch
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications')
        .select('id, message, is_read, created_at', session.access_token)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Listen for new notifications via Realtime
    // Our existing realtime.ts handles transactions, but we can do a quick subscription here for simplicity
    // or rely on the main realtime connection. For Phase 7, we'll fetch on mount.
    // If the user adds a transaction locally, they already know. If remote, realtime.ts updates FinanceStore.
    // To make it simple, we poll every 30s or just rely on manual refresh for now to save complexity,
    // or implement a quick polling since we don't have the full supabase SDK for Realtime channel here natively without expanding realtime.ts.
    
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isCloudPrimary, currentFamilyId, session?.access_token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    if (!session?.access_token) return;
    await supabase.from('notifications').update({ is_read: true }, session.access_token, `&id=eq.${id}`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!session?.access_token || !currentFamilyId) return;
    await supabase.from('notifications').update({ is_read: true }, session.access_token, `&family_id=eq.${currentFamilyId}&is_read=eq.false`);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isCloudPrimary) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Хабарландырыўлар</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Бәрин оқылды етиў
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Ҳәзирше жаңа хабарлар жоқ
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 ${!notification.is_read ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''}`}
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="text-gray-400 hover:text-green-500 p-1 rounded-full hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-600"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};



