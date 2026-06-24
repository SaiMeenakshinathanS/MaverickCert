import { useState, useEffect } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Badge, PageHeader } from '../../components/index.jsx';
import { getAuditLogs } from '../../services/api.js';

const TYPE_COLORS = {
  batch:       'indigo',
  upload:      'info',
  user:        'purple',
  certificate: 'success',
  email:       'info',
  linkedin:    'success',
  settings:    'warning',
  reminder:    'warning',
  report:      'default',
};

// Format ISO timestamp → "2026-06-02 08:30:45"
function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().slice(0, 8);
    return `${date} ${time}`;
  } catch {
    return iso;
  }
}

export default function AuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  const filtered = logs.filter(l =>
    (!filterUser || l.userName?.toLowerCase().includes(filterUser.toLowerCase())) &&
    (!filterType || l.type === filterType)
  );

  // Derive unique types from fetched data for the filter dropdown
  const types = [...new Set(logs.map(l => l.type).filter(Boolean))];

  return (
    <AdminLayout>
      <PageHeader
        title="Audit Logs"
        subtitle="Track all system actions and changes"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          className="input-field max-w-xs"
          placeholder="Filter by user..."
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
        />
        <select
          className="input-field max-w-xs"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Card>
        {logsLoading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Loading audit logs...
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['User', 'Action', 'Type', 'Timestamp'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-sm">
                      No audit log entries found
                    </td>
                  </tr>
                ) : (
                  filtered.map(log => (
                    <tr key={log._id} className="table-row">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300">
                            {(log.userName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{log.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-xs">{log.action}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={TYPE_COLORS[log.type] || 'default'}>{log.type}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                        {formatTimestamp(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-surface-border">
              <p className="text-xs text-slate-500">
                Showing {filtered.length} of {logs.length} entries
              </p>
            </div>
          </>
        )}
      </Card>
    </AdminLayout>
  );
}
