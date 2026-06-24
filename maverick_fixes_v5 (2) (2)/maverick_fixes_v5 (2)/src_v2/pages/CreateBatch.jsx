import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/index.jsx';
import { LinkedInShareModal } from '../components/LinkedInShareModal.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
import { Card, Button, Input, Stepper } from '../components/index.jsx';

const STEPS = ['Batch Info', 'Upload Data', 'Template Design', 'Generate Certificates', 'Send Email'];

const CERT_STYLES = {
  modern: {
    label: 'Modern',
    bg: '#0f0c29',
    bgGradient: 'linear-gradient(135deg, #1a1040 0%, #0f1117 50%, #1a0a2e 100%)',
    accentColor: '#a78bfa',
    stripeGradient: 'linear-gradient(90deg, #6366f1, #a855f7)',
    borderColor: 'rgba(139,92,246,0.4)',
    textColor: '#e2e8f0',
    cornerStyle: 'rounded',
    decoration: 'corners',
  },
  minimal: {
    label: 'Minimal',
    bg: '#1e1e1e',
    bgGradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
    accentColor: '#94a3b8',
    stripeGradient: '#475569',
    borderColor: 'rgba(148,163,184,0.25)',
    textColor: '#f1f5f9',
    cornerStyle: 'none',
    decoration: 'lines',
  },
  corporate: {
    label: 'Corporate',
    bg: '#0a1628',
    bgGradient: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 60%, #0a1628 100%)',
    accentColor: '#60a5fa',
    stripeGradient: 'linear-gradient(90deg, #2563eb, #06b6d4)',
    borderColor: 'rgba(96,165,250,0.35)',
    textColor: '#e2e8f0',
    cornerStyle: 'square',
    decoration: 'double-border',
  },
  gold: {
    label: 'Gold',
    bg: '#1a1200',
    bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)',
    accentColor: '#fbbf24',
    stripeGradient: 'linear-gradient(90deg, #d97706, #fbbf24, #d97706)',
    borderColor: 'rgba(251,191,36,0.45)',
    textColor: '#fef3c7',
    cornerStyle: 'ornate',
    decoration: 'ornate',
  },
  emerald: {
    label: 'Emerald',
    bg: '#021a0e',
    bgGradient: 'linear-gradient(135deg, #021a0e 0%, #052e16 50%, #021a0e 100%)',
    accentColor: '#34d399',
    stripeGradient: 'linear-gradient(90deg, #059669, #34d399)',
    borderColor: 'rgba(52,211,153,0.35)',
    textColor: '#d1fae5',
    cornerStyle: 'rounded',
    decoration: 'corners',
  },
  rose: {
    label: 'Rose',
    bg: '#1a0510',
    bgGradient: 'linear-gradient(135deg, #1a0510 0%, #2d0a1e 50%, #1a0510 100%)',
    accentColor: '#fb7185',
    stripeGradient: 'linear-gradient(90deg, #e11d48, #fb7185)',
    borderColor: 'rgba(251,113,133,0.35)',
    textColor: '#ffe4e6',
    cornerStyle: 'rounded',
    decoration: 'corners',
  },
};

function parsePromptToStyle(desc) {
  const d = desc.toLowerCase();
  const result = {};
  if (d.includes('gold') || d.includes('luxury') || d.includes('premium') || d.includes('elegant')) result.style = 'gold';
  else if (d.includes('green') || d.includes('emerald') || d.includes('nature') || d.includes('teal')) result.style = 'emerald';
  else if (d.includes('rose') || d.includes('pink') || d.includes('red') || d.includes('warm')) result.style = 'rose';
  else if (d.includes('blue') || d.includes('corporate') || d.includes('professional') || d.includes('formal')) result.style = 'corporate';
  else if (d.includes('minimal') || d.includes('clean') || d.includes('simple') || d.includes('light')) result.style = 'minimal';
  else if (d.includes('modern') || d.includes('dark') || d.includes('tech') || d.includes('purple') || d.includes('indigo')) result.style = 'modern';
  if (d.includes('achievement') || d.includes('excellence')) result.title = 'Certificate of Excellence';
  else if (d.includes('participation')) result.title = 'Certificate of Participation';
  else if (d.includes('appreciation')) result.title = 'Certificate of Appreciation';
  else if (d.includes('merit')) result.title = 'Certificate of Merit';
  else if (d.includes('honor') || d.includes('honour')) result.title = 'Certificate of Honor';
  return result;
}

function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

