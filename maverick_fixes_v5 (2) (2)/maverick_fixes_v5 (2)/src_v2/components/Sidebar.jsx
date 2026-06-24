import { useNavigate, useLocation } from 'react-router-dom';

const coordinatorNav = [
  { label: 'Dashboard', icon: '⬡', path: '/dashboard', section: 'MAIN' },
  { label: 'Batches', icon: '≡', path: '/batches', section: 'MAIN' },
  { label: 'Certificates', icon: '☐', path: '/certificates', section: 'MAIN' },
  { label: 'Email Tracking', icon: '✉', path: '/tracking', section: 'MAIN' },
  { label: 'LinkedIn Monitor', icon: '▪', path: '/linkedin', section: 'ENGAGEMENT' },
  { label: 'Reports', icon: '◎', path: '/reports', section: 'ENGAGEMENT' },
];

const adminNav = [
  { label: 'Dashboard', icon: '⬡', path: '/admin/dashboard', section: 'ADMIN' },
  { label: 'User Management', icon: '◉', path: '/admin/users', section: 'ADMIN' },
  { label: 'Email & System Settings', icon: '✉', path: '/admin/email', section: 'ADMIN' },
  { label: 'Reminder Rules', icon: '◷', path: '/admin/reminders', section: 'ADMIN' },
  { label: 'Audit Logs', icon: '☰', path: '/admin/logs', section: 'ADMIN' },
];

export default function Sidebar({ role = 'coordinator' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : coordinatorNav;

  const user = JSON.parse(localStorage.getItem('mc_user') || '{}');

  const logout = () => {
    localStorage.removeItem('mc_user');
    navigate('/login');
  };

  const sections = [...new Set(nav.map(n => n.section))];

  return (
    <div className="w-56 h-screen bg-surface-card border-r border-surface-border flex flex-col sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-sm font-display shadow-md shadow-indigo-500/30">MC</div>
          <div>
            <div className="font-semibold text-white text-sm font-display">Maverick Certify</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section} className="mb-4">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2 px-2">{section}</p>
            <div className="space-y-0.5">
              {nav.filter(n => n.section === section).map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{(user.role || 'coordinator').toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          → Sign out
        </button>
      </div>
    </div>
  );
}
