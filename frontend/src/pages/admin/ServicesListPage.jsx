import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  UNPUBLISHED: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function ServicesListPage() {
  const { isSuperadmin } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/services', { params: { limit: 50 } }).then((res) => setServices(res.data.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/services/${id}/status`, { status });
      toast.success('Status updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete service.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Services</h1>
        <Link to="/admin/services/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + New Service
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-6 text-gray-400">Loading…</p>
        ) : services.length === 0 ? (
          <p className="p-6 text-gray-400">No services yet. Create your first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                {isSuperadmin && <th className="px-4 py-3">Owner</th>}
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                  <td className="px-4 py-3">₹{Number(s.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  {isSuperadmin && <td className="px-4 py-3 text-gray-500">{s.owner?.name}</td>}
                  <td className="px-4 py-3 text-gray-500">{s._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/services/${s.id}/edit`} className="text-brand-600 hover:underline">Edit</Link>
                      {s.status === 'PUBLISHED' ? (
                        <button onClick={() => changeStatus(s.id, 'UNPUBLISHED')} className="text-yellow-600 hover:underline">Unpublish</button>
                      ) : (
                        <button onClick={() => changeStatus(s.id, 'PUBLISHED')} className="text-green-600 hover:underline">Publish</button>
                      )}
                      {isSuperadmin && s.status !== 'SUSPENDED' && (
                        <button onClick={() => changeStatus(s.id, 'SUSPENDED')} className="text-red-600 hover:underline">Suspend</button>
                      )}
                      <button onClick={() => remove(s.id)} className="text-gray-400 hover:text-red-600 hover:underline">Delete</button>
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
