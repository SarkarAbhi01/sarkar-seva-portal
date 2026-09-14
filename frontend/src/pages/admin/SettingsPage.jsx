import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/public/settings').then((res) => {
      const s = res.data.settings;
      setForm({
        portalName: s.portalName || '',
        logoUrl: s.logoUrl || '',
        contactEmail: s.contactEmail || '',
        contactPhone: s.contactPhone || '',
        contactAddress: s.contactAddress || '',
        heroHeadline: s.homepageHero?.headline || '',
        heroSubheadline: s.homepageHero?.subheadline || '',
        termsContent: s.termsContent || '',
        privacyContent: s.privacyContent || '',
      });
    });
  }, []);

  if (!form) return <p className="text-gray-400">Loading…</p>;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/settings', {
        portalName: form.portalName,
        logoUrl: form.logoUrl,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactAddress: form.contactAddress,
        homepageHero: { headline: form.heroHeadline, subheadline: form.heroSubheadline },
        termsContent: form.termsContent,
        privacyContent: form.privacyContent,
      });
      toast.success('Portal settings updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Portal Settings</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <Field label="Portal Name" value={form.portalName} onChange={set('portalName')} />
        <Field label="Logo URL" value={form.logoUrl} onChange={set('logoUrl')} />
        <Field label="Hero Headline" value={form.heroHeadline} onChange={set('heroHeadline')} />
        <Field label="Hero Subheadline" value={form.heroSubheadline} onChange={set('heroSubheadline')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Email" value={form.contactEmail} onChange={set('contactEmail')} />
          <Field label="Contact Phone" value={form.contactPhone} onChange={set('contactPhone')} />
        </div>
        <Field label="Contact Address" value={form.contactAddress} onChange={set('contactAddress')} />
        <div>
          <label className="text-sm font-medium text-gray-700">Terms & Conditions</label>
          <textarea rows={4} value={form.termsContent} onChange={set('termsContent')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Privacy Policy</label>
          <textarea rows={4} value={form.privacyContent} onChange={set('privacyContent')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <button disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input {...props} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
    </div>
  );
}