function CertCanvas({ styleId, title, orgName, eventName, eventDate, signatories = [], dim = false, candidateName = '{{candidate_name}}', aiStyle = null }) {
  // FIX 1: if a full AI style config was returned (bgGradient etc.), use it directly; else fall back to preset
  const baseStyle = CERT_STYLES[styleId] || CERT_STYLES.modern;
  const s = aiStyle ? { ...baseStyle, ...aiStyle } : baseStyle;
  const sigLeft   = signatories.filter(sg => sg.position === 'left');
  const sigRight  = signatories.filter(sg => sg.position === 'right');
  const sigCenter = signatories.filter(sg => sg.position === 'center');

  const SigBlock = ({ sg }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {sg.imageUrl
        ? <img src={sg.imageUrl} alt="sig" style={{ height: 22, maxWidth: 60, objectFit: 'contain', opacity: 0.85 }} />
        : <div style={{ width: 52, borderBottom: `1.5px solid ${s.accentColor}`, opacity: 0.5, marginBottom: 2 }} />
      }
      <p style={{ fontSize: 8, color: s.accentColor, fontWeight: 600, margin: 0 }}>{sg.name || 'Signatory'}</p>
    </div>
  );

  return (
    <div style={{
      position: 'relative', background: s.bgGradient,
      border: `1.5px solid ${s.borderColor}`, borderRadius: 12,
      minHeight: 240, overflow: 'hidden', opacity: dim ? 0.38 : 1,
      transition: 'all 0.4s ease',
    }}>
      {/* Top stripe */}
      <div style={{ height: 4, background: s.stripeGradient }} />

      {/* Style-specific decorations */}
      {s.decoration === 'corners' && [
        { t: 8, l: 8, bt: true, bl: true }, { t: 8, r: 8, bt: true, br: true },
        { b: 8, l: 8, bb: true, bl: true }, { b: 8, r: 8, bb: true, br: true },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', width: 18, height: 18,
          top: c.t, bottom: c.b, left: c.l, right: c.r,
          borderTop:    c.bt ? `2px solid ${s.accentColor}` : undefined,
          borderBottom: c.bb ? `2px solid ${s.accentColor}` : undefined,
          borderLeft:   c.bl ? `2px solid ${s.accentColor}` : undefined,
          borderRight:  c.br ? `2px solid ${s.accentColor}` : undefined,
          opacity: 0.55, borderRadius: 3,
        }} />
      ))}

      {s.decoration === 'ornate' && (
        <>
          {[
            { t: 8, l: 8, bt: true, bl: true }, { t: 8, r: 8, bt: true, br: true },
            { b: 8, l: 8, bb: true, bl: true }, { b: 8, r: 8, bb: true, br: true },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', width: 20, height: 20,
              top: c.t, bottom: c.b, left: c.l, right: c.r,
              borderTop:    c.bt ? `2px solid ${s.accentColor}` : undefined,
              borderBottom: c.bb ? `2px solid ${s.accentColor}` : undefined,
              borderLeft:   c.bl ? `2px solid ${s.accentColor}` : undefined,
              borderRight:  c.br ? `2px solid ${s.accentColor}` : undefined,
              opacity: 0.85,
            }} />
          ))}
          {[{t:8,l:28},{t:8,r:28},{b:8,l:28},{b:8,r:28},{t:28,l:8},{t:28,r:8},{b:28,l:8},{b:28,r:8}].map((c,i) => (
            <div key={i} style={{
              position:'absolute', width:5, height:5, borderRadius:'50%',
              background: s.accentColor, opacity:0.7,
              top:c.t, bottom:c.b, left:c.l, right:c.r,
            }} />
          ))}
        </>
      )}

      {s.decoration === 'double-border' && (
        <div style={{ position:'absolute', inset:6, border:`1px solid ${s.borderColor}`, borderRadius:8, pointerEvents:'none' }} />
      )}

      {s.decoration === 'lines' && (
        <>
          <div style={{ position:'absolute', top:20, left:20, right:20, height:1, background:s.borderColor }} />
          <div style={{ position:'absolute', bottom:20, left:20, right:20, height:1, background:s.borderColor }} />
        </>
      )}

      {/* Content */}
      <div style={{ padding: '14px 24px 12px', textAlign: 'center' }}>
        <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:s.accentColor, margin:'0 0 5px' }}>
          {orgName || 'ORGANISATION'}
        </p>
        {s.decoration !== 'lines' && (
          <div style={{ width:36, height:1, background:s.stripeGradient, margin:'0 auto 7px' }} />
        )}
        <p style={{ fontSize:13, fontWeight:800, color:'#ffffff', margin:'0 0 3px', letterSpacing: s.decoration==='ornate'?'0.04em':0 }}>
          {title}
        </p>
        <p style={{ fontSize:9, color:s.accentColor, opacity:0.7, margin:'0 0 5px' }}>This is to certify that</p>
        <p style={{ fontSize:15, fontWeight:700, color:s.accentColor, margin:'0 0 5px', fontStyle:s.decoration==='ornate'?'italic':'normal' }}>
          {candidateName}
        </p>
        <p style={{ fontSize:9, color:s.accentColor, opacity:0.65, margin:'0 0 2px' }}>has successfully completed</p>
        <p style={{ fontSize:11, fontWeight:600, color:'#ffffff', margin:'0 0 2px' }}>
          {eventName || '{{event_name}}'}
        </p>
        <p style={{ fontSize:9, color:s.accentColor, opacity:0.55, margin:'0 0 10px' }}>
          {eventDate || '{{date}}'}
        </p>

        {/* Signatories */}
        {signatories.length > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:4 }}>
            <div style={{ display:'flex', gap:12 }}>{sigLeft.map((sg,i)=><SigBlock key={i} sg={sg}/>)}</div>
            <div>{sigCenter.map((sg,i)=><SigBlock key={i} sg={sg}/>)}</div>
            <div style={{ display:'flex', gap:12 }}>{sigRight.map((sg,i)=><SigBlock key={i} sg={sg}/>)}</div>
          </div>
        )}
      </div>

      {/* Bottom stripe */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4, background:s.stripeGradient }} />
    </div>
  );
}

