import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../store/useFinanceStore';
import { Wallet } from 'lucide-react';

export const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initFamily = useFinanceStore(state => state.initFamily);
  
  const [familyName, setFamilyName] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (familyName && userName) {
      initFamily(familyName, userName);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">{t('welcome')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('onboarding_title')}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('family_name')}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Мысалы: Оспановлар"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('your_name')}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Атыңыз"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors mt-6"
          >
            {t('start')}
          </button>
        </form>
      </div>
    </div>
  );
};



