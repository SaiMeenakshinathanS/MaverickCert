import { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Badge, Button, ProgressBar, StatCard, Pagination, usePaginatedData, Icon, Avatar } from '../components/index.jsx';
import { getReminderRules } from '../services/api.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function LinkedInMonitor() {
  const [batches, setBatches] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({ posted: 0, notPosted: 0, reminded: 0 });
  const [sending, setSending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminderRules, setReminderRules] = useState({
    firstReminderAfter: 3,
    secondReminderAfter: 7,
    reminderInterval: 3,
    maximumReminders: 3,
    reminderTone: 'Friendly',
    autoClosePolicy: 'Never',
  });

  // Load reminder rules from DB
  useEffect(() => {
    getReminderRules()
      .then((data) => {
        if (data) setReminderRules({
          firstReminderAfter:  parseInt(data.firstReminderAfter,  10) || 3,
          secondReminderAfter: parseInt(data.secondReminderAfter, 10) || 7,
          reminderInterval:    parseInt(data.reminderInterval,    10) || 3,
          maximumReminders:    parseInt(data.maximumReminders,    10) || 3,
          reminderTone:        data.reminderTone    || 'Friendly',
          autoClosePolicy:     data.autoClosePolicy || 'Never',
        });
      })
      .catch(() => {}); // keep defaults on error
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all batches
        const batchResp = await fetch(`${BACKEND_URL}/api/batches`);
        if (!batchResp.ok) throw new Error('Failed to fetch batches');
        const batchData = await batchResp.json();
        const allBatches = Array.isArray(batchData.data) ? batchData.data : batchData.batches || [];
        setBatches(allBatches);

        // Fetch all employees with email status = SENT
        const empResp = await fetch(`${BACKEND_URL}/api/employees`);
        if (!empResp.ok) throw new Error('Failed to fetch employees');
        const empData = await empResp.json();
        const allEmployees = Array.isArray(empData.data) ? empData.data : empData.employees || [];
        
        // Map to candidates with LinkedIn status.
        // A candidate is "Posted" if EITHER linkedInPosted===true OR linkedinStatus==="POSTED"
        // This matches the backend $or query used by dashboard/reports — both fields must stay in sync.
        const candidatesList = allEmployees
          .filter(e => e.emailStatus === 'SENT')
          .map(e => ({
            id: e._id,
            name: e.employeeName,
            day: Math.floor((new Date() - new Date(e.createdAt)) / (24 * 60 * 60 * 1000)),
            reminders: e.linkedInReminderCount || 0,
            linkedinStatus: (e.linkedInPosted === true || e.linkedinStatus === 'POSTED') ? 'Posted' : 'Not Posted',
            batchId: e.batchId,
            employeeId: e.employeeId,
            email: e.email,
          }));
        
        setCandidates(candidatesList);

        // Calculate stats
        const posted = candidatesList.filter(c => c.linkedinStatus === 'Posted').length;
        const notPosted = candidatesList.filter(c => c.linkedinStatus === 'Not Posted').length;
        // Reminded = number of candidates with one or more reminders
        const reminded = candidatesList.filter(c => (c.reminders || 0) > 0).length;
        setStats({ posted, notPosted, reminded });
      } catch (err) {
        console.warn('Failed to fetch LinkedIn monitor data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const sendReminder = async (candidateId, employeeId, batchId) => {
    setSending(candidateId);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/email/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, batchId }),
      });

      const json = await resp.json();

      if (resp.ok && json.success) {
        // Use the count returned directly from MongoDB — no second fetch needed
        const newCount = json.data.linkedInReminderCount;

        setCandidates(prev =>
          prev.map(c =>
            c.id === candidateId ? { ...c, reminders: newCount } : c
          )
        );

        setStats(prev => {
          // Recalculate reminded count based on updated candidates
          const updated = candidates.map(c =>
            c.id === candidateId ? { ...c, reminders: newCount } : c
          );
          return {
            ...prev,
            reminded: updated.filter(c => (c.reminders || 0) > 0).length,
          };
        });
      } else {
        console.error('Reminder failed:', json.message);
      }
    } catch (err) {
      console.error('Failed to send reminder:', err);
    } finally {
      setSending(null);
    }
  };

  // Pagination for the candidates table
  const {
    page: candPage,
    pageSize: candPageSize,
    total: candTotal,
    pageItems: pagedCandidates,
    setPage: setCandPage,
    setPageSize: setCandPageSize,
  } = usePaginatedData(candidates, 10);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="icon-chip bg-blue-500/10 text-blue-400 w-10 h-10">
            <Icon name="share" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display">LinkedIn Monitor</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Track certificate sharing and send reminders (Day 0, {reminderRules.firstReminderAfter}, {reminderRules.secondReminderAfter}
              {reminderRules.maximumReminders > 2 ? `, ${reminderRules.secondReminderAfter + reminderRules.firstReminderAfter}…` : ''})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Left: Reminder schedule */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="bell" className="w-4 h-4 text-indigo-400" />
            Automatic Reminder Schedule
          </h3>
          <div className="relative space-y-3">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-surface-border" />
            {/* Day 0 */}
            <div className="relative flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-indigo-400 ring-4 ring-indigo-400/10" />
              <div>
                <p className="text-sm text-white font-medium">Day 0 — Certificate email sent</p>
                <p className="text-xs text-slate-500 mt-0.5">Certificate + LinkedIn posting request delivered</p>
              </div>
            </div>
            {/* First reminder */}
            <div className="relative flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-blue-400 ring-4 ring-blue-400/10" />
              <div>
                <p className="text-sm text-white font-medium">Day {reminderRules.firstReminderAfter} — First reminder</p>
                <p className="text-xs text-slate-500 mt-0.5">Sent to all NOT posted</p>
              </div>
            </div>
            {/* Second reminder */}
            <div className="relative flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-amber-400 ring-4 ring-amber-400/10" />
              <div>
                <p className="text-sm text-white font-medium">Day {reminderRules.secondReminderAfter} — Second reminder</p>
                <p className="text-xs text-slate-500 mt-0.5">Sent to still NOT posted</p>
              </div>
            </div>
                {/* Continuing reminders if max > 2 */}
            {reminderRules.maximumReminders > 2 && (
              <div className="relative flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-orange-400/60 ring-4 ring-orange-400/10" />
                <div>
                  <p className="text-sm text-slate-300 font-medium">
                    Every {reminderRules.reminderInterval} days after &mdash;{' '}
                    {Array.from(
                      { length: reminderRules.maximumReminders - 2 },
                      (_, i) => `Day ${reminderRules.secondReminderAfter + reminderRules.reminderInterval * (i + 1)}`
                    ).join(', ')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {reminderRules.maximumReminders - 2} more reminder{reminderRules.maximumReminders - 2 > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
            {/* Stop condition */}
            <div className="relative flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-surface-border" />
              <div>
                <p className="text-xs text-slate-500">
                  Stops after {reminderRules.maximumReminders} reminders or when posted
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Active batches */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="layers" className="w-4 h-4 text-indigo-400" />
            Active Batches
          </h3>
          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500">Loading...</p>
            ) : batches.length === 0 ? (
              <p className="text-xs text-slate-500">No active batches</p>
            ) : (
              batches.map(b => {
                const pct = Math.round((b.linkedinPostedCount || 0) / (b.validEmployees || 1) * 100);
                return (
                  <div key={b.batchId} className="bg-surface-muted rounded-lg p-3 text-xs hover:bg-surface-muted/70 transition-colors duration-150">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-slate-300">{b.trainingName}</p>
                      <span className="text-slate-400 font-medium">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} className="mb-1.5" />
                    <p className="text-slate-500">{b.validEmployees || 0} employees · {b.linkedinPostedCount || 0} posted</p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard icon="checkCircle" accent="emerald" align="center" label="LinkedIn Shared" value={stats.posted} sub="Certificates posted" color="text-emerald-400" />
        <StatCard icon="alertCircle" accent="red" align="center" label="Yet to Share" value={stats.notPosted} sub="Pending action" color="text-red-400" />
        <StatCard icon="bell" accent="amber" align="center" label="Reminded" value={stats.reminded} sub="At least one reminder sent" color="text-amber-400" />
      </div>

      {/* Candidate table */}
      <Card>
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="icon-chip bg-purple-500/10 text-purple-400 w-8 h-8">
              <Icon name="users" className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-white text-sm">Candidates</h2>
          </div>
          {!loading && <Badge variant="indigo">{candidates.length} total</Badge>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {['Candidate', 'Batch', 'Day', 'Reminders', 'Engagement Status', 'Action'].map(h => {
                const centerHeaders = new Set(['Batch', 'Day', 'Reminders', 'Engagement Status', 'Action']);
                const thClass = centerHeaders.has(h)
                  ? 'text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider'
                  : 'text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider';
                return <th key={h} className={thClass}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="px-5 py-3 text-center text-slate-500">Loading...</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan="6" className="px-5 py-3 text-center text-slate-500">No employees awaiting LinkedIn posts</td></tr>
            ) : (
              pagedCandidates.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="px-5 py-3.5 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size="sm" color={c.linkedinStatus === 'Posted' ? 'bg-emerald-600' : 'bg-indigo-500'} />
                      <span>{c.name}</span>
                    </div>
                  </td>
                                <td className="px-5 py-3.5 text-slate-400 text-xs text-center">
                    {c.batchId}
                  </td>

                  <td className="px-5 py-3.5 text-slate-400 text-center">
                    Day {c.day}
                  </td>

                  <td className="px-5 py-3.5 text-slate-400 text-center">
                    {c.reminders}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-center">
                      {c.linkedinStatus === 'Posted' ? (
                        <Badge variant="success">Posted</Badge>
                      ) : (
                        <Badge variant="danger">Not Posted</Badge>
                      )}
                    </div>
                  </td>
                 <td className="px-5 py-3.5">
                  <div className="flex justify-center">
                    {c.linkedinStatus === 'Posted' ? (
                      <span className="text-xs text-emerald-400">✓ Done</span>
                    ) : (
                      <button
                        onClick={() => sendReminder(c.id, c.employeeId, c.batchId)}
                        disabled={sending === c.id}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium border border-blue-500/20 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                      >
                        {sending === c.id ? '...' : 'Send now'}
                      </button>
                    )}
                  </div>
                </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && candidates.length > 0 && (
          <Pagination
            page={candPage}
            pageSize={candPageSize}
            total={candTotal}
            onPageChange={setCandPage}
            onPageSizeChange={setCandPageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            itemLabel="candidates"
          />
        )}
      </Card>
    </MainLayout>
  );
}
