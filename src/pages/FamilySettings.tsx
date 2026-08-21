import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../store/useFamilyStore';
import { useAuthStore } from '../store/useAuthStore';
import { Users, UserPlus, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export const FamilySettings = () => {
  const { t } = useTranslation();
  const { isSupabaseMode } = useAuthStore();
  const { currentFamilyId, family, members, fetchFamily, createFamily, inviteMember, loading } = useFamilyStore();
  
  const [familyName, setFamilyName] = useState(t('family.myFamily'));
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('adult');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isSupabaseMode) {
      fetchFamily();
    }
  }, [isSupabaseMode, fetchFamily]);

  if (!isSupabaseMode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-yellow-50 p-6 rounded-xl border border-yellow-200">
          <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Local Mode</h2>
          <p className="text-gray-600">{t('family.noCloudMode')}</p>
        </div>
      </div>
    );
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFamily(familyName);
    setStatusMsg({ type: 'success', text: t('family.successCreated') });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    await inviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setStatusMsg({ type: 'success', text: t('family.successInvited') });
  };

  if (!currentFamilyId) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-2xl shadow-sm border">
        <div className="text-center mb-6">
          <Users className="mx-auto text-primary-500 mb-2" size={48} />
          <h2 className="text-xl font-bold">{t('family.createFamily')}</h2>
          <p className="text-gray-500 text-sm mt-1">{t('family.errorNoFamily')}</p>
        </div>
        
        {statusMsg.text && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleCreateFamily} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('family.familyName')}</label>
            <input
              type="text"
              required
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-primary-600 text-white py-2 rounded-xl">
            {loading ? '...' : t('family.createFamily')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="text-primary-600" />
          {t('family.settings')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="text-blue-500" />
              {family?.name || t('family.myFamily')} - {t('family.members')}
            </h2>
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <div className="font-medium text-gray-900">{member.user_profiles?.display_name || 'User'}</div>
                    <div className="text-sm text-gray-500">{member.user_profiles?.email || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {t(`family.${member.role}`)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{t(`family.${member.status}`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserPlus className="text-green-500" />
            {t('family.addMember')}
          </h2>
          
          {statusMsg.text && (
            <div className={`p-3 rounded-lg mb-4 text-sm flex gap-2 items-center ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              <CheckCircle size={16} />
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('family.email')}</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('family.role')}</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="adult">{t('family.adult')}</option>
                <option value="child">{t('family.child')}</option>
              </select>
            </div>
            <button disabled={loading} type="submit" className="w-full bg-primary-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-700">
              {loading ? '...' : t('family.sendInvite')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
