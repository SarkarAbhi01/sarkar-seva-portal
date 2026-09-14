import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const emptyForm = { name: '', email: '', phone: '', password: '', subscriptionPaid: false };

export default function SubadminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/admins', { params: { limit: 50 } }).then((res) => setAdmins(res.data.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admins', form);
      toast.success('Subadmin created.');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create subadmin.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin) => {
    const status = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admins/${admin.id}/status`, { status });
      toast.success(`Subadmin ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  const remove = async (admin) => {
    if (!confirm(`Delete ${admin.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admins/${admin.id}`);
      toast.success('Subadmin deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete subadmin.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Subadmins</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          {showForm ? 'Cancel' : '+ New Subadmin'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
          <input required placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Temporary Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
            <input type="checkbox" checked={form.subscriptionPaid} onChange={(e) => setForm({ ...form, subscriptionPaid: e.target.checked })} />
            Subscription fee collected (optional — not required to create the account)
          </label>
          <button disabled={saving} className="sm:col-span-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Subadmin'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-6 text-gray-400">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="p-6 text-gray-400">No subadmins yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a._count?.services ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{a._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => toggleStatus(a)} className="text-brand-600 hover:underline">
                        {a.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button onClick={() => remove(a)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
