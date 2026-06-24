import { useState } from 'react';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Button } from '../components/index.jsx';
import { sendEmail, generateEmailTemplate } from '../services/api.js';

// ── Tone templates (legacy, kept for quick mode fallback) ─────────────────────────
const TONES = ['Friendly', 'Formal', 'Celebratory', 'Concise'];

const EMAIL_PREVIEWS = {
  Friendly: {
    subject: 'Your {{training_name}} Certificate is Ready!',
    body: `Hi {{first_name}},\n\nCongratulations on successfully completing the {{training_name}} training program!\n\nYour certificate has been attached to this email in PDF format.\n\nBest Regards,\n{{organisation}}`,
  },
  Formal: {
    subject: 'Certificate of Completion — {{training_name}}',
    body: `Dear {{first_name}},\n\nWe are pleased to inform you that your Certificate of Completion for the {{training_name}} training program is now available.\n\nPlease find your certificate attached to this email in PDF format.\n\nRegards,\n{{organisation}}`,
  },
  Celebratory: {
    subject: 'You did it, {{first_name}}! Your {{training_name}} cert is ready! 🎉',
    body: `Hey {{first_name}}!\n\nYOU CRUSHED IT at {{training_name}}! Your certificate is attached to this email.\n\nShow the world what you've accomplished!\n\n— {{organisation}}`,
  },
  Concise: {
    subject: 'Your {{training_name}} Certificate',
    body: `Hi {{first_name}},\n\nYour {{training_name}} certificate is attached to this email.\n\nBest,\n{{organisation}}`,
  },
};

