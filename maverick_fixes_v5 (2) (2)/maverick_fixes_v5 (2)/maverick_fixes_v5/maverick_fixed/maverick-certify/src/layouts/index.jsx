import Sidebar from '../components/Sidebar.jsx';
import { ThemeFab } from '../components/index.jsx';
import { useTheme } from '../hooks/useTheme.js';

export function MainLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex min-h-screen bg-surface-dark">
      <Sidebar role="coordinator" />
      <main className="relative flex-1 overflow-y-auto">
        <div className="ambient-glow">
          <span className="w-96 h-96 -top-32 -left-20 glow-violet" />
          <span className="w-96 h-96 bottom-0 left-1/3 glow-pink" />
          <span className="w-96 h-96 top-1/4 -right-32 glow-indigo" />
        </div>
        <div className="relative z-10 p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      <ThemeFab theme={theme} onToggle={toggleTheme} />
    </div>
  );
}

export function AdminLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex min-h-screen bg-surface-dark">
      <Sidebar role="admin" />
      <main className="relative flex-1 overflow-y-auto">
        <div className="ambient-glow">
          <span className="w-96 h-96 -top-32 -left-20 glow-violet" />
          <span className="w-96 h-96 bottom-0 left-1/3 glow-pink" />
          <span className="w-96 h-96 top-1/4 -right-32 glow-indigo" />
        </div>
        <div className="relative z-10 p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      <ThemeFab theme={theme} onToggle={toggleTheme} />
    </div>
  );
}

export function AuthLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="ambient-glow">
        <span className="w-96 h-96 top-1/4 left-1/4 glow-violet" />
        <span className="w-96 h-96 bottom-1/4 right-1/4 glow-pink" />
        <span className="w-72 h-72 top-0 right-1/3 glow-indigo" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
      <ThemeFab theme={theme} onToggle={toggleTheme} />
    </div>
  );
}
