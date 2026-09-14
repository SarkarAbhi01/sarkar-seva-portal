import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function AdminLayout() {
  const { admin, logout, isSuperadmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 flex-col border-r bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">S</div>
          <span className="font-semibold text-gray-900">Seva Portal</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/admin" end className={linkClass}>📊 Dashboard</NavLink>
          <NavLink to="/admin/services" className={linkClass}>🛠️ Services</NavLink>
          <NavLink to="/admin/orders" className={linkClass}>📦 Orders</NavLink>
          {isSuperadmin && <NavLink to="/admin/subadmins" className={linkClass}>👥 Subadmins</NavLink>}
          {isSuperadmin && <NavLink to="/admin/settings" className={linkClass}>⚙️ Portal Settings</NavLink>}
          <NavLink to="/admin/profile" className={linkClass}>👤 My Profile</NavLink>
        </nav>

        <div className="border-t pt-3">
          <p className="px-2 text-xs text-gray-400">Signed in as</p>
          <p className="truncate px-2 text-sm font-medium text-gray-800">{admin?.name}</p>
          <p className="px-2 text-xs text-gray-400">{admin?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
