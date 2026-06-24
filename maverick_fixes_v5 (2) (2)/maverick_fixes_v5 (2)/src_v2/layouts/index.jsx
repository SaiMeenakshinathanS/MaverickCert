import Sidebar from '../components/Sidebar.jsx';

export function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-surface-dark">
      <Sidebar role="coordinator" />
      <main className="relative flex-1 overflow-y-auto">
        <div className="ambient-glow">
          <span className="w-96 h-96 -top-32 right-0 bg-indigo-600" />
          <span className="w-96 h-96 bottom-0 left-1/3 bg-purple-600" />
        </div>
        <div className="relative z-10 p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-surface-dark">
      <Sidebar role="admin" />
      <main className="relative flex-1 overflow-y-auto">
        <div className="ambient-glow">
          <span className="w-96 h-96 -top-32 right-0 bg-indigo-600" />
          <span className="w-96 h-96 bottom-0 left-1/3 bg-purple-600" />
        </div>
        <div className="relative z-10 p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
