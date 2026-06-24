import { useState, useMemo } from 'react';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge, Button } from '../components/index.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  useReportsOverview,
  useReportsBatches,
  useReportsLinkedIn,
  useReportsTrends,
  useReportsEmailStats,
} from '../hooks/useApi.js';
import api from '../services/api.js';

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Skeleton loader for summary cards ───────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-surface-border rounded-lg" />
        <div className="h-3 w-20 bg-surface-border rounded" />
      </div>
      <div className="h-8 w-24 bg-surface-border rounded mb-1" />
      <div className="h-3 w-32 bg-surface-border rounded" />
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, change, up, icon, gradient, iconColor, valueColor }) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} border border-surface-border rounded-xl p-4 hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-current opacity-5 blur-xl" />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-medium flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-amber-400'}`}>
          {up ? '↑' : '↓'} {change}
        </span>
      </div>
      <p className={`text-2xl font-bold font-display ${valueColor} mb-0.5`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────
function statusVariant(s) {
  const lower = (s || '').toLowerCase();
  if (lower === 'completed' || lower === 'emails_sent') return 'success';
  if (lower.includes('progress') || lower.includes('generated') || lower.includes('validated')) return 'info';
  return 'default';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Reports() {
  const [downloading, setDownloading] = useState(null);
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }
  const [searchBatch, setSearchBatch] = useState('');

  const { data: overview, loading: ovLoading } = useReportsOverview();
  const { data: batchData, loading: batchLoading } = useReportsBatches();
  const { data: linkedIn } = useReportsLinkedIn();
  const { data: trends, loading: trendsLoading } = useReportsTrends();
  const { data: emailStats, loading: emailLoading } = useReportsEmailStats();

  const batches = batchData ?? [];

  // Filter batches by search
  const filteredBatches = useMemo(() => {
    if (!searchBatch.trim()) return batches;
    return batches.filter(b =>
      (b.trainingName || '').toLowerCase().includes(searchBatch.toLowerCase()) ||
      (b.batchId || '').toLowerCase().includes(searchBatch.toLowerCase())
    );
  }, [batches, searchBatch]);

  // Build email pie data
  const emailPieData = emailStats?.breakdown ?? [
    { name: 'Delivered', value: overview?.emailsDelivered ?? 0, color: '#10b981' },
    { name: 'Failed', value: overview?.emailsFailed ?? 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Build trend line data  
  const trendData = (trends && trends.length > 0)
    ? trends
    : overview ? [{ label: 'Now', certs: overview.totalCertificates }] : [];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const EXPORT_MAP = {
    'Certificate Report': { endpoint: '/api/reports/export/certificates', filename: 'certificate_report.csv' },
    'Email Analytics':    { endpoint: '/api/reports/export/emails',        filename: 'email_analytics.csv'    },
    'LinkedIn Report':    { endpoint: '/api/reports/export/linkedin',      filename: 'linkedin_report.csv'    },
    'Full Report':        { endpoint: '/api/reports/export/full',          filename: 'full_report.pdf'        },
  };

  const handleExport = async (label) => {
    if (downloading) return;
    setDownloading(label);
    try {
      const { endpoint, filename } = EXPORT_MAP[label];
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv';
      const response = await api.get(endpoint, { responseType: 'blob' });
      // response.data is already a Blob when responseType:'blob' — wrapping it in
      // new Blob([blob]) double-encodes the binary and corrupts the file
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`${label} downloaded successfully`);
    } catch (err) {
      showToast(`Failed to export ${label}: ${err.message}`, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Summary cards config (dynamic)
  const summaryCards = [
    {
      label: 'Total Certificates',
      value: ovLoading ? '—' : (overview?.totalCertificates ?? 0).toLocaleString(),
      change: `${overview?.totalEmployees ?? 0} employees`,
      up: true,
      gradient: 'from-indigo-500/15 to-indigo-500/5',
      iconColor: 'text-indigo-400',
      valueColor: 'text-white',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      label: 'Emails Delivered',
      value: ovLoading ? '—' : (overview?.emailsDelivered ?? 0).toLocaleString(),
      change: `${overview?.emailOpenRate ?? 0}% delivery rate`,
      up: true,
      gradient: 'from-blue-500/15 to-blue-500/5',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-300',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
    {
      label: 'Email Open Rate',
      value: ovLoading ? '—' : `${overview?.emailOpenRate ?? 0}%`,
      change: `${overview?.emailsFailed ?? 0} failed`,
      up: (overview?.emailOpenRate ?? 0) >= 50,
      gradient: 'from-cyan-500/15 to-cyan-500/5',
      iconColor: 'text-cyan-400',
      valueColor: 'text-cyan-300',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    },
    {
      label: 'LinkedIn Shared',
      value: ovLoading ? '—' : (overview?.linkedinPosted ?? 0).toLocaleString(),
      change: `${overview?.completionPercentage ?? 0}% compliance`,
      up: (overview?.completionPercentage ?? 0) >= 50,
      gradient: 'from-emerald-500/15 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    },
    {
      label: 'Yet to Share',
      value: ovLoading ? '—' : (overview?.linkedinPending ?? 0).toLocaleString(),
      change: `${overview?.remindersSent ?? 0} reminders sent`,
      up: false,
      gradient: 'from-amber-500/15 to-amber-500/5',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Share Rate',
      value: ovLoading ? '—' : `${overview?.completionPercentage ?? 0}%`,
      change: 'LinkedIn compliance',
      up: (overview?.completionPercentage ?? 0) >= 60,
      gradient: 'from-violet-500/15 to-violet-500/5',
      iconColor: 'text-violet-400',
      valueColor: 'text-violet-300',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    },
  ];

  return (
    <MainLayout>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Monitor certificate generation, email delivery, engagement, and export insights.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {ovLoading
          ? [1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)
          : summaryCards.map((card, i) => <SummaryCard key={i} {...card} />)
        }
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5 mb-7">

        {/* Trend line chart (2 cols) */}
        <div className="col-span-2">
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Certificate Generation Trend</h3>
                <p className="text-xs text-slate-500 mt-0.5">Weekly certificates generated</p>
              </div>
              <span className="text-xs text-slate-500">Last 8 weeks</span>
            </div>
            {trendsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse text-slate-600 text-sm">Loading chart...</div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No trend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                  <XAxis dataKey={trendData[0]?.week !== undefined ? 'week' : 'label'} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="certs" name="Certificates" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Email status pie chart (1 col) */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Email Delivery</h3>
          <p className="text-xs text-slate-500 mb-5">Status breakdown</p>
          {emailLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse text-slate-600 text-sm">Loading...</div>
            </div>
          ) : emailPieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No email data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <PieChart>
                <Pie data={emailPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
                  dataKey="value" paddingAngle={3}>
                  {emailPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value, entry) => (
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}: {entry.payload.value}</span>
                  )}
                />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Batch performance table */}
      <Card className="mb-7">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Batch Performance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Per-batch completion metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={searchBatch}
              onChange={e => setSearchBatch(e.target.value)}
              placeholder="Search batch..."
              className="text-xs bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 w-44"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Batch', 'Organization', 'Total Trainees', 'Certs', 'Emails', 'LinkedIn Shared', 'Yet to Share', 'Share Rate', 'Engagement Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batchLoading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-500 text-sm animate-pulse">Loading batch data...</td></tr>
              ) : filteredBatches.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-500 text-sm">No batches found.</td></tr>
              ) : (
                filteredBatches.map((b, i) => (
                  <tr key={b.batchId || i} className="table-row">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-white text-xs">{b.trainingName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{b.batchId}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{b.organization || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-300">{(b.totalEmployees || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-indigo-400">{(b.certGenerated || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-blue-400">{(b.emailSent || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-emerald-400">{(b.linkedinPostedCount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-amber-400">{(b.pendingCount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-muted rounded-full h-1.5 min-w-[60px]">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${b.completionPercentage || 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{b.completionPercentage || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(b.status)}>{b.status || 'draft'}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* LinkedIn stats */}
      {linkedIn && (
        <Card className="mb-7 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">LinkedIn Tracking Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'LinkedIn Shared', value: linkedIn.totalPosted, color: 'text-emerald-400' },
              { label: 'Yet to Share', value: linkedIn.totalPending, color: 'text-amber-400' },
              { label: 'Reminded', value: linkedIn.totalReminded, color: 'text-blue-400' },
              { label: 'Overall Rate', value: `${linkedIn.overallRate}%`, color: 'text-indigo-400' },
            ].map((s, i) => (
              <div key={i} className="stat-card text-center">
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value?.toLocaleString?.() ?? s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export Reports — full width */}
      <Card className="p-5 mb-7">
        <h3 className="text-sm font-semibold text-white mb-1">Export Reports</h3>
        <p className="text-xs text-slate-500 mb-4">Download analytics and certificate data</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Certificate Report', ext: 'CSV', color: 'text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10' },
            { label: 'Email Analytics', ext: 'CSV', color: 'text-blue-400 border-blue-500/20 hover:bg-blue-500/10' },
            { label: 'LinkedIn Report', ext: 'CSV', color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' },
            { label: 'Full Report', ext: 'PDF', color: 'text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10' },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => handleExport(r.label)}
              disabled={downloading === r.label}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${r.color} ${downloading === r.label ? 'opacity-60' : ''}`}
            >
              <span>{downloading === r.label ? 'Preparing…' : r.label}</span>
              <span className="opacity-60">{r.ext} ↓</span>
            </button>
          ))}
        </div>
      </Card>
    </MainLayout>
  );
}