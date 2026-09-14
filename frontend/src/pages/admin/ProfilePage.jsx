import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProfilePage() {
  const { admin } = useAuth();
  const [name, setName] = useState(admin?.name || '');
  const [phone, setPhone] = useState(admin?.phone || '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/auth/me', { name, phone });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', pw);
      toast.success('Password changed. Please log in again.');
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Account Info</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={admin?.email} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400" />
        <button disabled={savingProfile} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Change Password</h2>
        <input required type="password" placeholder="Current Password" value={pw.currentPassword}
          onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required type="password" placeholder="New Password (min 8 chars)" value={pw.newPassword}
          onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button disabled={savingPw} className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60">
          {savingPw ? 'Updating…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
