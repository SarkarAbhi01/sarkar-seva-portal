import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import api from '../../api/client';
import PublicHeader from './PublicHeader.jsx';
import PublicFooter from './PublicFooter.jsx';

export default function PublicLayout() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/public/settings').then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader settings={settings} />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}
