import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Icon } from '../../components/index.jsx';
import { getSystemHealth } from '../../services/api.js';

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    full: d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusPill({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function InfoRow({ label, value, sub, mono }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-surface-border last:border-0">
      <span className="text-sm text-slate-400 shrink-0 w-44">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TimestampRow({ label, iso, by }) {
  const dt = formatDateTime(iso);
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-surface-border last:border-0">
      <span className="text-sm text-slate-400 shrink-0 w-44">{label}</span>
      <div className="text-right">
        {dt ? (
          <>
            <p className="text-sm font-medium text-white">{dt.date} · {dt.time}</p>
            {by && <p className="text-xs text-slate-500 mt-0.5">by {by}</p>}
          </>
        ) : (
          <span className="text-sm text-slate-600 italic">Not recorded yet</span>
        )}
      </div>
    </div>
  );
}

const activityTypeConfig = {
  settings: { icon: 'settings', color: 'text-teal-500', bg: 'bg-teal-500/15' },
  user:     { icon: 'users', color: 'text-blue-500',   bg: 'bg-blue-500/15'   },
  reminder: { icon: 'bell',  color: 'text-amber-500',  bg: 'bg-amber-500/15'  },
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton() {
  const bar = (w) => <div className={`h-4 bg-slate-800 rounded animate-pulse ${w}`} />;
  return (
    <div className="space-y-6">
      {[1, 2].map(i => (
        <Card key={i} className="p-6 space-y-4">
          {bar('w-32')}
          <div className="space-y-3">
            {[1,2,3].map(j => (
              <div key={j} className="flex justify-between">
                {bar('w-36')} {bar('w-48')}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4">
      <span className="text-red-400 text-xl mt-0.5">⚠</span>
      <div>
        <p className="text-sm font-semibold text-red-400 mb-1">Failed to load data</p>
        <p className="text-xs text-slate-400">{message}</p>
        <button
          onClick={onRetry}
          className="mt-3 text-xs text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmailAndSystemSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSystemHealth();
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Email & System Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Live email service status and recent configuration activity</p>
        </div>
      </div>

      {loading && <Skeleton />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-6">

          {/* ── Section 1: Email Service Status ────────────────────────────── */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white">Email Service</h2>
                <p className="text-xs text-slate-500 mt-0.5">Certificate and reminder delivery via Nodemailer</p>
              </div>
              <StatusPill active={data.emailServiceStatus === 'Active'} />
            </div>

            <div className="divide-y divide-surface-border">
              <InfoRow
                label="Provider"
                value={data.emailServiceProvider}
              />
              <InfoRow
                label="Database"
                value={data.databaseStatus}
                sub={data.databaseStatus === 'Connected' ? 'MongoDB Atlas' : 'Check connection'}
              />
              <TimestampRow
                label="Last Certificate Email"
                iso={data.lastCertificateEmail}
                by={data.lastCertificateEmailBy}
              />
              <TimestampRow
                label="Last Reminder Email"
                iso={data.lastReminderEmail}
                by={data.lastReminderEmailBy}
              />
            </div>
          </Card>

          {/* ── Section 2: Email Volume Summary ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                <Icon name="mail" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-display">{data.totalEmailsSent.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total emails sent successfully</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center text-red-500 shrink-0">
                <Icon name="alertCircle" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-display">{data.totalEmailsFailed.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total failed deliveries</p>
              </div>
            </Card>
          </div>

          {/* ── Section 3: Last Configuration Update ───────────────────────── */}
          <Card className="p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-white">Last Configuration Update</h2>
              <p className="text-xs text-slate-500 mt-0.5">Most recent change to system settings</p>
            </div>
            <div className="divide-y divide-surface-border">
              <TimestampRow
                label="Updated At"
                iso={data.lastConfigUpdate}
                by={data.lastConfigUpdateBy}
              />
            </div>
          </Card>

          {/* ── Section 4: Recent Configuration Activity ────────────────────── */}
          {data.recentActivity && data.recentActivity.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-border">
                <h2 className="text-sm font-semibold text-white">Recent Configuration Activity</h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest 5 changes from audit logs</p>
              </div>
              <div className="divide-y divide-surface-border">
                {data.recentActivity.map((item, i) => {
                  const cfg = activityTypeConfig[item.type] || { icon: '◈', color: 'text-slate-400', bg: 'bg-slate-700/30' };
                  const dt = formatDateTime(item.createdAt);
                  const isSvgIcon = cfg.icon === 'users' || cfg.icon === 'bell' || cfg.icon === 'settings';
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color} shrink-0`}>
                        {isSvgIcon ? <Icon name={cfg.icon} className="w-4 h-4" /> : cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.userName}</p>
                      </div>
                      {dt && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500">{dt.date}</p>
                          <p className="text-xs text-slate-600">{dt.time}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {data.recentActivity && data.recentActivity.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-slate-500">No configuration changes recorded yet.</p>
            </Card>
          )}

        </div>
      )}
    </AdminLayout>
  );
}