import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge, Button, Pagination, usePaginatedData } from '../components/index.jsx';
import { useCertificates } from '../hooks/useApi.js';
import { downloadCertificate } from '../services/api.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// ─── Download toast ───────────────────────────────────────────────────────────
function DownloadToast({ name, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-card border border-emerald-500/30 rounded-xl px-4 py-3 shadow-2xl slide-in">
      <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</span>
      <div>
        <p className="text-sm font-medium text-white">Download started</p>
        <p className="text-xs text-slate-400 mt-0.5">{name} — certificate PDF</p>
      </div>
      <button onClick={onDismiss} className="ml-2 text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors">×</button>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <tbody>
      {[1,2,3,4,5].map(i => (
        <tr key={i} className="border-b border-surface-border animate-pulse">
          {[1,2,3,4,5,6,7].map(j => (
            <td key={j} className="px-5 py-4">
              <div className="h-3 bg-surface-border rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Certificates() {
  const navigate = useNavigate();

  const [batchFilter, setBatchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: certData, loading, error, refetch } = useCertificates({ limit: 200 });
  const certs = certData?.data ?? [];

  // Build batch list for filter
  const batchOptions = useMemo(() => {
    const names = [...new Set(certs.map(c => c.batchName).filter(Boolean))];
    return ['All', ...names];
  }, [certs]);

  const filtered = useMemo(() => {
    return certs.filter(c => {
      const batchOk = batchFilter === 'All' || c.batchName === batchFilter;
      const statusOk = statusFilter === 'All' || c.certificateStatus === statusFilter.toUpperCase();
      return batchOk && statusOk;
    });
  }, [certs, batchFilter, statusFilter]);

  const totalGenerated = certs.filter(c => c.certificateStatus === 'GENERATED' || c.certificateStatus === 'SENT').length;
  const pending = certs.filter(c => c.certificateStatus === 'PENDING').length;

  // Pagination for the filtered certificate table
  const {
    page,
    pageSize,
    total,
    pageItems: pagedCerts,
    setPage,
    setPageSize,
  } = usePaginatedData(filtered, 10);

  // Reset to first page whenever the filters change so the user doesn't
  // land on an empty page.
  const handleBatchFilter = (b) => { setBatchFilter(b); setPage(1); };
  const handleStatusFilter = (s) => { setStatusFilter(s); setPage(1); };

  const handleDownload = (cert) => {
    const url = `${BACKEND_URL}/api/certificates/download/${cert.batchId}/${cert.employeeId}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `${cert.employeeName}_certificate.pdf`;
    a.click();
    setToast(cert.employeeName);
    setTimeout(() => setToast(null), 3500);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <MainLayout>
      {toast && <DownloadToast name={toast} onDismiss={() => setToast(null)} />}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-sm shadow-2xl slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Certificate Details</h3>
              <button onClick={() => setViewing(null)} className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">×</button>
            </div>
            <div className="space-y-3 text-xs">
              {[
                ['Candidate', viewing.employeeName],
                ['Email', viewing.employeeEmail],
                ['Employee ID', viewing.employeeId],
                ['Batch', viewing.batchName],
                ['Organization', viewing.organization],
                ['Generated', formatDate(viewing.generatedDate)],
                ['Cert Status', viewing.certificateStatus],
                ['Email Status', viewing.emailStatus],
                ['LinkedIn', viewing.linkedInPosted ? '✓ Posted' : 'Not posted'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-surface-border pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 font-medium text-right max-w-[60%] truncate">{v || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setViewing(null)}>Close</Button>
              {(viewing.certificateStatus === 'GENERATED' || viewing.certificateStatus === 'SENT') && (
                <Button className="flex-1 justify-center" onClick={() => { handleDownload(viewing); setViewing(null); }}>
                  ↓ Download
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Certificate Library</h1>
          <p className="text-sm text-slate-400 mt-0.5">View and download all generated certificates</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Generated', value: totalGenerated.toLocaleString(), color: 'text-white' },
          { label: 'Pending Generation', value: pending.toLocaleString(), color: 'text-amber-400' },
          { label: 'Total Records', value: certs.length.toLocaleString(), color: 'text-teal-400' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 bg-teal-500/8 border border-teal-500/20 rounded-xl px-4 py-3 mb-5">
        <span className="text-teal-400 text-base flex-shrink-0">ℹ</span>
        <p className="text-xs text-slate-400">
          To generate new certificates, start a batch from the{' '}
          <button onClick={() => navigate('/batches')} className="text-teal-400 hover:text-teal-300 underline transition-colors font-medium">
            Batches page
          </button>
          {' '}and complete the template and generation steps.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Batch:</span>
          <div className="flex gap-1 flex-wrap">
            {batchOptions.slice(0, 6).map(b => (
              <button key={b} onClick={() => handleBatchFilter(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  batchFilter === b ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-muted border border-surface-border'
                }`}>
                {b === 'All' ? 'All batches' : b}
              </button>
            ))}
          </div>
        </div>
        <div className="w-px h-4 bg-surface-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Status:</span>
          <div className="flex gap-1">
            {['All', 'Generated', 'Sent', 'Pending'].map(s => (
              <button key={s} onClick={() => handleStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-muted border border-surface-border'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} of {certs.length} certificates</span>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-6 text-center border-red-500/20 mb-4">
          <p className="text-red-400 text-sm mb-3">⚠ Failed to load certificates: {error}</p>
          <Button variant="secondary" onClick={refetch}>Retry</Button>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Candidate', 'Email', 'Batch', 'Generated', 'Cert Status', 'Email', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>

            {loading ? <TableSkeleton /> : (
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      {certs.length === 0 ? 'No certificates found. Generate some from the batches page.' : 'No certificates match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  pagedCerts.map(cert => (
                    <tr key={cert._id} className="table-row">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-teal-700 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 shadow-md">
                            {(cert.employeeName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{cert.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{cert.employeeEmail}</td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs">{cert.batchName}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{formatDate(cert.generatedDate)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={
                          cert.certificateStatus === 'GENERATED' || cert.certificateStatus === 'SENT'
                            ? 'success'
                            : 'warning'
                        }>
                          {cert.certificateStatus}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={cert.emailStatus === 'SENT' ? 'info' : cert.emailStatus === 'FAILED' ? 'danger' : 'default'}>
                          {cert.emailStatus}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewing(cert)}
                            className="text-xs text-slate-400 hover:text-slate-200 font-medium border border-surface-border px-2 py-1 rounded-lg hover:bg-surface-muted transition-colors"
                          >
                            View
                          </button>
                          {(cert.certificateStatus === 'GENERATED' || cert.certificateStatus === 'SENT') && (
                            <button
                              onClick={() => handleDownload(cert)}
                              className="text-xs text-teal-400 hover:text-teal-300 font-medium border border-teal-500/20 px-2 py-1 rounded-lg hover:bg-teal-500/10 transition-colors"
                            >
                              ↓ Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            itemLabel="certificates"
          />
        )}
      </Card>
    </MainLayout>
  );
}