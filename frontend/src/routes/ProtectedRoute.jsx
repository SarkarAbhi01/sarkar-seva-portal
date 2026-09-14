import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wrap admin routes; optionally restrict to specific roles, e.g. <ProtectedRoute roles={['SUPERADMIN']} />
export default function ProtectedRoute({ roles }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(admin.role)) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
