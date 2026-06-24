import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Batches from './pages/Batches.jsx';
import Certificates from './pages/Certificates.jsx';
import CreateBatch from './pages/CreateBatch.jsx';
import Template from './pages/Template.jsx';
import EmailGenerator from './pages/EmailGenerator.jsx';
import EmailTracking from './pages/EmailTracking.jsx';
import LinkedInMonitor from './pages/LinkedIn.jsx';
import Reports from './pages/Reports.jsx';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import SystemSettings from './pages/admin/SystemSettings.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import EmailSettings from './pages/admin/EmailSettings.jsx';
import ReminderRules from './pages/admin/ReminderRules.jsx';
import EmailAndSystemSettings from './pages/admin/EmailAndSystemSettings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Coordinator routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
        <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
        <Route path="/create-batch" element={<ProtectedRoute><CreateBatch /></ProtectedRoute>} />
        <Route path="/template" element={<ProtectedRoute><Template /></ProtectedRoute>} />
        <Route path="/email" element={<ProtectedRoute><EmailGenerator /></ProtectedRoute>} />
        <Route path="/tracking" element={<ProtectedRoute><EmailTracking /></ProtectedRoute>} />
        <Route path="/linkedin" element={<ProtectedRoute><LinkedInMonitor /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/email" element={<ProtectedRoute requireAdmin><EmailAndSystemSettings /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><EmailAndSystemSettings /></ProtectedRoute>} />
        <Route path="/admin/reminders" element={<ProtectedRoute requireAdmin><ReminderRules /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><AuditLogs /></ProtectedRoute>} />

        {/* Fallback — redirect to login if not logged in, else dashboard */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
