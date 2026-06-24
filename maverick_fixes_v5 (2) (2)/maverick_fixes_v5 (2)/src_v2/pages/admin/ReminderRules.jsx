import { useState, useEffect } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Button } from '../../components/index.jsx';
import { getReminderRules, saveReminderRules } from '../../services/api.js';

export default function ReminderRules() {
  const [rules, setRules] = useState({
    firstReminderAfter:  4,
    secondReminderAfter: 8,
    reminderInterval:    3,   // NEW
    maximumReminders:    5,
    reminderTone:        'Friendly',    // kept in state, saved to DB, not shown in UI
    autoClosePolicy:     'Never',       // kept in state, saved to DB, not shown in UI
  });
  const [status, setStatus]   = useState('idle'); // idle | loading | saving | saved | error
  const [errorMsg, setErrorMsg] = useState('');

  // Load saved rules from DB on mount
  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      try {
        const data = await getReminderRules();
        if (data) {
          setRules({
            firstReminderAfter:  parseInt(data.firstReminderAfter,  10) || 4,
            secondReminderAfter: parseInt(data.secondReminderAfter, 10) || 8,
            reminderInterval:    parseInt(data.reminderInterval,    10) || 3,  // NEW
            maximumReminders:    parseInt(data.maximumReminders,    10) || 5,
            reminderTone:        data.reminderTone    || 'Friendly',
            autoClosePolicy:     data.autoClosePolicy || 'Never',
          });
        }
        setStatus('idle');
      } catch (err) {
        console.warn('Could not load reminder rules:', err.message);
        setStatus('idle');
      }
    };
    load();
  }, []);

  const update = (key) => (e) => {
    const numericKeys = ['firstReminderAfter', 'secondReminderAfter', 'reminderInterval', 'maximumReminders'];
    const val = numericKeys.includes(key) ? parseInt(e.target.value, 10) || 1 : e.target.value;
    setRules((r) => ({ ...r, [key]: val }));
  };

  const handleSave = async () => {
    setStatus('saving');
    setErrorMsg('');
    try {
      const mcUser = JSON.parse(localStorage.getItem('mc_user') || '{}');
      const userName = mcUser.name || mcUser.userName || 'Admin';
      // Save all fields including tone & autoClose even though they're hidden in UI
      await saveReminderRules({ ...rules, updatedBy: userName });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const btnLabel =
    status === 'saving' ? 'Saving…'        :
    status === 'saved'  ? '✓ Rules saved'  :
    status === 'error'  ? '✗ Save failed'  :
                          'Save Reminder Rules';

  const btnVariant =
    status === 'saved'  ? 'success' :
    status === 'error'  ? 'danger'  :
                          'primary';

  // ── Schedule preview ──────────────────────────────────────────────────────
  // Build reminder days: first, second, then every reminderInterval until max
  const scheduleDays = [];
  if (rules.maximumReminders >= 1) scheduleDays.push(rules.firstReminderAfter);
  if (rules.maximumReminders >= 2) scheduleDays.push(rules.secondReminderAfter);
  for (let i = 3; i <= rules.maximumReminders; i++) {
    const prev = scheduleDays[scheduleDays.length - 1];
    scheduleDays.push(prev + (rules.reminderInterval || 3));
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white font-display">Reminder Rules</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure automated LinkedIn sharing reminder schedule</p>
      </div>

      {status === 'loading' && (
        <p className="text-xs text-slate-500 mb-4">Loading saved rules…</p>
      )}

      <Card className="p-6 mb-5">
        {/* ── 4-column grid: first, second, interval, max ── */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">

          {/* First reminder */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
              First Reminder After
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="30"
                className="input-field w-24"
                value={rules.firstReminderAfter}
                onChange={update('firstReminderAfter')}
              />
              <span className="text-sm text-slate-400">days</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">after certificate email</p>
          </div>

          {/* Second reminder */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
              Second Reminder After
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="60"
                className="input-field w-24"
                value={rules.secondReminderAfter}
                onChange={update('secondReminderAfter')}
              />
              <span className="text-sm text-slate-400">days</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">after certificate email</p>
          </div>

          {/* Reminder Interval — NEW field */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
              Reminder Interval
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="30"
                className="input-field w-24"
                value={rules.reminderInterval}
                onChange={update('reminderInterval')}
              />
              <span className="text-sm text-slate-400">days</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">between reminders after 2nd</p>
          </div>

          {/* Maximum reminders */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
              Maximum Reminders
            </label>
            <select
              className="input-field"
              value={rules.maximumReminders}
              onChange={update('maximumReminders')}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">total reminders allowed</p>
          </div>
        </div>

        {/* Schedule preview */}
        <div className="bg-surface-muted rounded-lg p-4 mt-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Calculated reminder schedule</p>
          <div className="space-y-2.5 text-xs">

            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>Day 0 — Certificate email sent</span>
            </div>

            {scheduleDays.map((day, i) => {
              const isFinal = i === scheduleDays.length - 1;
              const colors = ['bg-blue-400', 'bg-amber-400'];
              const color = i < 2 ? colors[i] : 'bg-orange-400/70';
              const label =
                i === 0 ? 'First reminder' :
                i === 1 ? 'Second reminder' :
                          `Reminder ${i + 1}${isFinal ? ' (final)' : ''}`;
              return (
                <div key={day} className={`flex items-center gap-2 ${isFinal ? 'text-slate-400' : 'text-slate-300'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span>Day {day} — {label}</span>
                </div>
              );
            })}

            {scheduleDays.length >= 3 && (
              <div className="flex items-center gap-2 text-slate-500 text-xs mt-1 pl-4">
                <span className="italic">
                  (every {rules.reminderInterval} day{rules.reminderInterval !== 1 ? 's' : ''} after Day {rules.secondReminderAfter})
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-500 pt-1 border-t border-surface-border">
              <span className="w-2 h-2 rounded-full bg-surface-border flex-shrink-0" />
              <span>
                Stops after {rules.maximumReminders} reminder{rules.maximumReminders > 1 ? 's' : ''} or when LinkedIn post is detected
              </span>
            </div>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <p className="text-xs text-red-400 mb-3 text-right">{errorMsg}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          variant={btnVariant}
          size="lg"
          disabled={status === 'saving' || status === 'loading'}
        >
          {btnLabel}
        </Button>
      </div>
    </AdminLayout>
  );
}
