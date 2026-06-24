import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge, ProgressBar, StatCard, Pagination, usePaginatedData, Icon } from '../components/index.jsx';
import { useBatches, useReportsOverview } from '../hooks/useApi.js';
 
export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
 
  // Read logged-in coordinator name from localStorage
  const user = JSON.parse(localStorage.getItem('mc_user') || '{}');
  const coordinatorName = user.name || 'Coordinator';
 
  // Fetch overview stats + batches in parallel
  const { data: overview, loading: ovLoading } = useReportsOverview(15000);
  const { data: batchList, loading: batchLoading } = useBatches(15000);
 
  const loading = ovLoading || batchLoading;
 
  // Map batches to table rows
  const batches = useMemo(() => {
    if (!batchList) return [];
    return batchList.map(b => {
      const total = b.totalEmployees || 0;
      const posted = b.linkedinPostedCount || 0;
      const pending = b.pendingCount ?? Math.max(0, total - posted);
      const completion = b.completionPercentage ?? (total > 0 ? Math.round((posted / total) * 100) : 0);
      const s = (b.batchStatus || b.status || '').toLowerCase();
      const status = s === 'completed' || s === 'emails_sent' ? 'Completed'
        : s === 'draft' ? 'Draft'
        : 'In progress';
      return { id: b.batchId, name: b.trainingName || b.batchId, total, posted, pending, completion, status };
    });
  }, [batchList]);
 
  const stats = {
    totalCertificates: overview?.totalCertificates ?? 0,
    emailsSent: overview?.emailsDelivered ?? 0,
    linkedinPosts: overview?.linkedinPosted ?? 0,
    pendingUsers: overview?.linkedinPending ?? 0,
    completionRate: overview?.completionPercentage ?? 0,
    emailRate: overview?.emailOpenRate ?? 0,
  };
 
  const statusBadge = (status) => {
    if (status === 'Completed') return <Badge variant="success">{status}</Badge>;
    if (status === 'In progress') return <Badge variant="info">{status}</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  // Pagination for the Recent Batches table
  const { page, pageSize, total, pageItems: pagedBatches, setPage, setPageSize } = usePaginatedData(batches, 10);

 
  return (
    <MainLayout>
      <div className="relative overflow-hidden rounded-xl border border-surface-border bg-gradient-to-r from-teal-600/15 via-surface-card to-emerald-600/10 px-6 py-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold font-display text-lg shadow-lg shadow-teal-500/30">
            {coordinatorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display">Welcome, {coordinatorName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{today}</p>
          </div>
        </div>
      </div>
 
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4 mb-5">
        {[
          { icon: 'certificate', accent: 'teal', label: 'Total Certificates', value: stats.totalCertificates.toLocaleString(), sub: `${stats.emailsSent} emails sent`, color: 'text-white' },
          { icon: 'mail', accent: 'blue', label: 'Emails Sent', value: stats.emailsSent.toLocaleString(), sub: `${stats.emailRate}% delivered`, color: 'text-blue-400' },
          { icon: 'share', accent: 'emerald', label: 'LinkedIn Shared', value: stats.linkedinPosts.toLocaleString(), sub: `${stats.completionRate}% rate`, color: 'text-emerald-400' },
          { icon: 'clock', accent: 'amber', label: 'Yet to Share', value: stats.pendingUsers.toLocaleString(), sub: 'Reminders due', color: 'text-amber-400' },
          { icon: 'trendingUp', accent: 'violet', label: 'Share Rate', value: `${stats.completionRate}%`, sub: 'Overall', color: 'text-teal-400' },
        ].map((stat, i) => (
          <StatCard key={i} {...stat} loading={loading} />
        ))}
      </div>
 
      {/* Batch table */}
      <Card>
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="icon-chip bg-teal-500/10 text-teal-400 w-8 h-8">
              <Icon name="layers" className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-white text-sm">Recent Batches</h2>
          </div>
          {!loading && <Badge variant="teal">{batches.length} total</Badge>}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 mb-4 animate-pulse">
                  <div className="h-4 flex-1 bg-surface-border rounded" />
                  <div className="h-4 w-12 bg-surface-border rounded" />
                  <div className="h-4 w-12 bg-surface-border rounded" />
                  <div className="h-4 w-12 bg-surface-border rounded" />
                  <div className="h-4 w-24 bg-surface-border rounded" />
                  <div className="h-4 w-20 bg-surface-border rounded-full" />
                </div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No batches yet.{' '}
              <button onClick={() => navigate('/create-batch')} className="text-teal-400 hover:text-teal-300 underline">
                Create one to get started.
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Event / Training Name', 'Total Trainees', 'LinkedIn Shared', 'Yet to Share', 'Share Rate', 'Engagement Status'].map(h => {
                    const centerHeaders = new Set(['Total Trainees', 'LinkedIn Shared', 'Yet to Share', 'Engagement Status']);
                    const thClass = centerHeaders.has(h)
                      ? 'text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider'
                      : 'text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider';
                    return <th key={h} className={thClass}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedBatches.map(batch => (
                  <tr key={batch.id} className="table-row cursor-pointer" onClick={() => navigate('/tracking')}>
                    <td className="px-5 py-3.5 font-medium text-white">{batch.name}</td>
                    <td className="px-5 py-3.5 text-slate-300 text-center">{batch.total.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-emerald-400 text-center">{batch.posted.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-amber-400 text-center">{batch.pending.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={batch.completion} className="w-20" />
                        <span className="text-xs text-slate-400">{batch.completion}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 flex items-center justify-center">{statusBadge(batch.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && batches.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            itemLabel="batches"
          />
        )}
      </Card>
    </MainLayout>
  );
}