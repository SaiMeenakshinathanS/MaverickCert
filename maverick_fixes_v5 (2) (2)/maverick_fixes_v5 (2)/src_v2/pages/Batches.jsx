import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge, Button, PageHeader, ProgressBar } from '../components/index.jsx';
import { useBatches } from '../hooks/useApi.js';
 
// ─── Loading skeleton ─────────────────────────────────────────────────────────
function BatchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center justify-between animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-surface-border rounded" />
              <div className="h-3 w-32 bg-surface-border rounded" />
            </div>
            <div className="flex items-center gap-6">
              <div className="h-8 w-12 bg-surface-border rounded" />
              <div className="h-8 w-12 bg-surface-border rounded" />
              <div className="h-3 w-32 bg-surface-border rounded" />
              <div className="h-6 w-20 bg-surface-border rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
 
// ─── Status badge helper ──────────────────────────────────────────────────────
function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'emails_sent') return <Badge variant="success">Completed</Badge>;
  if (s === 'certificates_generated' || s === 'template_generated' || s === 'validated' || s === 'uploaded')
    return <Badge variant="info">In Progress</Badge>;
  if (s === 'draft') return <Badge variant="default">Draft</Badge>;
  return <Badge variant="default">{status}</Badge>;
}
 
// ─── Batch card ───────────────────────────────────────────────────────────────
function BatchCard({ batch, onClick }) {
  const posted = batch.linkedinPostedCount ?? 0;
  const pending = batch.pendingCount ?? 0;
  const completion = batch.completionPercentage ?? 0;
  const total = batch.totalEmployees ?? 0;
 
  const dateStr = batch.trainingStartDate
    ? new Date(batch.trainingStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
 
  return (
    <Card className="p-5 hover:border-indigo-500/30 transition-all cursor-pointer" hover onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-white">{batch.trainingName || batch.batchId}</h3>
            <span className="text-xs text-slate-500 font-mono">{batch.batchId}</span>
          </div>
          <p className="text-xs text-slate-500">{dateStr} · {batch.organization || '—'}</p>
        </div>
        <div className="flex items-center justify-center gap-12 min-w-[500px]">
          <div className="text-center min-w-[90px]">
            <p className="text-lg font-bold text-white font-display">{total.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Trainees</p>
          </div>
          <div className="text-center min-w-[90px]">
            <p className="text-lg font-bold text-emerald-400 font-display">{posted.toLocaleString()}</p>
            <p className="text-xs text-slate-500">LinkedIn Shared</p>
          </div>
          <div className="text-center min-w-[90px]">
            <p className="text-lg font-bold text-amber-400 font-display">{pending.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Yet to Share</p>
          </div>
          <div className="flex flex-col items-center min-w-[120px]">
          <div className="w-32">
            <ProgressBar value={completion} />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Share Rate · {completion}%
          </p>
        </div>
          {statusBadge(batch.batchStatus || batch.status)}
        </div>
      </div>
    </Card>
  );
}
 
// ─── Main page ────────────────────────────────────────────────────────────────
export default function Batches() {
  const navigate = useNavigate();
  const { data: batches, loading, error, refetch } = useBatches();
 
  const totalCount = batches?.length ?? 0;
 
  return (
    <MainLayout>
      <PageHeader
        title="All Batches"
        subtitle={
          !loading && !error && batches
            ? `Total Batches: ${totalCount}`
            : 'Manage your certification batches'
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate('/create-batch')}>+ New Batch</Button>
          </div>
        }
      />
 
      {loading && <BatchSkeleton />}
 
      {error && (
        <Card className="p-6 text-center border-red-500/20">
          <p className="text-red-400 text-sm mb-3">⚠ Failed to load batches: {error}</p>
          <Button variant="secondary" onClick={refetch}>Retry</Button>
        </Card>
      )}
 
      {!loading && !error && (!batches || batches.length === 0) && (
        <Card className="p-10 text-center">
          <p className="text-slate-500 mb-4">No batches found. Create your first batch to get started.</p>
          <Button onClick={() => navigate('/create-batch')}>+ Create Batch</Button>
        </Card>
      )}
 
      {!loading && !error && batches && batches.length > 0 && (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.batchId}
              batch={batch}
              onClick={() => navigate('/tracking')}
            />
          ))}
        </div>
      )}
    </MainLayout>
  );
}