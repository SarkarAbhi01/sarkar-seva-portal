import { useEffect, useState } from 'react';
import api from '../../api/client';
import StatCard from '../../components/admin/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminSocket } from '../../hooks/useAdminSocket.js';

export default function DashboardPage() {
  const { admin, isSuperadmin } = useAuth();
  const [summary, setSummary] = useState(null);

  const load = () => api.get('/dashboard/summary').then((res) => setSummary(res.data.summary));

  useEffect(() => { load(); }, []);
  useAdminSocket(() => load());

  if (!summary) return <p className="text-gray-400">Loading dashboard…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">
        Welcome back, {admin?.name} <span className="text-sm font-normal text-gray-400">({admin?.role})</span>
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Services" value={summary.totalServices} icon="🛠️" />
        <StatCard label="Active Services" value={summary.activeServices} icon="✅" />
        <StatCard label="Total Orders" value={summary.totalOrders} icon="📦" />
        <StatCard label="Pending Orders" value={summary.pendingOrders} icon="⏳" />
        <StatCard label="Completed Orders" value={summary.completedOrders} icon="🏁" />
        <StatCard label="Revenue (Paid)" value={`₹${Number(summary.revenue).toLocaleString('en-IN')}`} icon="💰" />
        {isSuperadmin && <StatCard label="Total Subadmins" value={summary.totalSubadmins} icon="👥" />}
      </div>
    </div>
  );
}
