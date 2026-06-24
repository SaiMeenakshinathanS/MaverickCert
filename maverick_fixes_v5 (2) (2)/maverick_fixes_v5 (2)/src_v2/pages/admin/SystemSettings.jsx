import { useState } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Button, PageHeader } from '../../components/index.jsx';
import { mockSettings } from '../../mock/adminData.js';

export default function SystemSettings() {
  const [settings, setSettings] = useState(mockSettings);
  const [saved, setSaved] = useState(false);

  const update = (key) => (e) => setSettings(s => ({ ...s, [key]: e.target.value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="System Configuration"
        subtitle="Configure email, storage, and reminder settings"
      />

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Email config */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Email Service</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Email Service Provider</label>
              <select className="input-field" value={settings.emailService} onChange={update('emailService')}>
                <option>SendGrid</option>
                <option>AWS SES</option>
                <option>Mailgun</option>
                <option>SMTP</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">SMTP Host</label>
              <input className="input-field" value={settings.smtpHost} onChange={update('smtpHost')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Port</label>
                <input className="input-field" value={settings.smtpPort} onChange={update('smtpPort')} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
                <input className="input-field" value={settings.smtpUser} onChange={update('smtpUser')} />
              </div>
            </div>
          </div>
        </Card>

        {/* Storage config */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">File Storage</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Storage Provider</label>
              <select className="input-field" value={settings.fileStorage} onChange={update('fileStorage')}>
                <option>AWS S3</option>
                <option>Google Cloud Storage</option>
                <option>Azure Blob</option>
                <option>Local</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">LinkedIn Tracking</label>
              <select
                className="input-field"
                value={settings.linkedinTracking ? 'enabled' : 'disabled'}
                onChange={e => setSettings(s => ({ ...s, linkedinTracking: e.target.value === 'enabled' }))}
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Reminder rules */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">LinkedIn Reminder Rules</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Reminder interval</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input-field w-20"
                  value={settings.linkedinReminderIntervalDays}
                  onChange={update('linkedinReminderIntervalDays')}
                  min="1"
                  max="30"
                />
                <span className="text-sm text-slate-400">days (default: 3)</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Sends reminder every N days until employee posts on LinkedIn</p>
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Email service', status: 'Connected', ok: true },
              { label: 'File storage', status: 'Connected', ok: true },
              { label: 'LinkedIn tracking', status: settings.linkedinTracking ? 'Active' : 'Disabled', ok: settings.linkedinTracking },
              { label: 'Reminder cron', status: 'Running daily', ok: true },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span className={`text-xs ${s.ok ? 'text-emerald-400' : 'text-slate-500'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs text-emerald-400">System ready — all services connected</span>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant={saved ? 'success' : 'primary'} size="lg">
          {saved ? '✓ Settings saved' : 'Save settings'}
        </Button>
      </div>
    </AdminLayout>
  );
}
