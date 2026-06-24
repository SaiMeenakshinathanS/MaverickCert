import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge } from '../components/index.jsx';
import { getEmailLogs } from '../services/api.js';

// ── Status config ──────────────────────────────────────────────────────────────
const emailStatusConfig = {
  SENT:    { color: 'success', dot: 'bg-emerald-400', label: 'Sent' },
  FAILED:  { color: 'danger',  dot: 'bg-red-400',     label: 'Failed' },
  PENDING: { color: 'warning', dot: 'bg-amber-400',   label: 'Pending' },
};

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

// ── View Log modal ─────────────────────────────────────────────────────────────
function ViewLogModal({ log, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-lg shadow-2xl slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Email Log Detail</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sent to {log.employeeName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="space-y-3 text-xs">
          {[
            { label: 'Employee ID',   value: log.employeeId },
            { label: 'Name',          value: log.employeeName },
            { label: 'Email',         value: log.email, mono: true },
            { label: 'Status',        value: log.emailStatus, colored: true },
            { label: 'Certificate',   value: log.certificateFile || '—', mono: true },
            { label: 'Sent At',       value: log.sentAt ? new Date(log.sentAt).toLocaleString() : '—' },
            ...(log.failureReason ? [{ label: 'Failure Reason', value: log.failureReason, danger: true }] : []),
          ].map(({ label, value, mono, colored, danger }) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
              <span className={`text-right break-all ${mono ? 'font-mono text-slate-300' : ''} ${colored ? (value === 'SENT' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold') : 'text-slate-300'} ${danger ? 'text-red-400' : ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4 border-t border-surface-border mt-4">
          <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EmailTracking() {
  const [batchId, setBatchId]         = useState('');
  const [inputBatchId, setInputBatchId] = useState('');
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState('All');
  const [viewingLog, setViewingLog]   = useState(null);

  const fetchLogs = async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getEmailLogs(id.trim());
      setData(result);
      setBatchId(id.trim());
    } catch (err) {
      setError(err.message || 'Failed to fetch logs');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchLogs(inputBatchId);

  const logs = data?.logs || [];
  const filteredLogs = filter === 'All' ? logs : logs.filter(l => l.emailStatus === filter);

  return (
    <MainLayout>
      {viewingLog && <ViewLogModal log={viewingLog} onClose={() => setViewingLog(null)} />}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white font-display">Email Tracking</h1>
        <p className="text-sm text-slate-400 mt-0.5">Monitor certificate delivery status per batch</p>
      </div>

      {/* ── Batch ID search ──────────────────────────────────────────────── */}
      <Card className="p-4 mb-5">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Batch ID</label>
            <input
              type="text"
              value={inputBatchId}
              onChange={e => setInputBatchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !inputBatchId.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <><Spinner /> Loading…</> : 'Load Logs'}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-2">⚠ {error}</p>
        )}
      </Card>

      {data && (
        <>
          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Total Dispatched', value: data.total,  color: 'text-white' },
              { label: 'Sent',             value: data.sent,   color: 'text-emerald-400' },
              { label: 'Failed',           value: data.failed, color: data.failed > 0 ? 'text-red-400' : 'text-slate-500' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                {s.label === 'Sent' && data.total > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Math.round((data.sent / data.total) * 100)}% delivery rate
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── Filter tabs ─────────────────────────────────────────────────── */}
          <div className="flex gap-1 mb-4">
            {['All', 'SENT', 'FAILED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-muted'
                }`}
              >
                {f} {f !== 'All' && `(${logs.filter(l => l.emailStatus === f).length})`}
              </button>
            ))}
          </div>

          {/* ── Table ───────────────────────────────────────────────────────── */}
          <Card>
            {filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No records found for the selected filter.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Employee', 'Email', 'Certificate', 'Status', 'Sent At', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => {
                    const sc = emailStatusConfig[log.emailStatus] || emailStatusConfig.PENDING;
                    return (
                      <tr key={i} className="table-row">
                        {/* Employee */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300 flex-shrink-0">
                              {log.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-white">{log.employeeName}</p>
                              <p className="text-xs text-slate-500">{log.employeeId}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{log.email}</td>

                        {/* Certificate filename */}
                        <td className="px-5 py-3.5 text-slate-500 text-xs font-mono max-w-[160px] truncate">
                          {log.certificateFile || '—'}
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${sc.dot} flex-shrink-0`} />
                            <Badge variant={sc.color}>{sc.label}</Badge>
                          </div>
                          {log.failureReason && (
                            <p className="text-xs text-red-400 mt-1 max-w-[140px] truncate" title={log.failureReason}>
                              {log.failureReason}
                            </p>
                          )}
                        </td>

                        {/* Sent At */}
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setViewingLog(log)}
                            className="text-xs text-slate-400 hover:text-slate-200 font-medium border border-surface-border px-2 py-1 rounded-lg hover:bg-surface-muted transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {filteredLogs.length} of {logs.length} records
                {batchId && <span className="ml-2 text-slate-600">· Batch: {batchId}</span>}
              </p>
              {data.failed === 0 && data.total > 0 && (
                <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs">
                  All emails delivered
                </span>
              )}
            </div>
          </Card>
        </>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <p className="text-4xl mb-4">📬</p>
          <p className="text-sm">Enter a Batch ID above to load email delivery logs.</p>
        </div>
      )}
    </MainLayout>
  );
}
