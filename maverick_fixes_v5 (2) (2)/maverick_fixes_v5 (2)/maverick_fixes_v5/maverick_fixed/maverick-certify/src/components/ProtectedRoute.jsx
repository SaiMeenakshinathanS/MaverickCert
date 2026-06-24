import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const user = JSON.parse(localStorage.getItem('mc_user') || 'null');

  // Not logged in at all
  if (!user) return <Navigate to="/login" replace />;

  // Normalise role — handles both "admin" and legacy "Admin" casing
  const role = (user.role || '').toLowerCase();

  // Admin-only route accessed by a coordinator
  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
