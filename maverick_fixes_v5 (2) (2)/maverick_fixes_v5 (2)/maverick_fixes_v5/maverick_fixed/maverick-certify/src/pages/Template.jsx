import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/index.jsx';
import { Card, Button } from '../components/index.jsx';
import { generateCertTemplate } from '../services/api.js';

const QUICK_STYLES = ['Dark professional', 'Corporate blue', 'Minimal white', 'Vibrant gradient'];
const PLACEHOLDERS = ['{{candidate_name}}', '{{event_name}}', '{{date}}', '{{signatory_name}}', '{{qr_code}}', '{{org_logo}}'];

// Maps style keys (from AI response) and quick-style labels → preview color tokens
const STYLE_COLORS = {
  modern:           { bgGradient: 'linear-gradient(135deg, #1a1040 0%, #0f1117 50%, #1a0a2e 100%)', accentColor: '#a78bfa', textColor: '#e2e8f0' },
  minimal:          { bgGradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',              accentColor: '#94a3b8', textColor: '#f1f5f9' },
  corporate:        { bgGradient: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 60%, #0a1628 100%)', accentColor: '#60a5fa', textColor: '#e2e8f0' },
  gold:             { bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)', accentColor: '#fbbf24', textColor: '#fef3c7' },
  emerald:          { bgGradient: 'linear-gradient(135deg, #021a0e 0%, #052e16 50%, #021a0e 100%)', accentColor: '#34d399', textColor: '#d1fae5' },
  rose:             { bgGradient: 'linear-gradient(135deg, #1a0510 0%, #2d0a1e 50%, #1a0510 100%)', accentColor: '#fb7185', textColor: '#ffe4e6' },
  // quick-style labels
  'dark professional': { bgGradient: 'linear-gradient(135deg, #1a1040 0%, #0f1117 50%, #1a0a2e 100%)', accentColor: '#a78bfa', textColor: '#e2e8f0' },
  'corporate blue':    { bgGradient: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 60%, #0a1628 100%)', accentColor: '#60a5fa', textColor: '#e2e8f0' },
  'minimal white':     { bgGradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',              accentColor: '#94a3b8', textColor: '#f1f5f9' },
  'vibrant gradient':  { bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)', accentColor: '#fbbf24', textColor: '#fef3c7' },
};

// Determines if the prompt is exclusively positional
const isPositionOnly = (text) => {
  const t = text.toLowerCase();
  const hasExplicitPx = /\d+\s*(?:px|pixels?)\b/.test(t);
  if (!hasExplicitPx) return false;

  const hasPositionWord = /\bpush|move|shift|nudge|lower|higher|down|up|offset|adjust|reposition|bring|below|above\b/.test(t);
  const hasColorChange = /change.*color|set.*color|use.*blue|use.*red|use.*gold|use.*green|apply.*gradient|set.*background|change.*background|change.*theme|set.*theme|background\b/.test(t);

  return hasPositionWord && !hasColorChange;
};

// Extracts target text elements and pixel adjustments
const parseOffset = (text) => {
  const t = text.toLowerCase();
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:px|pixels?)\b/);
  if (!m) return null;
  const px = parseFloat(m[1]);
  const up = /\bup\b|above|upward|higher/.test(t);
  const delta = up ? -px : px;
  
  if (/hexaware|org\b|organisation|organization|company|technologies/.test(t)) return { target: 'org', delta };
  if (/\btitle\b|certificate\s+title|heading/.test(t)) return { target: 'title', delta };
  if (/candidate|recipient/.test(t)) return { target: 'candidate', delta };
  return null;
};

export default function Template() {
  const navigate = useNavigate();
  const previewContainerRef = useRef(null);
  const docxEditorRef = useRef(null);

  // Flush in-place edits from the contentEditable div back into state
  const syncDocxEdits = () => {
    if (docxEditorRef.current) {
      setDocxHtml(docxEditorRef.current.innerHTML);
    }
  };

  const [description, setDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Dark professional');
  const [signatureAlignment, setSignatureAlignment] = useState('left');
  const [signatureImage, setSignatureImage] = useState(null);
  const [signatoryName, setSignatoryName] = useState('John Smith');
  const [signatoryTitle, setSignatoryTitle] = useState('Training Manager');
  const [loading, setLoading] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [templateMode, setTemplateMode] = useState('quick');
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState([]);
  const [generatedData, setGeneratedData] = useState(null);

  // Custom Uploads
  const [uploadedImage, setUploadedImage] = useState(null);       
  const [uploadedPDF, setUploadedPDF] = useState(null);
  // Rendered HTML from the uploaded .docx (via mammoth)
  const [docxHtml, setDocxHtml] = useState(null);
  // Controls whether overlay text elements are visible on the custom uploaded image
  const [showOverlay, setShowOverlay] = useState(false);

  // Elements pixel offsets (Driven by both drag interactions and prompt adjustments)
  const [offsets, setOffsets] = useState({ org: 0, title: 0, candidate: 0 });
  
  // Drag State Tracker
  const [activeDragTarget, setActiveDragTarget] = useState(null);
  const startY = useRef(0);
  const initialOffset = useRef(0);

  const isCustomActive = !!(uploadedImage || uploadedPDF);
  const posOnly = isPositionOnly(description);

  // Execution engine for prompt setups
  const handleGenerate = async () => {
    if (isCustomActive) return; // Prevent layout disruption when using manual graphics

    // FIX #2: Always process and extract position variations locally out of mixed styling prompts
    const spatialUpdate = parseOffset(description);
    if (spatialUpdate) {
      setOffsets(prev => ({ 
        ...prev, 
        [spatialUpdate.target]: prev[spatialUpdate.target] + spatialUpdate.delta 
      }));
    }

    // Direct exit point if there are no styling additions to perform
    if (posOnly) {
      setDescription('');
      return; 
    }

    setLoading(true);
    try {
      const history = generatedData ? [{
        role: 'assistant',
        content: JSON.stringify({
          title: generatedData.title,
          bgGradient: generatedData.bgGradient,
          accentColor: generatedData.accentColor,
          stripeGradient: generatedData.stripeGradient,
          borderColor: generatedData.borderColor,
          textColor: generatedData.textColor,
          cornerStyle: generatedData.cornerStyle,
          decoration: generatedData.decoration,
        }),
      }] : [];

      const res = await generateCertTemplate({
        description,
        trainingName: 'AI Workshop 2026',
        organisation: 'Mavericks Inc.',
        mode: templateMode,
        requestVariations: templateMode === 'prompt',
        conversationHistory: history,
      });

      if (res) {
        if (res.mode === 'custom' || res.bgGradient) {
          // Full AI color config returned — merge directly
          setGeneratedData(prev => ({ ...(prev || {}), ...res }));
          if (res.title) setGeneratedTitle(res.title);
        } else if (res.style) {
          // Style key only — look up real color values so the preview re-renders
          const MAP = { modern: 'Dark professional', corporate: 'Corporate blue', minimal: 'Minimal white', gold: 'Vibrant gradient', emerald: 'Vibrant gradient', rose: 'Vibrant gradient' };
          const label = MAP[res.style] || selectedStyle;
          setSelectedStyle(label);
          const colors = STYLE_COLORS[res.style] || STYLE_COLORS[label.toLowerCase()] || {};
          setGeneratedData(prev => ({ ...(prev || {}), ...colors, style: res.style }));
          setGeneratedTitle(res.title || 'Certificate of Completion');
        }
        if (res.alternatives?.length > 0) { setVariations(res.alternatives); setShowVariations(true); }
      }
    } catch (err) {
      console.error('Template generation failed', err);
      alert('Failed to generate template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // FIX #3: Dragging Mechanics event hooks
  const initDrag = (e, target) => {
    e.preventDefault();
    setActiveDragTarget(target);
    startY.current = e.clientY;
    initialOffset.current = offsets[target];
  };

  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!activeDragTarget) return;
      const currentDelta = e.clientY - startY.current;
      setOffsets(prev => ({
        ...prev,
        [activeDragTarget]: initialOffset.current + currentDelta
      }));
    };

    const handleGlobalRelease = () => {
      if (activeDragTarget) setActiveDragTarget(null);
    };

    if (activeDragTarget) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalRelease);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalRelease);
    };
  }, [activeDragTarget]);

  const [docxLoading, setDocxLoading] = useState(false);

  const loadMammoth = () => new Promise((resolve, reject) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    script.onload = () => resolve(window.mammoth);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) {
      alert('Please upload a .docx file only.');
      e.target.value = '';
      return;
    }
    setUploadedImage(null);
    setUploadedPDF({ filename: file.name, size: (file.size / 1024).toFixed(1) + ' KB', file });
    setDocxHtml(null);
    setDocxLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await loadMammoth();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocxHtml(result.value || '<p style="color:#94a3b8;font-size:13px">Document is empty or has no extractable text.</p>');
    } catch (err) {
      console.error('Mammoth conversion failed', err);
      setDocxHtml('<p style="color:#f87171;font-size:13px">⚠ Could not render document. You can still proceed — the file will be used as uploaded.</p>');
    } finally {
      setDocxLoading(false);
    }
  };

  const handleSigUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onload = ev => setSignatureImage(ev.target.result); r.readAsDataURL(file); }
  };

  const clearUpload = () => { setUploadedImage(null); setUploadedPDF(null); setDocxHtml(null); setDocxLoading(false); setOffsets({ org: 0, title: 0, candidate: 0 }); setShowOverlay(false); };

  const _fallbackColors = STYLE_COLORS[selectedStyle.toLowerCase()] || STYLE_COLORS['dark professional'];
  const bg = generatedData?.bgGradient || _fallbackColors.bgGradient;
  const accent = generatedData?.accentColor || _fallbackColors.accentColor;
  const tc = generatedData?.textColor || _fallbackColors.textColor;

  const overlayAccent = '#f59e0b';   
  const overlayText   = '#ffffff';
  const sigJ = signatureAlignment === 'left' ? 'flex-start' : signatureAlignment === 'right' ? 'flex-end' : 'center';

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Certificate Template Generator</h1>
          <p className="text-sm text-slate-400 mt-0.5">Design and configure your certificate template with AI assistance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">

        {/* ── LEFT PANEL ── */}
        <Card className="p-5">
          {/* FIX #1: If a custom graphic is loaded, swap out AI configurations for an isolation message */}
          {isCustomActive ? (
            <div className="mb-4 text-center p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
              <span className="text-2xl text-emerald-400">📄 Custom Template Active</span>
              <p className="text-xs text-slate-400 mt-2 mb-4">
                AI generation is disabled while a custom .docx template is loaded. Edit the document directly in the preview panel on the right, or remove it to switch back to AI generation.
              </p>
              <Button variant="secondary" onClick={clearUpload} className="w-full text-xs">
                Remove Template & Enable AI Generation
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="ai-badge">+ AI</span>
                <span className="text-sm font-medium text-white">Generate template with AI</span>
              </div>

              {/* Mode toggle */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Generation Mode</label>
                <div className="flex gap-2">
                  {[['quick', 'Quick Styles'], ['prompt', 'AI Prompt']].map(([m, l]) => (
                    <button key={m} onClick={() => { setTemplateMode(m); setShowVariations(false); }}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${templateMode === m ? 'bg-teal-600 text-white' : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>

              {templateMode === 'prompt' ? (
                <div className="mb-4">
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Describe your certificate style</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                    className="input-field resize-none"
                    placeholder={'Style: "blue corporate theme with gold accents"\nPosition: "push Hexaware text down 4px"'}
                  />
                  {posOnly && <p className="text-xs text-amber-400 mt-1.5">⚡ Position-only — AI will not be called</p>}
                </div>
              ) : (
                <div className="mb-4">
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Quick style</label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_STYLES.map(s => (
                      <button key={s} onClick={() => setSelectedStyle(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedStyle === s ? 'bg-teal-600 text-white' : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Signature alignment</label>
                <div className="flex gap-2">
                  {[['left', '⬅ Left'], ['center', '↔ Center'], ['right', 'Right ➡']].map(([a, l]) => (
                    <button key={a} onClick={() => setSignatureAlignment(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${signatureAlignment === a ? 'bg-teal-600 text-white' : 'bg-surface-muted text-slate-400 hover:text-slate-200 border border-surface-border'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Upload signature image</label>
                <input type="file" accept="image/*" onChange={handleSigUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:text-xs file:font-medium file:bg-teal-600 file:text-white hover:file:bg-teal-500 file:border-0 file:cursor-pointer"
                />
                {signatureImage && <p className="text-xs text-emerald-400 mt-2">✓ Signature uploaded</p>}
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Signatory name</label>
                <input type="text" value={signatoryName} onChange={e => setSignatoryName(e.target.value)} placeholder="Enter signatory name" className="input-field" />
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Signatory title</label>
                <input type="text" value={signatoryTitle} onChange={e => setSignatoryTitle(e.target.value)} placeholder="Enter signatory title" className="input-field" />
              </div>

              <div className="mb-5 bg-surface-muted rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">AI inputs (auto-detected)</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Event name</span><span className="text-slate-300">AI Workshop 2026</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Organisation</span><span className="text-slate-300">Mavericks Inc.</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="text-slate-300">{templateMode === 'quick' ? 'Quick Styles' : 'AI Prompt'}</span></div>
                </div>
              </div>

              <Button variant="ai" onClick={handleGenerate} disabled={loading} className="w-full justify-center mb-3">
                {loading ? 'Generating...' : posOnly ? '⚡ Apply Position' : '✦ Generate template ↗'}
              </Button>
            </>
          )}

          {/* Core file drop container split line */}
          <div className="border-t border-surface-border mt-5 pt-5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Or upload your own template (.docx)</div>
            {(uploadedImage || uploadedPDF) ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <p className="text-xs text-emerald-400">
                  {uploadedPDF ? `✓ DOCX: ${uploadedPDF.filename}` : '✓ Custom template active'}
                </p>
                <button onClick={clearUpload} className="text-xs text-red-400 hover:text-red-300 ml-3">✕ Remove</button>
              </div>
            ) : (
              <label className="block">
                <input type="file" accept=".docx" onChange={handleUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:text-xs file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:border-0 file:cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Only <span className="text-slate-300 font-medium">.docx</span> files are supported. The document will open for editing inline.</p>
              </label>
            )}
          </div>
        </Card>

        {/* ── RIGHT PANEL — PREVIEW ── */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">
                {uploadedPDF ? 'Template Editor' : uploadedImage ? 'Live Preview' : 'AI output preview'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Only show AI style badge when no custom template is uploaded */}
                {!uploadedImage && !uploadedPDF && (
                  <span className="text-xs text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded font-medium">{selectedStyle}</span>
                )}
                {uploadedPDF && (
                  <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded font-medium">Custom DOCX Template</span>
                )}
                {uploadedImage && (
                  <>
                    <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded font-medium">Custom Template</span>
                    <button
                      onClick={() => setShowOverlay(v => !v)}
                      className={`text-xs px-2 py-1 rounded font-medium border transition-all ${
                        showOverlay
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-surface-muted border-surface-border text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {showOverlay ? '✎ Editing Overlay' : '✎ Edit Overlay'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {uploadedPDF ? (
              /* DOCX INLINE EDITOR */
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-medium">📄 {uploadedPDF.filename}</span>
                    <span className="text-xs text-slate-500">{uploadedPDF.size}</span>
                  </div>
                  <label className="cursor-pointer text-xs text-teal-400 hover:text-teal-300 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-1 rounded transition-all">
                    ↑ Replace file
                    <input type="file" accept=".docx" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
                {/* Rendered docx content — editable */}
                {docxLoading ? (
                  <div className="flex flex-col items-center justify-center p-10 bg-slate-800 min-h-[200px] gap-3">
                    <span className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400">Rendering document…</p>
                  </div>
                ) : docxHtml ? (
                  <div
                    ref={docxEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={syncDocxEdits}
                    className="p-5 bg-white text-slate-900 text-sm min-h-[320px] max-h-[520px] overflow-y-auto focus:outline-none"
                    style={{ fontFamily: 'Georgia, serif', lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: docxHtml }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 bg-slate-800 min-h-[200px] gap-3">
                    <span className="text-3xl">📄</span>
                    <p className="text-xs text-slate-400 text-center">Upload a .docx file to preview and edit it here.</p>
                  </div>
                )}
                <div className="px-3 py-2 bg-slate-800 border-t border-slate-700">
                  <p className="text-[11px] text-slate-500">✎ Click anywhere in the document above to edit content inline</p>
                </div>
              </div>
            ) : uploadedImage ? (
              /* UPLOADED IMAGE PREVIEW — overlay elements only shown when user enables Edit Overlay */
              <div 
                ref={previewContainerRef}
                style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #374151', display: 'inline-block', width: '100%' }}
              >
                <img src={uploadedImage} alt="template" style={{ display: 'block', width: '100%', userSelect: 'none' }} draggable={false} />

                {showOverlay ? (
                  <>
                    <p 
                      onMouseDown={(e) => initDrag(e, 'org')}
                      style={{
                        position: 'absolute', left: 0, right: 0, margin: 0,
                        top: `calc(35% + ${offsets.org}px)`,
                        textAlign: 'center', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: overlayAccent, textShadow: '0 0 6px rgba(0,0,0,1)',
                        cursor: 'ns-resize', userSelect: 'none'
                      }}
                    >HEXAWARE TECHNOLOGIES</p>

                    <p 
                      onMouseDown={(e) => initDrag(e, 'title')}
                      style={{
                        position: 'absolute', left: 0, right: 0, margin: 0,
                        top: `calc(43% + ${offsets.title}px)`,
                        textAlign: 'center', fontSize: 14, fontWeight: 800,
                        color: overlayText, textShadow: '0 0 6px rgba(0,0,0,1)',
                        cursor: 'ns-resize', userSelect: 'none'
                      }}
                    >{generatedTitle || 'Certificate of Completion'}</p>

                    <p 
                      onMouseDown={(e) => initDrag(e, 'candidate')}
                      style={{
                        position: 'absolute', left: 0, right: 0, margin: 0,
                        top: `calc(53% + ${offsets.candidate}px)`,
                        textAlign: 'center', fontSize: 15, fontWeight: 700,
                        color: overlayAccent, textShadow: '0 0 6px rgba(0,0,0,1)',
                        cursor: 'ns-resize', userSelect: 'none'
                      }}
                    >{'{{candidate_name}}'}</p>

                    {/* Overlay editing hint banner */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.55)', padding: '6px 10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                      <span style={{ fontSize: 10, color: '#fbbf24' }}>⇕ Drag elements to reposition</span>
                    </div>
                  </>
                ) : (
                  /* Subtle hint shown when overlay is off */
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.45)', padding: '6px 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Click <strong style={{ color: '#fcd34d' }}>✎ Edit Overlay</strong> above to add & position text elements</span>
                  </div>
                )}
              </div>
            ) : (
              /* AI CANVAS GRAPHICS PREVIEW WINDOW */
              <div className="rounded-xl border border-slate-700 p-8 text-center relative overflow-hidden" style={{ background: bg }}>
                <div className="absolute inset-x-0 top-4 flex justify-center gap-1">
                  <div className="w-12 h-0.5 rounded" style={{ background: accent + '80' }} />
                  <div className="w-3 h-0.5 rounded" style={{ background: accent + '50' }} />
                </div>
                <div className="relative z-10">

                  <p 
                    onMouseDown={(e) => initDrag(e, 'org')}
                    style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, paddingTop: `${8 + offsets.org}px`, paddingBottom: 8, cursor: 'ns-resize', userSelect: 'none' }}
                  >
                    HEXAWARE TECHNOLOGIES
                  </p>

                  <p 
                    onMouseDown={(e) => initDrag(e, 'title')}
                    style={{ color: tc, fontSize: 15, fontWeight: 800, margin: 0, paddingTop: `${offsets.title}px`, paddingBottom: 4, cursor: 'ns-resize', userSelect: 'none' }}
                  >
                    {generatedTitle || 'Certificate of Completion'}
                  </p>

                  <p style={{ color: tc + 'aa', fontSize: 11, margin: 0, paddingTop: 4, paddingBottom: 12 }}>This is to certify that</p>

                  <p 
                    onMouseDown={(e) => initDrag(e, 'candidate')}
                    style={{ color: accent, fontSize: 16, fontWeight: 700, margin: 0, paddingTop: `${offsets.candidate}px`, paddingBottom: 12, cursor: 'ns-resize', userSelect: 'none' }}
                  >
                    {'{{candidate_name}}'}
                  </p>

                  <p style={{ color: tc + 'aa', fontSize: 11, margin: 0, paddingBottom: 4 }}>has successfully completed</p>
                  <p style={{ color: tc, fontSize: 13, fontWeight: 600, margin: 0, paddingBottom: 4 }}>AI Workshop 2026</p>
                  <p style={{ color: tc + '88', fontSize: 11, margin: 0, paddingBottom: 20 }}>{'{{date}}'}</p>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: sigJ }}>
                    <div>
                      {signatureImage
                        ? <img src={signatureImage} alt="sig" style={{ height: 24, maxWidth: 80, objectFit: 'contain', display: 'block', marginBottom: 4 }} />
                        : <div className="w-20 h-0.5 bg-slate-600 mb-1" />
                      }
                      <p className="text-xs text-slate-400">{signatoryName || '{{signatory_name}}'}</p>
                      {signatoryTitle && <p className="text-xs text-slate-500">{signatoryTitle}</p>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', marginTop: 12, justifyContent: sigJ }}>
                    <div className="w-10 h-10 bg-slate-700 border border-slate-600 rounded flex items-center justify-center text-xs text-slate-500 font-mono">QR</div>
                  </div>

                </div>
              </div>
            )}
          </Card>

          {showVariations && variations.length > 0 && !isCustomActive && (
            <Card className="p-5 slide-in">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">AI suggested alternatives</p>
              <div className="space-y-2">
                {variations.map((v, i) => (
                  <button key={i} onClick={() => {
                    const MAP = { modern: 'Dark professional', corporate: 'Corporate blue', minimal: 'Minimal white', gold: 'Vibrant gradient', emerald: 'Vibrant gradient', rose: 'Vibrant gradient' };
                    setSelectedStyle(MAP[v.style] || selectedStyle);
                    setGeneratedTitle(v.title || 'Certificate of Completion');
                    setShowVariations(false);
                  }} className="w-full text-left p-3 rounded-lg bg-surface-muted border border-surface-border hover:border-teal-500 transition-all text-xs">
                    <p className="font-medium text-white">{v.title}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Style: {v.style}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Dynamic placeholders detected</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {PLACEHOLDERS.map(p => (
                <span key={p} className="bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs px-2 py-1 rounded font-mono">{p}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 justify-center">Edit template</Button>
              <Button
                onClick={() => {
                  // Flush any in-progress contentEditable edits before reading docxHtml
                  syncDocxEdits();
                  const body = docxEditorRef.current ? docxEditorRef.current.innerHTML : docxHtml;
                  navigate('/email', {
                    state: body ? { emailBody: body, emailBodySource: 'docx' } : undefined,
                  });
                }}
                className="flex-1 justify-center"
              >
                Save & next →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}