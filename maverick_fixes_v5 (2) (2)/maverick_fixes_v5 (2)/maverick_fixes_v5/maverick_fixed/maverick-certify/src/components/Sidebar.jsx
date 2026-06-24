import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import {
  LayoutDashboard,
  FolderKanban,
  Award,
  MailCheck,
  Linkedin,
  BarChart3,
  Users,
  BellRing,
  Settings,
  ClipboardList,
  LogOut,
} from 'lucide-react';

const coordinatorNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', section: 'MAIN' },
  { label: 'Batches', icon: FolderKanban, path: '/batches', section: 'MAIN' },
  { label: 'Certificates', icon: Award, path: '/certificates', section: 'MAIN' },
  { label: 'Email Tracking', icon: MailCheck, path: '/tracking', section: 'MAIN' },
  { label: 'LinkedIn Monitor', icon: Linkedin, path: '/linkedin', section: 'ENGAGEMENT' },
  { label: 'Reports', icon: BarChart3, path: '/reports', section: 'ENGAGEMENT' },
];

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', section: 'ADMIN' },
  { label: 'User Management', icon: Users, path: '/admin/users', section: 'ADMIN' },
  { label: 'Email & System Settings', icon: Settings, path: '/admin/email', section: 'ADMIN' },
  { label: 'Reminder Rules', icon: BellRing, path: '/admin/reminders', section: 'ADMIN' },
  { label: 'Audit Logs', icon: ClipboardList, path: '/admin/logs', section: 'ADMIN' },
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
    <div className="w-56 h-screen glass-card border-r border-surface-border flex flex-col sticky top-0 shrink-0 rounded-none">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-surface-border flex items-center gap-2.5">
        <Logo size={32} glow={false} />
        <div>
          <div className="font-semibold text-sm font-display brand-text">Maverick Certify</div>
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
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  >
                    <ItemIcon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
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
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-semibold text-white">
            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{(user.role || 'coordinator').toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-left text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}