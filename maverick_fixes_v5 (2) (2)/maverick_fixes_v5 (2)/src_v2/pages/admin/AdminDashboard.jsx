import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, PageHeader } from '../../components/index.jsx';
import { useBatches, useReportsOverview } from '../../hooks/useApi.js';
import { getRecentActivities, getUsers } from '../../services/api.js';

// ── Color mapping for activity type indicator dots ────────────────────────────
const LOG_TYPE_COLOR = {
  batch:       'bg-purple-500',
  upload:      'bg-blue-500',
  certificate: 'bg-green-500',
  email:       'bg-cyan-500',
  linkedin:    'bg-emerald-500',
  reminder:    'bg-orange-500',
  user:        'bg-violet-500',
  settings:    'bg-yellow-500',
  report:      'bg-gray-500',
};

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    const day   = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year  = d.getFullYear();
    const time  = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}-${month}-${year} ${time}`;
  } catch { return iso; }
}

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem('mc_user') || '{}');
  const adminName = user.name || 'Admin';

  // ── Polled stats ───────────────────────────────────────────────────────────
  const { data: batches,  loading: batchLoading   } = useBatches(15000);
  const { data: overview, loading: overviewLoading } = useReportsOverview(15000);

  // ── Total Users — from MongoDB, polled every 15s ──────────────────────────
  const [totalUsers, setTotalUsers]     = useState(null);
  const [usersLoading, setUsersLoading] = useState(true);

  const loadUserCount = useCallback(async () => {
    try {
      const data = await getUsers();
      setTotalUsers(Array.isArray(data) ? data.length : 0);
    } catch { setTotalUsers(0); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    loadUserCount();
    const interval = setInterval(loadUserCount, 15000);
    return () => clearInterval(interval);
  }, [loadUserCount]);

  // ── Recent Activity — from MongoDB AuditLog, polled every 15s ─────────────
  const [activities, setActivities]               = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      const data = await getRecentActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch { setActivities([]); }
    finally { setActivitiesLoading(false); }
  }, []);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 15000);
    return () => clearInterval(interval);
  }, [loadActivities]);

  // ── Stats cards ────────────────────────────────────────────────────────────
  const loading = batchLoading || overviewLoading;

  const stats = [
    {
      label: 'Total Users',
      value: usersLoading ? '—' : String(totalUsers ?? 0),
      icon: '◉', color: 'text-indigo-400',
    },
    {
      label: 'Total Batches',
      value: loading ? '—' : String(batches?.length ?? 0),
      icon: '≡', color: 'text-blue-400',
    },
    {
      label: 'Certificates Generated',
      value: loading ? '—' : (overview?.totalCertificates ?? 0).toLocaleString(),
      icon: '☐', color: 'text-emerald-400',
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title={`Welcome, ${adminName}`}
        subtitle="System overview and control panel"
        actions={<span className="text-xs text-slate-500">Maverick Certify</span>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <p className="text-xl mb-2">{s.icon}</p>
            {(loading && i > 0 && i < 3) || (usersLoading && i === 0) ? (
              <div className="h-8 w-16 bg-surface-border rounded animate-pulse mb-1" />
            ) : (
              <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs text-emerald-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">Recent Activity</h2>
          {activitiesLoading && (
            <span className="text-xs text-slate-500 animate-pulse">Loading…</span>
          )}
        </div>

        {activitiesLoading ? (
          <div className="divide-y divide-surface-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full bg-surface-border mt-1.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-border rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-surface-border rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No recent activities found
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {activities.map(log => (
              <div key={log._id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-muted/30 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${LOG_TYPE_COLOR[log.type] || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{log.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {log.userName} · {formatTimestamp(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}