// ── Status dot ─────────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const colors = {
    SENT:   'bg-emerald-400',
    FAILED: 'bg-red-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-500'} flex-shrink-0`} />;
}

export default function EmailGenerator() {
  const [tone, setTone]                 = useState('Formal');
  const [batchId, setBatchId]           = useState('');
  const [sending, setSending]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [showLogs, setShowLogs]         = useState(false);

  // LLM template generation state
  const [templateMode, setTemplateMode] = useState('tone'); // 'tone', 'quick', 'detailed'
  const [llmLoading, setLlmLoading]     = useState(false);
  const [llmResult, setLlmResult]       = useState(null);
  const [batchData, setBatchData]       = useState(null);
  const [showTemplateGen, setShowTemplateGen] = useState(false);
  const [requestVariations, setRequestVariations] = useState(false);
  const [feedback, setFeedback]         = useState('');
  const [showVariations, setShowVariations] = useState(false);

  const preview = llmResult || EMAIL_PREVIEWS[tone];

  const handleGenerateTemplate = async () => {
    if (!batchData?.trainingName) {
      setError('Batch data incomplete. Please ensure batch is properly loaded.');
      return;
    }

    setLlmLoading(true);
    setError(null);
    setShowVariations(false);

    try {
      const response = await generateEmailTemplate({
        trainingName: batchData.trainingName,
        organisation: batchData.organization,
        trainingStartDate: batchData.trainingStartDate,
        trainingEndDate: batchData.trainingEndDate,
        mode: templateMode === 'tone' ? 'quick' : templateMode,
        feedback: feedback || undefined,
        requestVariations: templateMode === 'detailed',
      });

      if (response.success) {
        setLlmResult(response.data);
        setShowTemplateGen(false);
        if (response.data.alternatives && response.data.alternatives.length > 0) {
          setShowVariations(true);
        }
      } else {
        setError(response.message || 'Template generation failed');
      }
    } catch (err) {
      setError(err.message || 'Template generation failed. Check console for details.');
      console.error('Template generation error:', err);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSelectEmailVariation = (variant) => {
    setEmailSubject(variant.subject);
    setEmailBody(variant.body);
    setShowVariations(false);
  };

  const handleSend = async () => {
    if (!batchId.trim()) {
      setError('Please enter a Batch ID before sending.');
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const emailPayload = llmResult
        ? { subject: llmResult.subject, body: llmResult.body }
        : {};

      const data = await sendEmail(batchId.trim(), emailPayload);
      setResult(data);
      setShowLogs(true);
    } catch (err) {
      setError(err.message || 'Email dispatch failed. Check backend logs.');
    } finally {
      setSending(false);
    }
  };

  return (
    <MainLayout>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Certificate Email Dispatch</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Generate AI-powered email templates & send certificates to all valid employees
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* ── Left: Send panel ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Batch ID input */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Batch Configuration</h3>

            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
              Batch ID
            </label>
            <input
              type="text"
              value={batchId}
              onChange={e => { setBatchId(e.target.value); setError(null); }}
              placeholder="e.g. MCB-2026-001"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-4"
            />

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-indigo-300 font-medium mb-1">✦ Auto-fetch mode active</p>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Recipient emails are fetched directly from MongoDB — only employees with
                <span className="text-emerald-400 font-medium"> validationStatus = VALID</span> will
                receive certificates. No manual email entry required.
              </p>
            </div>

            {/* Template mode selector */}
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
              Template Mode
            </label>
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setTemplateMode('tone'); setLlmResult(null); }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  templateMode === 'tone'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                }`}
              >
                Presets
              </button>
              <button
                onClick={() => { setTemplateMode('quick'); setShowTemplateGen(true); }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  templateMode === 'quick'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                }`}
              >
                Quick AI
              </button>
              <button
                onClick={() => { setTemplateMode('detailed'); setShowTemplateGen(true); }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  templateMode === 'detailed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                }`}
              >
                Advanced AI
              </button>
            </div>

            {templateMode === 'tone' && (
              <>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Email Tone
                </label>
                <div className="flex flex-wrap gap-2 mb-5">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400 mb-4">
                ⚠ {error}
              </div>
            )}

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending || !batchId.trim()}
              className="w-full justify-center"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Dispatching emails…
                </span>
              ) : (
                '→ Send Certificates to All Valid Employees'
              )}
            </Button>
          </Card>

          {/* ── Result summary ──────────────────────────────────────────── */}
          {result && (
            <Card className="p-5 slide-in">
              <h3 className="text-sm font-semibold text-white mb-3">Dispatch Summary</h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Recipients',  value: result.totalValid, color: 'text-white' },
                  { label: 'Sent',        value: result.sent,       color: 'text-emerald-400' },
                  { label: 'Failed',      value: result.failed,     color: result.failed > 0 ? 'text-red-400' : 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="bg-surface-muted rounded-lg p-3 text-center">
                    <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Delivery rate</span>
                  <span>{result.totalValid > 0 ? Math.round((result.sent / result.totalValid) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${result.totalValid > 0 ? (result.sent / result.totalValid) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400">{result.message}</p>

              <button
                onClick={() => setShowLogs(v => !v)}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                {showLogs ? 'Hide' : 'Show'} delivery log
              </button>
            </Card>
          )}
        </div>

        {/* ── Right: Email preview ───────────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="ai-badge">+ AI</span>
              <span className="text-sm font-semibold text-white">Email Preview</span>
            </div>

            <div className="mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Subject Line</p>
              <div className="bg-surface-muted border border-surface-border rounded-lg px-3 py-2.5 text-sm text-slate-200">
                {preview.subject}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Email Body</p>
              <div className="bg-surface-muted border border-surface-border rounded-lg px-3 py-3 text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {preview.body}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-medium mb-1">📎 PDF Attachment</p>
              <p className="text-xs text-amber-200 font-mono">{'{{EmployeeName}}_{{TrainingName}}.pdf'}</p>
              <p className="text-xs text-amber-300 mt-1">
                Each employee receives their own personalised certificate.
              </p>
            </div>
          </Card>

          {/* ── Delivery log ─────────────────────────────────────────────── */}
          {result && showLogs && result.logs && result.logs.length > 0 && (
            <Card className="p-5 slide-in">
              <h3 className="text-sm font-semibold text-white mb-3">Delivery Log</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {result.logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-surface-muted rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusDot status={log.status} />
                      <span className="text-white font-medium truncate">{log.employeeName}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-slate-500 font-mono truncate max-w-[140px]">{log.email}</span>
                      <span className={`font-semibold ${log.status === 'SENT' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
