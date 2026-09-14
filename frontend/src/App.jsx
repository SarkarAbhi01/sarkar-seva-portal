import { Routes, Route } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout.jsx';
import HomePage from './pages/public/HomePage.jsx';
import ServiceDetailPage from './pages/public/ServiceDetailPage.jsx';
import OrderPage from './pages/public/OrderPage.jsx';
import TrackOrderPage from './pages/public/TrackOrderPage.jsx';
import { TermsPage, PrivacyPage } from './pages/public/LegalPages.jsx';

import LoginPage from './pages/admin/LoginPage.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ServicesListPage from './pages/admin/ServicesListPage.jsx';
import ServiceFormPage from './pages/admin/ServiceFormPage.jsx';
import OrdersListPage from './pages/admin/OrdersListPage.jsx';
import OrderDetailPage from './pages/admin/OrderDetailPage.jsx';
import SubadminsPage from './pages/admin/SubadminsPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import ProfilePage from './pages/admin/ProfilePage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public portal */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/order/:serviceId" element={<OrderPage />} />
        <Route path="/track" element={<TrackOrderPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>

      {/* Admin auth */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Admin dashboard - both roles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/services" element={<ServicesListPage />} />
          <Route path="/admin/services/new" element={<ServiceFormPage />} />
          <Route path="/admin/services/:id/edit" element={<ServiceFormPage />} />
          <Route path="/admin/orders" element={<OrdersListPage />} />
          <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Superadmin-only */}
      <Route element={<ProtectedRoute roles={['SUPERADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/subadmins" element={<SubadminsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-10 text-center text-gray-400">Page not found.</div>} />
    </Routes>
  );
}
