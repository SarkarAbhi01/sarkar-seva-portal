import { useEffect, useState } from 'react';
import api from '../../api/client';

export function TermsPage() {
  const [content, setContent] = useState('');
  useEffect(() => { api.get('/public/settings').then((res) => setContent(res.data.settings.termsContent || 'Terms of service content coming soon.')); }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-4 whitespace-pre-line text-gray-600">{content}</p>
    </div>
  );
}

export function PrivacyPage() {
  const [content, setContent] = useState('');
  useEffect(() => { api.get('/public/settings').then((res) => setContent(res.data.settings.privacyContent || 'Privacy policy content coming soon.')); }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-4 whitespace-pre-line text-gray-600">{content}</p>
    </div>
  );
}
