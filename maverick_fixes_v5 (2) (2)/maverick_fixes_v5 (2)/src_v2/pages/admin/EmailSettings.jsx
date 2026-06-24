import { useState } from 'react';
import { AdminLayout } from '../../layouts/index.jsx';
import { Card, Button } from '../../components/index.jsx';

export default function EmailSettings() {
  const [form, setForm] = useState({
    provider: 'SendGrid',
    apiKey: 'SG.••••••••••••••••••••••',
    fromName: 'Mavericks Inc.',
    fromEmail: 'noreply@mavericks.io',
    replyTo: 'support@mavericks.io',
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: '587',
    smtpUser: 'apikey',
    smtpPass: '••••••••••••',
  });
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState(null);

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = () => {
    setTested('testing');
    setTimeout(() => setTested('success'), 1500);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white font-display">Email Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure email service provider and sender details</p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Provider */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Email Service Provider</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Provider</label>
              <select className="input-field" value={form.provider} onChange={update('provider')}>
                <option>SendGrid</option>
                <option>AWS SES</option>
                <option>Mailgun</option>
                <option>SMTP</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">API Key</label>
              <input className="input-field" type="password" value={form.apiKey} onChange={update('apiKey')} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">SMTP Host</label>
              <input className="input-field" value={form.smtpHost} onChange={update('smtpHost')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Port</label>
                <input className="input-field" value={form.smtpPort} onChange={update('smtpPort')} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
                <input className="input-field" value={form.smtpUser} onChange={update('smtpUser')} />
              </div>
            </div>
          </div>
        </Card>

        {/* Sender details */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Sender Details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">From Name</label>
              <input className="input-field" value={form.fromName} onChange={update('fromName')} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">From Email</label>
              <input className="input-field" type="email" value={form.fromEmail} onChange={update('fromEmail')} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Reply-To Email</label>
              <input className="input-field" type="email" value={form.replyTo} onChange={update('replyTo')} />
            </div>

            {/* Connection test */}
            <div className="pt-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Connection Test</label>
              <Button variant="secondary" onClick={handleTest} disabled={tested === 'testing'} className="w-full justify-center">
                {tested === 'testing' ? 'Testing...' : 'Send Test Email'}
              </Button>
              {tested === 'success' && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                  <span>✓</span> Test email sent successfully
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant={saved ? 'success' : 'primary'} size="lg">
          {saved ? '✓ Settings saved' : 'Save Email Settings'}
        </Button>
      </div>
    </AdminLayout>
  );
}