export default function CreateBatch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  /* Step 1 */
  const [form, setForm] = useState({ eventName: '', trainingStartDate: '', trainingEndDate: '', organization: 'Hexaware Technologies', batchId: '' });
  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Fetch a server-generated batchId (auto-incremented) on mount
  useEffect(() => {
    const fetchBatchId = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/upload/batch/new`);
        const json = await res.json();
        if (res.ok && json && json.data && json.data.batchId) {
          setForm(f => ({ ...f, batchId: json.data.batchId }));
        } else if (json && json.data && json.data.batchId) {
          setForm(f => ({ ...f, batchId: json.data.batchId }));
        }
      } catch (err) {
        console.warn('Failed to fetch new batchId, falling back to client id', err);
        setForm(f => ({ ...f, batchId: `MCB-${Date.now().toString().slice(-8)}` }));
      }
    };
    fetchBatchId();
  }, []);

  /* Step 2 */
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [validEmployees, setValidEmployees] = useState([]);
  const [invalidEmployees, setInvalidEmployees] = useState([]);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setUploadError('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setUploadError('');
    setUploading(true);
    setUploadSuccess(false);
    setParsedRows([]);
    setParsedHeaders([]);
    setValidEmployees([]);
    setInvalidEmployees([]);
    setValidationResult(null);

    try {
      // Read file as base64
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call backend validation API — pass the already-generated batchId from Step 1
      const response = await fetch('http://localhost:5000/api/upload/validate', {
        signal: AbortSignal.timeout(15000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          batchId: form.batchId,
          batchInfo: {
            trainingName: form.eventName,
            trainingStartDate: form.trainingStartDate,
            trainingEndDate: form.trainingEndDate,
            organization: form.organization,
          },
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Server returned an unreadable response (status ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(result.message || result.details || `Request failed with status ${response.status}`);
      }

      if (result.error) {
        throw new Error(result.message || 'Validation failed');
      }

      console.log('✓ Validation result:', result.data);

      // Store validation results
      setValidationResult(result.data);
      setValidEmployees(result.data.validData || []);
      setInvalidEmployees(result.data.invalidData || []);
      setUploadedFile(file);
      setUploadSuccess(true);
    } catch (error) {
      const msg = error.name === 'AbortError'
        ? 'Request timed out — backend took too long to respond'
        : error.name === 'TypeError' && error.message === 'Failed to fetch'
        ? 'Cannot reach the server — make sure the backend is running on port 5000'
        : error.message || 'Failed to validate file';
      console.error('Validation error:', msg);
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setUploadSuccess(false);
    setUploadError('');
    setParsedRows([]);
    setParsedHeaders([]);
    setValidEmployees([]);
    setInvalidEmployees([]);
    setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* Step 3 */
  const [styleDesc, setStyleDesc] = useState('');
  const [templateMode, setTemplateMode] = useState('quick');
  const [selectedStyle, setSelectedStyle] = useState('modern');

  // Template preview editable fields
  const [tmplFields, setTmplFields] = useState({ title: 'Certificate of Completion' });
  const updateTmplField = (key) => (e) => setTmplFields(f => ({ ...f, [key]: e.target.value }));

  // Signatories
  const [signatories, setSignatories] = useState([{ id: 1, name: '', imageUrl: '', position: 'left' }]);
  const sigImgRefs = useRef({});

  const addSignatory = () => {
    if (signatories.length >= 2) return;
    setSignatories(s => [...s, { id: Date.now(), name: '', imageUrl: '', position: 'right' }]);
  };
  const removeSignatory = (id) => setSignatories(s => s.filter(x => x.id !== id));
  const updateSignatory = (id, field, value) =>
    setSignatories(s => s.map(x => x.id === id ? { ...x, [field]: value } : x));
  const handleSigImage = (id, file) => {
    if (!file) return;
    // blob URL for instant CertCanvas preview
    const blobUrl = URL.createObjectURL(file);
    updateSignatory(id, 'imageUrl', blobUrl);
    // base64 survives JSON serialisation so the PDF backend can embed the image
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSignatories(s =>
        s.map(x => x.id === id ? { ...x, imageBase64: ev.target.result } : x)
      );
    };
    reader.readAsDataURL(file);
  };

  // Edit-mode and generate-template state
  const [tmplGenerating, setTmplGenerating] = useState(false);
  const [tmplGenerated, setTmplGenerated]   = useState(false);
  // Stores full AI-generated style config (bgGradient, accentColor, etc.) for CertCanvas + PDF
  const [aiStyleConfig, setAiStyleConfig] = useState(null);

  const handleGenerateTemplate = async () => {
    setTmplGenerating(true);
    setTmplGenerated(false);
    try {
      const response = await fetch(`${BACKEND_URL}/api/certificates/generate-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: styleDesc,
          trainingName: form.eventName,
          organisation: form.organization,
          mode: templateMode === 'ai' ? 'detailed' : 'quick', // FIX 1: pass correct mode
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Generation failed');

      const d = result.data;
      // FIX 1: handle both quick (style key) and AI full-config (bgGradient etc.) responses
      if (d.bgGradient) {
        // Full AI style — apply directly to preview and store for PDF generation
        setAiStyleConfig(d);
        if (d.title) setTmplFields(f => ({ ...f, title: d.title }));
        if (d.style) setSelectedStyle(d.style);
      } else if (d.style) {
        // Quick mode — just a style name
        setSelectedStyle(d.style);
        setAiStyleConfig(null);
        if (d.title) setTmplFields(f => ({ ...f, title: d.title }));
      }
    } catch {
      // Client-side fallback when backend unreachable or Groq unavailable
      if (styleDesc.trim()) {
        const parsed = parsePromptToStyle(styleDesc);
        if (parsed.style) setSelectedStyle(parsed.style);
        if (parsed.title) setTmplFields(f => ({ ...f, title: parsed.title }));
        setAiStyleConfig(null);
      }
    } finally {
      setTmplGenerating(false);
      setTmplGenerated(true);
    }
  };

  // ── Custom .docx template upload (Fix 2) ─────────────────────────────────
  const [uploadedTmplDocx, setUploadedTmplDocx] = useState(null); // { filename, size, file }
  const [docxHtml, setDocxHtml]   = useState(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const docxEditorRef = useRef(null);

  const syncDocxEdits = () => {
    if (docxEditorRef.current) setDocxHtml(docxEditorRef.current.innerHTML);
  };

  const loadMammoth = () => new Promise((resolve, reject) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    s.onload = () => resolve(window.mammoth);
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const handleTmplDocxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isDocx = file.name.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) { alert('Please upload a .docx file.'); e.target.value = ''; return; }
    setUploadedTmplDocx({ filename: file.name, size: (file.size / 1024).toFixed(1) + ' KB', file });
    setDocxHtml(null);
    setDocxLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const mammoth = await loadMammoth();
      const res = await mammoth.convertToHtml({ arrayBuffer: buf });
      setDocxHtml(res.value || '<p style="color:#94a3b8;font-size:13px">Empty document.</p>');
    } catch {
      setDocxHtml('<p style="color:#f87171;font-size:13px">Could not render — file will still be used as uploaded.</p>');
    } finally {
      setDocxLoading(false);
    }
  };

  const clearTmplDocx = () => { setUploadedTmplDocx(null); setDocxHtml(null); setDocxLoading(false); };

  /* Step 4 */
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genDone, setGenDone] = useState(false);
  const genCount = validEmployees.length; // Use only valid employees
  const [filenamePattern, setFilenamePattern] = useState('CandidateName_EventName.pdf');

  // Detect which column index holds the candidate name
  const nameColIdx = validEmployees.length > 0 ? Object.keys(validEmployees[0]).findIndex(k => /name/i.test(k)) : -1;

  const handleGenerate = async () => {
    if (genDone) return;
    setGenerating(true);
    setGenProgress(0);

    try {
      // Build the style config from current template state to send to backend
      // FIX 1: prefer AI-generated full style config if present
      const currentStyle = aiStyleConfig || CERT_STYLES[selectedStyle] || CERT_STYLES.modern;
      const styleConfig = {
        ...currentStyle,
        certTitle: tmplFields.title || 'Certificate of Completion',
        signatories: signatories
          .map(sg => ({ name: sg.name || 'Signatory', position: sg.position, imageBase64: sg.imageBase64 || '' })),
      };

      const response = await fetch(`${BACKEND_URL}/api/certificates/generate/${form.batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleConfig }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.detail || 'Certificate generation failed');
      }

      const data = result.data;
      setGenProgress(data.generated || genCount);
      setGenerating(false);
      setGenDone(true);

      if (data.failed > 0) {
        console.warn(`⚠️ ${data.failed} certificate(s) failed to generate`);
      }
    } catch (err) {
      console.error('Certificate generation error:', err.message);
      setGenerating(false);
      // Still mark done so user can see the error and proceed
      setGenDone(true);
    }
  };

  /* Step 5 */
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPrompt, setEmailPrompt] = useState('');
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(false);
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [emailGenerated, setEmailGenerated] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [sendLog, setSendLog] = useState([]);
  const [sendProgress, setSendProgress] = useState(0);
  const [linkedinContent, setLinkedinContent] = useState('');
  const [linkedinShareUrl, setLinkedinShareUrl] = useState('');
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [emailTemplateMode, setEmailTemplateMode] = useState('quick'); // 'quick' or 'detailed'
  const [emailVariations, setEmailVariations] = useState([]);
  const [showEmailVariations, setShowEmailVariations] = useState(false);

  const handleGenerateLinkedIn = async () => {
    try {
      const postText = linkedinContent || `🎓 Excited to share that I have successfully completed the ${form.eventName} training program at ${form.organization}!\n\n#Hexavarsity #RiseAndShine #AchievementUnlocked #ProudToBeAMaverick`;
      setLinkedinContent(postText);
    } catch (err) {
      console.warn('Failed to generate LinkedIn content', err);
      alert('LinkedIn content generation failed. Please try again.');
    }
  };

  const handleGenerateEmail = async () => {
    setEmailGenerating(true);
    setEmailGenerated(false);
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/generate-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingName: form.eventName,
          organisation: form.organization,
          trainingStartDate: form.trainingStartDate,
          trainingEndDate: form.trainingEndDate,
          mode: emailTemplateMode,
          requestVariations: emailTemplateMode === 'detailed',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Generation failed');

      setEmailSubject(result.data.subject);
      setEmailBody(result.data.body);

      // Show variations if available
      if (result.data.alternatives && result.data.alternatives.length > 0) {
        setEmailVariations(result.data.alternatives);
        setShowEmailVariations(true);
      }

      setEmailGenerated(true);
    } catch (err) {
      console.warn('Email template generation failed:', err);
      // Fallback to default templates
      setEmailSubject(`Your ${form.eventName} certificate is here!`);
      setEmailBody(`Hi {{first_name}},\n\nCongratulations on completing ${form.eventName}!\n\nYour certificate is attached. Share it on LinkedIn to showcase your achievement.\n\nBest regards,\n${form.organization}`);
      setEmailGenerated(true);
    } finally {
      setEmailGenerating(false);
    }
  };

  const handleSelectEmailVariation = (variant) => {
    setEmailSubject(variant.subject);
    setEmailBody(variant.body);
    setShowEmailVariations(false);
  };

  const handleUseDefault = (checked) => {
    setUseDefaultTemplate(checked);
    if (checked) {
      setEmailSubject(`Your ${form.eventName} certificate is ready`);
      setEmailBody(`Dear {{first_name}},\n\nYour certificate of completion for ${form.eventName} is now available.\n\nKindly share on LinkedIn.\n\nRegards,\n${form.organization}`);
      setEmailGenerated(true);
    } else {
      setEmailSubject(''); setEmailBody(''); setEmailGenerated(false);
    }
  };

  const handleBulkSend = async () => {
    if (!form.batchId) return;
    setBulkSending(true);
    setBulkSuccess(false);
    setSendLog([]);
    setSendProgress(0);

    try {
      const response = await fetch(`${BACKEND_URL}/api/email/send/${form.batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.detail || 'Email dispatch failed');
      }

      const data = result.data;

      // Populate live log from backend response
      const logs = (data.logs || []).map(l => ({
        name:   l.employeeName,
        email:  l.email,
        status: l.status === 'SENT' ? 'Delivered' : 'Failed',
        reason: l.failureReason || null,
      }));

      setSendLog(logs);
      setSendProgress(data.totalValid || logs.length);
      setBulkSuccess(true);
    } catch (err) {
      console.error('❌ Bulk send error:', err.message);
      setSendLog([{ name: 'Dispatch Error', email: '—', status: 'Failed', reason: err.message }]);
      setSendProgress(genCount);
      setBulkSuccess(true); // still mark complete so UI unlocks
    } finally {
      setBulkSending(false);
    }
  };

  const step1Valid = form.eventName.trim() !== '' && form.trainingStartDate !== '' && form.trainingEndDate !== '' && form.organization.trim() !== '' && (!form.trainingStartDate || !form.trainingEndDate || new Date(form.trainingEndDate) >= new Date(form.trainingStartDate));
  // Block Next if ANY invalid records exist — all rows must be clean before proceeding
  const step2Valid = uploadSuccess &&
    validationResult !== null &&
    validationResult.summary.invalidEmployees === 0 &&
    validationResult.summary.validEmployees > 0;

  return (
    <MainLayout>
      <div className="flex items-start mb-6">
        <div>
          <button onClick={() => navigate('/batches')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-2 transition-colors">← Back to Batches</button>
          <h1 className="text-xl font-bold text-white font-display">Create New Certification Batch</h1>
          <p className="text-sm text-slate-400 mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
        </div>
      </div>

      <Card className="p-6">
        <Stepper steps={STEPS} current={step} />

        {/* ── STEP 1: Batch Info ── */}
        {step === 1 && (
          <div className="slide-in space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Event / Training Name" placeholder="e.g. AI Workshop 2026" value={form.eventName} onChange={update('eventName')} required />
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Batch ID</label>
                <input className="input-field opacity-60 cursor-not-allowed" value={form.batchId} readOnly tabIndex={-1} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Training Start Date<span className="text-red-400 ml-1">*</span></label>
                <input type="date" value={form.trainingStartDate} onChange={update('trainingStartDate')} className="input-field text-indigo-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Training End Date<span className="text-red-400 ml-1">*</span></label>
                <input type="date" value={form.trainingEndDate} onChange={update('trainingEndDate')} className="input-field text-indigo-400" />
                {form.trainingStartDate && form.trainingEndDate && new Date(form.trainingEndDate) < new Date(form.trainingStartDate) && (
                  <p className="text-xs text-red-400 mt-1">End date must be after start date</p>
                )}
              </div>
            </div>
            <div className="w-full">
              <Input label="Organization" placeholder="e.g. Mavericks Inc." value={form.organization} onChange={update('organization')} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>Next: Upload Data →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Upload Data ── */}
        {step === 2 && (
          <div className="slide-in space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Upload Candidate Data</h3>
              <p className="text-xs text-slate-500 mb-4">Accepted: .xlsx, .xls, .csv — Required columns: Employee ID, Name, Email, Training Name, Start Date, End Date</p>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${uploading ? 'border-indigo-500/60 bg-indigo-500/5' : uploadSuccess ? 'border-emerald-500/50 bg-emerald-500/5' : uploadError ? 'border-red-500/40 bg-red-500/5' : 'border-surface-border hover:border-indigo-500/50 hover:bg-surface-muted/30'}`}
                onDrop={e => { e.preventDefault(); processFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => processFile(e.target.files[0])} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-indigo-400 font-medium">Validating...</p>
                  </div>
                ) : uploadSuccess && uploadedFile && validationResult ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-lg">✓</div>
                    <p className="text-sm font-semibold text-emerald-400">{uploadedFile.name}</p>
                    <p className="text-xs text-emerald-300/70">{validationResult.summary.validEmployees} valid records</p>
                    {validationResult.summary.invalidEmployees > 0 && (
                      <p className="text-xs text-amber-400">{validationResult.summary.invalidEmployees} records need review</p>
                    )}
                    <button onClick={e => { e.stopPropagation(); clearFile(); }} className="mt-1 text-xs text-slate-500 hover:text-red-400 transition-colors underline">Remove file</button>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl text-slate-500 mb-3">↑</div>
                    <p className="text-sm text-slate-400 mb-1">Drag & drop your file here, or <span className="text-indigo-400">click to browse</span></p>
                    <p className="text-xs text-slate-600">Supported: .xlsx · .xls · .csv</p>
                  </div>
                )}
              </div>
              {uploadError && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2"><span>⚠</span> {uploadError}</div>}
            </div>

            {/* Validation Summary */}
            {uploadSuccess && validationResult && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-muted border border-surface-border rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-white">{validationResult.summary.totalRows}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Valid</p>
                    <p className="text-2xl font-bold text-emerald-400">{validationResult.summary.validEmployees}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Invalid</p>
                    <p className="text-2xl font-bold text-red-400">{validationResult.summary.invalidEmployees}</p>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-surface-muted border border-surface-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Success Rate</span>
                    <span className={`text-sm font-bold ${validationResult.summary.successRate >= 80 ? 'text-emerald-400' : validationResult.summary.successRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {validationResult.summary.successRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${validationResult.summary.successRate >= 80 ? 'bg-emerald-500' : validationResult.summary.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${validationResult.summary.successRate}%` }}
                    />
                  </div>
                </div>

                {/* Invalid Records Table */}
                {validationResult.summary.invalidEmployees > 0 && (
                  <div className="border border-red-500/20 rounded-lg overflow-hidden">
                    <div className="bg-red-500/10 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-400">⚠ {validationResult.summary.invalidEmployees} Record(s) Need Review</span>
                      <span className="text-xs text-red-300/60">Errors &amp; Warnings</span>
                    </div>
                    <div className="overflow-x-auto bg-surface-muted">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-border">
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">Training</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium uppercase tracking-wider">Errors / Warnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.invalidData.slice(0, 10).map((invalid, i) => (
                            <tr key={i} className="border-b border-surface-border hover:bg-surface-border/40 transition-colors last:border-0">
                              <td className="px-4 py-2.5 text-slate-300 font-mono">{invalid.employee.employeeId || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-300 max-w-[150px] truncate">{invalid.employee.name || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-300 max-w-[120px] truncate">{invalid.employee.trainingName || '—'}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {invalid.errors && invalid.errors.map((error, idx) => (
                                    <span key={`e-${idx}`} className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 text-[10px] px-2 py-1 rounded border border-red-500/30 max-w-xs">
                                      ✕ {error}
                                    </span>
                                  ))}
                                  {invalid.warnings && invalid.warnings.map((warn, idx) => (
                                    <span key={`w-${idx}`} className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] px-2 py-1 rounded border border-amber-500/30 max-w-xs">
                                      ⚠ Warning: {warn}
                                    </span>
                                  ))}
                                  {(!invalid.errors || invalid.errors.length === 0) && (!invalid.warnings || invalid.warnings.length === 0) && (
                                    <span className="text-slate-500 text-[10px] italic">No details available</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {validationResult.invalidData.length > 10 && (
                      <div className="bg-surface-muted px-4 py-2 text-center text-xs text-slate-500 border-t border-surface-border">
                        Showing 10 of {validationResult.invalidData.length} invalid records
                      </div>
                    )}
                  </div>
                )}

                {/* Valid Records Summary — only shown when the entire file is clean */}
                {validationResult.summary.invalidEmployees === 0 && validationResult.summary.validEmployees > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 uppercase mb-1">✓ All Records Valid — Ready to Proceed</p>
                        <p className="text-sm text-emerald-300/70">{validationResult.summary.validEmployees} record(s) passed validation. You may continue.</p>
                      </div>
                      <div className="text-2xl text-emerald-500">✓</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {validationResult && validationResult.summary.invalidEmployees > 0 && (
                <p className="text-center text-xs text-red-400 font-semibold">
                  ⛔ Fix {validationResult.summary.invalidEmployees} invalid record{validationResult.summary.invalidEmployees > 1 ? 's' : ''} before continuing — re-upload a corrected file to proceed
                </p>
              )}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => setStep(3)} disabled={!step2Valid}>
                  {step2Valid
                    ? `Next: Template (${validationResult.summary.validEmployees} Records) →`
                    : validationResult && validationResult.summary.invalidEmployees > 0
                      ? `Fix ${validationResult.summary.invalidEmployees} Error${validationResult.summary.invalidEmployees > 1 ? 's' : ''} to Continue`
                      : 'Upload to Continue →'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Template Design ── */}
        {step === 3 && (
          <div className="slide-in">
            <div className="grid grid-cols-2 gap-6 mb-5">

              {/* LEFT: controls */}
              <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 520 }}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-white">Certificate Template Design</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTemplateMode('quick'); setStyleDesc(''); }}
                      className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${templateMode === 'quick' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-surface-muted border border-surface-border text-slate-400 hover:text-slate-300'}`}
                    >
                      Quick Mode
                    </button>
                    <button
                      onClick={() => setTemplateMode('ai')}
                      className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${templateMode === 'ai' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-surface-muted border border-surface-border text-slate-400 hover:text-slate-300'}`}
                    >
                      AI Mode
                    </button>
                  </div>
                </div>

                {/* AI prompt — only visible in AI mode */}
                {templateMode === 'ai' && (
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                    Describe certificate style (AI will design)
                  </label>
                  <textarea rows={2} value={styleDesc} onChange={e => setStyleDesc(e.target.value)}
                    placeholder="e.g. gold elegant luxury, blue corporate formal, emerald green nature, or describe any custom style"
                    className="input-field resize-none" />
                </div>
                )}

                {/* Style selector — only visible in Quick mode */}
                {templateMode === 'quick' && (
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">Quick Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CERT_STYLES).map(([id, s]) => (
                      <button key={id} onClick={() => { setSelectedStyle(id); setTmplGenerated(false); }}
                        className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200"
                        style={{
                          background: selectedStyle === id ? s.bgGradient : 'transparent',
                          borderColor: selectedStyle === id ? s.accentColor : 'rgba(255,255,255,0.1)',
                          color: selectedStyle === id ? s.accentColor : '#94a3b8',
                          boxShadow: selectedStyle === id ? `0 0 10px ${s.accentColor}30` : 'none',
                        }}>
                        {s.label}
                        {selectedStyle === id && <span className="block text-[9px] mt-0.5 opacity-70">Selected</span>}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* Certificate title */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Certificate Title</label>
                  <input type="text" value={tmplFields.title} onChange={updateTmplField('title')}
                    placeholder="Certificate of Completion" className="input-field" />
                </div>

                {/* Signatories */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Signatories</label>
                    {signatories.length < 2 && (
                      <button onClick={addSignatory}
                        className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded transition-colors">
                        + Add Signatory
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {signatories.map((sg, idx) => (
                      <div key={sg.id} className="bg-surface-muted border border-surface-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">Signatory {idx + 1}</span>
                          {signatories.length > 1 && (
                            <button onClick={() => removeSignatory(sg.id)}
                              className="text-[10px] text-red-400 hover:text-red-300 transition-colors">Remove</button>
                          )}
                        </div>
                        <input type="text" value={sg.name} onChange={e => updateSignatory(sg.id, 'name', e.target.value)}
                          placeholder="Full name" className="input-field text-xs py-1.5" />
                        {/* Signature image upload */}
                        <div
                          className="border border-dashed border-surface-border rounded-lg p-2 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
                          onClick={() => sigImgRefs.current[sg.id]?.click()}>
                          <input ref={el => sigImgRefs.current[sg.id] = el} type="file" accept="image/*" className="hidden"
                            onChange={e => handleSigImage(sg.id, e.target.files[0])} />
                          {sg.imageUrl
                            ? <div className="flex items-center justify-center gap-2">
                                <img src={sg.imageUrl} alt="sig" className="h-6 object-contain" />
                                <button onClick={e => {
                                  e.stopPropagation();
                                  setSignatories(s => s.map(x => x.id === sg.id ? { ...x, imageUrl: '', imageBase64: '' } : x));
                                }}
                                  className="text-[10px] text-red-400 underline">Remove</button>
                              </div>
                            : <p className="text-[10px] text-slate-500">Upload signature image <span className="text-indigo-400">(optional)</span></p>
                          }
                        </div>
                        {/* Position */}
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Position</label>
                          <div className="flex gap-2">
                            {['left', 'center', 'right'].map(pos => (
                              <button key={pos} onClick={() => updateSignatory(sg.id, 'position', pos)}
                                className="flex-1 py-1 rounded text-[10px] font-medium border transition-all"
                                style={{
                                  background: sg.position === pos ? 'rgba(99,102,241,0.2)' : 'transparent',
                                  borderColor: sg.position === pos ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                  color: sg.position === pos ? '#a5b4fc' : '#64748b',
                                }}>
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button onClick={handleGenerateTemplate} disabled={tmplGenerating}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                    tmplGenerated ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                    : tmplGenerating ? 'bg-indigo-600/50 border-indigo-500/30 text-indigo-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-transparent text-white'
                  }`}>
                  {tmplGenerating ? <><span className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />Generating...</>
                    : tmplGenerated ? <>Template Generated</>
                    : <>Generate Template</>}
                </button>

                {tmplGenerated && !uploadedTmplDocx && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <span>&#10003;</span><span>Template ready — proceed to Step 4.</span>
                  </div>
                )}

                {/* ── Fix 2: Custom .docx template upload ── */}
                <div className="border-t border-surface-border pt-4 mt-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Or upload a custom .docx template</p>
                  {uploadedTmplDocx ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-emerald-400 text-xs">📄</span>
                        <span className="text-xs text-emerald-300 truncate font-medium">{uploadedTmplDocx.filename}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">{uploadedTmplDocx.size}</span>
                      </div>
                      <button onClick={clearTmplDocx} className="text-xs text-red-400 hover:text-red-300 ml-3 flex-shrink-0 transition-colors">✕ Remove</button>
                    </div>
                  ) : (
                    <label className="block">
                      <input type="file" accept=".docx" onChange={handleTmplDocxUpload}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:text-xs file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:border-0 file:cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Only <span className="text-slate-300 font-medium">.docx</span> files. Opens for inline editing. Used as email body; PDF cert is still canvas-generated.
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {/* RIGHT: live preview */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-white">Live Preview</h3>
                {tmplGenerating ? (
                  <div className="rounded-xl border border-surface-border bg-surface-muted p-6 space-y-3">
                    {[45,30,60,50,40,30,50].map((w,i) => <div key={i} className="shimmer rounded h-3 mx-auto" style={{ width:`${w}%` }} />)}
                  </div>
                ) : uploadedTmplDocx ? (
                  /* ── Docx A4 preview shell ── */
                  <div className="bg-slate-900 p-4 max-h-[520px] overflow-y-auto rounded-lg">
                    <div style={{ width:'100%', background:'#ffffff', boxShadow:'0 4px 24px rgba(0,0,0,0.5)', borderRadius:3, display:'flex', flexDirection:'column' }}>
                      <div style={{ height:4, background:'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius:'3px 3px 0 0', flexShrink:0 }} />
                      {docxLoading ? (
                        <div className="flex items-center justify-center gap-3 p-10">
                          <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-slate-400">Rendering document…</p>
                        </div>
                      ) : (
                        <div
                          ref={docxEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={syncDocxEdits}
                          className="focus:outline-none"
                          style={{ flex:1, padding:'32px 40px', fontFamily:'Georgia, serif', fontSize:13, lineHeight:1.75, color:'#1e293b', overflowY:'auto' }}
                          dangerouslySetInnerHTML={{ __html: docxHtml || '' }}
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 text-center">✎ Click inside to edit inline · Used as email body content</p>
                  </div>
                ) : (
                  <CertCanvas
                    styleId={selectedStyle}
                    title={tmplFields.title}
                    orgName={form.organization}
                    eventName={form.eventName}
                    eventDate={form.trainingStartDate && form.trainingEndDate ? `${form.trainingStartDate} to ${form.trainingEndDate}` : form.trainingStartDate || '{{date}}'}
                    signatories={signatories}
                    aiStyle={aiStyleConfig}
                  />
                )}
                {tmplGenerated && !uploadedTmplDocx && (
                  <div className="flex justify-end">
                    <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px]">&#10003; Template ready</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-surface-border">
              <Button variant="secondary" onClick={() => setStep(2)}>&#8592; Back</Button>
              <Button onClick={() => setStep(4)}>Next: Generate Certificates &#8594;</Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Generate Certificates ── */}
        {step === 4 && (
          <div className="slide-in">
            <div className="grid grid-cols-2 gap-5 mb-5">

              {/* LEFT: controls + progress */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Generate Certificates</h3>

                {/* Batch summary */}
                <div className="space-y-1.5 text-xs">
                  {[
                    ['Batch',          form.eventName],
                    ['Training Period', form.trainingStartDate && form.trainingEndDate ? `${form.trainingStartDate} to ${form.trainingEndDate}` : '—'],
                    ['Organisation',   form.organization],
                    ['Candidates',     String(genCount)],
                    ['Template Style', CERT_STYLES[selectedStyle]?.label || selectedStyle],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-surface-border last:border-0">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Progress</span>
                    <span>{genProgress} / {genCount}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: genCount > 0 ? `${(genProgress / genCount) * 100}%` : '0%' }} />
                  </div>
                </div>

                {/* Live generation log */}
                <div className="max-h-36 overflow-y-auto space-y-1 bg-surface-muted rounded-lg p-3">
                  {genProgress === 0 && !generating && !genDone && (
                    <p className="text-xs text-slate-600 text-center">No certificates generated yet</p>
                  )}
                  {parsedRows.slice(0, genProgress).map((row, i) => {
                    const name = (nameColIdx >= 0 ? row[nameColIdx] : row[0]) || `Candidate ${i + 1}`;
                    const safeName = String(name).replace(/\s+/g, '_');
                    const safeEvent = (form.eventName || 'Event').replace(/\s+/g, '_');
                    const filename = (filenamePattern || 'CandidateName_EventName.pdf')
                      .replace(/CandidateName/g, safeName)
                      .replace(/EventName/g, safeEvent);
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-emerald-400 truncate">&#10003; {filename}</span>
                        <span className="text-slate-500 font-mono ml-2 shrink-0">stored</span>
                      </div>
                    );
                  })}
                  {generating && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <span className="animate-pulse">&#9679;</span> Generating...
                    </div>
                  )}
                  {genDone && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1 border-t border-surface-border mt-1">
                      <span>&#10003;</span> All {genCount} certificates generated
                    </div>
                  )}
                </div>

                <div>
                    <label className="text-[10px] text-slate-600 font-mono block mb-1">Naming pattern (use CandidateName and EventName)</label>
                    <input type="text" value={filenamePattern} onChange={e => setFilenamePattern(e.target.value)} className="input-field text-[10px]" />
                  </div>

                <Button
                  variant={genDone ? 'success' : 'ai'}
                  onClick={handleGenerate}
                  disabled={generating || genDone || genCount === 0}
                  className="w-full justify-center"
                >
                  {generating ? <><Spinner /> Generating {genProgress}/{genCount}...</>
                    : genDone ? <>All {genCount} Certificates Generated</>
                    : <>Generate {genCount} Certificates</>}
                </Button>

                {genCount === 0 && (
                  <p className="text-xs text-red-400 text-center">No candidate data found. Go back and upload a file.</p>
                )}
              </div>

              {/* RIGHT: certificate preview */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Certificate Preview</h3>
                  {genDone && <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px]">&#10003; Ready</span>}
                </div>

                {generating ? (
                  <div className="space-y-3 py-4">
                    {[50,33,66,50,40,33].map((w,i) => <div key={i} className="shimmer rounded h-3 mx-auto" style={{ width:`${w}%` }} />)}
                  </div>
                ) : (
                  <div className={genDone ? 'slide-in' : 'opacity-40 pointer-events-none'}>
                    <CertCanvas
                      styleId={selectedStyle}
                      title={tmplFields.title}
                      orgName={form.organization}
                      eventName={form.eventName}
                      eventDate={form.trainingStartDate && form.trainingEndDate ? `${form.trainingStartDate} to ${form.trainingEndDate}` : form.trainingStartDate || '{{date}}'}
                      signatories={signatories}
                      candidateName={genDone && parsedRows.length > 0 ? String(nameColIdx >= 0 ? parsedRows[0][nameColIdx] : parsedRows[0][0]) : '{{candidate_name}}'}
                    />
                    {genDone && parsedRows.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                        <div>
                          <span className="text-slate-500">Sample Candidate</span>
                          <p className="text-slate-300 font-medium mt-0.5">
                            {nameColIdx >= 0 ? parsedRows[0][nameColIdx] : parsedRows[0][0]}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Event</span>
                          <p className="text-slate-300 font-medium mt-0.5">{form.eventName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(3)}>&#8592; Back</Button>
              <Button onClick={() => setStep(5)} disabled={!genDone}>Next: Send Email &#8594;</Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Send Email ── */}
        {step === 5 && (
          <div className="slide-in space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white">Email Composition & Dispatch</h3>
            </div>

            {bulkSuccess && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 slide-in">
                <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Emails dispatched successfully</p>
                  <p className="text-xs text-emerald-300/70 mt-0.5">
                    {sendLog.filter(l => l.status === 'Delivered').length} delivered,{' '}
                    {sendLog.filter(l => l.status === 'Failed').length} failed — {form.eventName}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              {/* LEFT: compose */}
              <div className="space-y-4">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={useDefaultTemplate} onChange={e => handleUseDefault(e.target.checked)} className="sr-only" />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${useDefaultTemplate ? 'bg-indigo-600 border-indigo-600' : 'border-surface-border group-hover:border-indigo-500/50'}`}>
                      {useDefaultTemplate && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Use default organisation template</span>
                </label>

                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">Email Template Mode</label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => { setEmailTemplateMode('quick'); setShowEmailVariations(false); }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        emailTemplateMode === 'quick'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                      }`}
                    >
                      Quick Template
                    </button>
                    <button
                      onClick={() => { setEmailTemplateMode('detailed'); setShowEmailVariations(false); }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        emailTemplateMode === 'detailed'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'
                      }`}
                    >
                      AI Variations
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Subject Line</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Email subject…" className="input-field" />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Email Body</label>
                  {emailGenerating ? (
                    <div className="input-field space-y-2 py-3 h-36">
                      {[90,75,100,60,85,70,55].map((w,i) => <div key={i} className="shimmer rounded h-2.5" style={{ width:`${w}%` }} />)}
                    </div>
                  ) : (
                    <textarea rows={7} value={emailBody} onChange={e => setEmailBody(e.target.value)}
                      placeholder="Click Generate Email to compose with AI…" className="input-field resize-none" />
                  )}
                </div>

                {/* LinkedIn agent: generate post content and share link */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">LinkedIn Post (editable)</label>
                  <div className="flex gap-2 mb-2">
                    <button onClick={handleGenerateLinkedIn} className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-medium transition-colors">📱 Generate LinkedIn Post</button>
                  </div>
                  <textarea rows={4} value={linkedinContent} onChange={e => setLinkedinContent(e.target.value)} placeholder="LinkedIn post content…" className="input-field resize-none" />
                </div>

                <Button variant="ai" onClick={handleGenerateEmail} disabled={emailGenerating || bulkSending} className="w-full justify-center">
                  {emailGenerating ? <><Spinner /> Generating...</> : '✦ Generate Email Template'}
                </Button>

                {/* Show email variations if available */}
                {showEmailVariations && emailVariations.length > 0 && (
                  <div className="space-y-2 slide-in">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">AI suggested alternatives</p>
                    {emailVariations.map((variant, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectEmailVariation(variant)}
                        className="w-full text-left p-2.5 rounded-lg bg-surface-muted border border-surface-border hover:border-indigo-500 transition-all text-xs"
                      >
                        <p className="font-medium text-white truncate">{variant.subject}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 truncate">{variant.body.split('\n')[0]}...</p>
                      </button>
                    ))}
                  </div>
                )}

                {emailGenerated && !emailGenerating && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <span>✓</span><span>Email ready — review and send when satisfied.</span>
                  </div>
                )}
              </div>

              {/* RIGHT: dispatch */}
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-surface-muted rounded-xl p-4 border border-surface-border">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Dispatch Summary</p>
                  <div className="space-y-2 text-xs">
                    {[
                      ['Batch',         form.eventName],
                      ['Recipients',    `${genCount} candidates`],
                      ['Certificates',  'Generated ✓'],
                      ['Organisation',  form.organization],
                      ['Subject',       emailSubject || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-300 font-medium truncate max-w-[160px]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send progress bar */}
                {(bulkSending || bulkSuccess) && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Sending</span>
                      <span>{sendProgress} / {genCount}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: genCount > 0 ? `${(sendProgress / genCount) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )}

                {/* Live send log */}
                {sendLog.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-surface-muted rounded-lg p-3">
                    {sendLog.map((entry, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between">
                          <span className="truncate text-slate-300">{entry.name} <span className="text-slate-500">({entry.email})</span></span>
                          <span className={`ml-2 shrink-0 font-medium ${entry.status === 'Delivered' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.status === 'Delivered' ? '✓' : '✗'} {entry.status}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-red-400/70 text-[10px] mt-0.5 pl-1 truncate" title={entry.reason}>{entry.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant={bulkSuccess ? 'success' : 'primary'}
                  onClick={handleBulkSend}
                  disabled={bulkSending || bulkSuccess || !emailGenerated || !emailSubject.trim()}
                  className="w-full justify-center"
                  size="lg"
                >
                  {bulkSending
                    ? <><Spinner /> Sending {sendProgress}/{genCount}...</>
                    : bulkSuccess
                    ? `✓ Sent to ${sendLog.filter(l => l.status === 'Delivered').length} Recipients`
                    : `Send to ${genCount} Recipients`}
                </Button>

                {!emailGenerated && (
                  <p className="text-xs text-slate-600 text-center">Generate email content first to enable sending</p>
                )}

                {bulkSuccess && (
                  <Button variant="secondary" onClick={() => navigate('/tracking')} className="w-full justify-center">View Email Tracking →</Button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(4)}>&#8592; Back</Button>
              {bulkSuccess && <Button onClick={() => navigate('/dashboard')}>Back to Dashboard ✓</Button>}
            </div>
          </div>
        )}
      </Card>

      {/* LinkedIn Share Modal */}
      <LinkedInShareModal
        isOpen={showLinkedInModal}
        onClose={() => setShowLinkedInModal(false)}
        postText={linkedinContent}
        trainingName={form.eventName}
        organization={form.organization}
      />
    </MainLayout>
  );
}