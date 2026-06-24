const { PDFDocument, rgb, StandardFonts, degrees } = require("pdf-lib");
const path = require("path");
const fs   = require("fs");

const Employee = require("../models/Employee");
const Batch    = require("../models/Batch");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getCertDir = () => {
  const dir = path.join(__dirname, "..", "uploads", "certificates");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const sanitize = (v) =>
  v.trim().replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");

const buildFilename = (employeeName, trainingName) =>
  `${sanitize(employeeName)}_${sanitize(trainingName)}.pdf`;

// Parse "#rrggbb" or "rgba(r,g,b,a)" → pdf-lib rgb()
const parseColor = (str, fallback = rgb(1, 1, 1)) => {
  if (!str) return fallback;
  const hex = str.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  const rgba = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (rgba) return rgb(+rgba[1] / 255, +rgba[2] / 255, +rgba[3] / 255);
  return fallback;
};

// Extract the first two hex colours from a CSS gradient string
const gradientColors = (grad) => {
  const hits = [...(grad || "").matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
  return { from: hits[0] || "#6366f1", to: hits[1] || hits[0] || "#a855f7" };
};

// Draw a horizontal gradient band by stacking thin vertical slices
const drawGradientRect = (page, x, y, w, h, hexFrom, hexTo) => {
  const steps = Math.ceil(w);
  const cFrom = parseColor(hexFrom);
  const cTo   = parseColor(hexTo);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = cFrom.red   + t * (cTo.red   - cFrom.red);
    const g = cFrom.green + t * (cTo.green - cFrom.green);
    const b = cFrom.blue  + t * (cTo.blue  - cFrom.blue);
    page.drawRectangle({
      x: x + i, y, width: 1.5, height: h,
      color: rgb(r, g, b),
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core PDF builder  — mirrors CertCanvas layout exactly
// ─────────────────────────────────────────────────────────────────────────────

const buildCertificatePDF = async (employee, batch, styleConfig = {}) => {
  // ── Custom docx template path ─────────────────────────────────────────────
  // When a custom .docx was uploaded, its full HTML (header + content + footer)
  // is passed via styleConfig.customDocxHtml. We stamp the candidate name into
  // placeholder tokens and render the complete document as the certificate body.
  if (styleConfig.customDocxHtml) {
    const name      = employee.employeeName || '';
    const training  = batch.trainingName || '';
    const org       = batch.organization || '';
    const dateRange = batch.trainingStartDate && batch.trainingEndDate
      ? `${batch.trainingStartDate} – ${batch.trainingEndDate}`
      : batch.trainingStartDate || '';

    // Replace common placeholder tokens in the HTML
    let html = styleConfig.customDocxHtml
      .replace(/\{\{candidate_name\}\}/gi, name)
      .replace(/\{\{first_name\}\}/gi, name.split(' ')[0] || name)
      .replace(/\{\{event_name\}\}/gi, training)
      .replace(/\{\{date\}\}/gi, dateRange)
      .replace(/\{\{organisation\}\}/gi, org)
      .replace(/\{\{organization\}\}/gi, org);

    // Wrap in a full HTML page so pdf-lib can render it via html-to-pdf approach.
    // We use a pure-Node html-to-text representation embedded in a simple PDF page.
    // Strip HTML tags for plain-text rendering in the PDF (mammoth HTML → plain text).
    const plainText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Build a styled A4 portrait PDF preserving the custom template content
    const W = 595, H = 842; // A4 portrait in points
    const pdfDoc = await PDFDocument.create();
    const page   = pdfDoc.addPage([W, H]);
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // White background
    page.drawRectangle({ x:0, y:0, width:W, height:H, color:rgb(1,1,1) });

    // Draw text with word-wrap
    const MARGIN = 56, LINE_H = 16, FONT_SIZE = 11;
    const maxWidth = W - MARGIN * 2;
    const lines = [];
    for (const paragraph of plainText.split('\n')) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      const words = paragraph.split(' ');
      let currentLine = '';
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (fontRegular.widthOfTextAtSize(test, FONT_SIZE) > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    let y = H - MARGIN;
    for (const line of lines) {
      if (y < MARGIN) break;
      if (line.trim()) {
        page.drawText(line, { x:MARGIN, y, font:fontRegular, size:FONT_SIZE, color:rgb(0.1,0.1,0.1) });
      }
      y -= LINE_H;
    }

    return pdfDoc.save();
  }

  // ── Standard canvas-generated certificate path (unchanged) ───────────────
  const {
    bgGradient    = "linear-gradient(135deg,#1a1040 0%,#0f1117 50%,#1a0a2e 100%)",
    accentColor   = "#a78bfa",
    stripeGradient= "linear-gradient(90deg,#6366f1,#a855f7)",
    borderColor   = "rgba(139,92,246,0.4)",
    textColor     = "#e2e8f0",
  } = styleConfig;

  const certTitle = styleConfig.certTitle || "Certificate of Completion";
  const org       = batch.organization  || "Organisation";
  const name      = employee.employeeName;
  const training  = batch.trainingName;
  const dateRange = batch.trainingStartDate && batch.trainingEndDate
    ? `${batch.trainingStartDate}  –  ${batch.trainingEndDate}`
    : batch.trainingStartDate || "";
  const signatories = styleConfig.signatories || [];

  // A4 landscape: 1122 × 794 pt  (matches the old Puppeteer viewport exactly)
  const W = 1122, H = 794;

  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([W, H]);

  // ── Background ────────────────────────────────────────────────────────────
  const bgColors = gradientColors(bgGradient);
  // Draw a vertical gradient for the background
  const bgSteps = H;
  const bgFrom  = parseColor(bgColors.from);
  const bgTo    = parseColor(bgColors.to);
  for (let i = 0; i < bgSteps; i++) {
    const t = i / (bgSteps - 1);
    page.drawRectangle({
      x: 0, y: i, width: W, height: 1.5,
      color: rgb(
        bgFrom.red   + t * (bgTo.red   - bgFrom.red),
        bgFrom.green + t * (bgTo.green - bgFrom.green),
        bgFrom.blue  + t * (bgTo.blue  - bgFrom.blue),
      ),
    });
  }

  // ── Outer border card ─────────────────────────────────────────────────────
  const bColor   = parseColor(accentColor, rgb(0.65, 0.55, 0.98));
  const CARD_M   = 21;   // margin from page edge
  const CARD_W   = W - CARD_M * 2;
  const CARD_H   = H - CARD_M * 2;
  page.drawRectangle({
    x: CARD_M, y: CARD_M, width: CARD_W, height: CARD_H,
    borderColor: bColor, borderWidth: 2, color: rgb(0,0,0), opacity: 0,
  });

  // ── Top & bottom stripe (gradient) ────────────────────────────────────────
  const { from: sf, to: st } = gradientColors(stripeGradient);
  const STRIPE_H = 8;
  drawGradientRect(page, CARD_M, H - CARD_M - STRIPE_H, CARD_W, STRIPE_H, sf, st);
  drawGradientRect(page, CARD_M, CARD_M, CARD_W, STRIPE_H, sf, st);

  // ── Corner accents ────────────────────────────────────────────────────────
  const CORNER = 28, CO = CARD_M + 12, CW = 2;
  const corners = [
    // top-left
    { x: CO,             y: H - CO - CORNER, w: CORNER, h: CW   }, // top
    { x: CO,             y: H - CO - CORNER, w: CW,     h: CORNER }, // left
    // top-right
    { x: W - CO - CORNER,y: H - CO - CORNER, w: CORNER, h: CW   },
    { x: W - CO - CW,    y: H - CO - CORNER, w: CW,     h: CORNER },
    // bottom-left
    { x: CO,             y: CO,              w: CORNER, h: CW   },
    { x: CO,             y: CO,              w: CW,     h: CORNER },
    // bottom-right
    { x: W - CO - CORNER,y: CO,              w: CORNER, h: CW   },
    { x: W - CO - CW,    y: CO,              w: CW,     h: CORNER },
  ];
  corners.forEach(c =>
    page.drawRectangle({ ...c, color: parseColor(accentColor), opacity: 0.55 })
  );

  // ── Fonts ─────────────────────────────────────────────────────────────────
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const accent  = parseColor(accentColor);
  const txtColor= parseColor(textColor);
  const white   = rgb(1, 1, 1);

  // Helper: draw centered text at a given Y from the bottom
  const centerText = (text, font, size, color, y, opacity = 1) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (W - tw) / 2, y,
      font, size, color, opacity,
    });
  };

  // ── Divider bar ───────────────────────────────────────────────────────────
  const DIV_Y = H * 0.655;
  drawGradientRect(page, (W - 60) / 2, DIV_Y, 60, 2, sf, st);

  // ── Text layers (top → bottom in PDF coords = high Y → low Y) ────────────
  // Org name
  centerText(org.toUpperCase(), fontBold, 11, accent, H * 0.685, 1);

  // Certificate title
  centerText(certTitle, fontBold, 34, white, H * 0.595);

  // "This is to certify that"
  centerText("This is to certify that", fontRegular, 13, accent, H * 0.535, 0.75);

  // Recipient name
  centerText(name, fontBold, 42, accent, H * 0.45);

  // "has successfully completed"
  centerText("has successfully completed", fontRegular, 13, accent, H * 0.39, 0.65);

  // Training name
  centerText(training, fontBold, 24, white, H * 0.335);

  // Date range
  if (dateRange) {
    centerText(dateRange, fontRegular, 12, accent, H * 0.285, 0.55);
  }

  // ── Signatories ───────────────────────────────────────────────────────────
  if (signatories.length > 0) {
    const SIG_Y    = H * 0.19;
    const SIG_LINE = 80;
    const sigLeft  = signatories.filter(s => s.position === "left");
    const sigCenter= signatories.filter(s => s.position === "center");
    const sigRight = signatories.filter(s => s.position === "right");
    const hasPos   = signatories.some(s => s.position);
    const all      = hasPos ? null : signatories;

    const drawSig = async (sg, cx) => {
      // Signature image (base64)
      if (sg.imageBase64) {
        try {
          const b64data = sg.imageBase64.replace(/^data:image\/\w+;base64,/, "");
          const imgBytes = Buffer.from(b64data, "base64");
          const img = sg.imageBase64.includes("image/png")
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
          const iW = Math.min(img.width, 100);
          const iH = (img.height / img.width) * iW;
          page.drawImage(img, { x: cx - iW / 2, y: SIG_Y + 16, width: iW, height: iH, opacity: 0.85 });
        } catch { /* skip broken image */ }
      } else {
        // Signature line
        page.drawRectangle({ x: cx - SIG_LINE / 2, y: SIG_Y + 14, width: SIG_LINE, height: 1.5, color: accent, opacity: 0.5 });
      }
      // Name label
      const nw = fontBold.widthOfTextAtSize(sg.name || "Signatory", 10);
      page.drawText(sg.name || "Signatory", { x: cx - nw / 2, y: SIG_Y, font: fontBold, size: 10, color: accent });
    };

    if (all) {
      // All centered with spacing
      const spacing = 160;
      const startX  = W / 2 - ((all.length - 1) * spacing) / 2;
      for (let i = 0; i < all.length; i++) await drawSig(all[i], startX + i * spacing);
    } else {
      const colX = { left: W * 0.2, center: W * 0.5, right: W * 0.8 };
      for (const sg of sigLeft)   await drawSig(sg, colX.left);
      for (const sg of sigCenter) await drawSig(sg, colX.center);
      for (const sg of sigRight)  await drawSig(sg, colX.right);
    }
  }

  return pdfDoc.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate a single certificate PDF and write to disk
// ─────────────────────────────────────────────────────────────────────────────

const generateOneCertificate = async (employee, batch, styleConfig) => {
  const filename = buildFilename(employee.employeeName, batch.trainingName);
  const outPath  = path.join(getCertDir(), filename);

  try {
    const pdfBytes = await buildCertificatePDF(employee, batch, styleConfig);
    fs.writeFileSync(outPath, pdfBytes);
    console.log(`✅ PDF Generated (pdf-lib): ${outPath}`);
    return { success: true, filename, path: outPath };
  } catch (err) {
    console.error(`❌ PDF Generation Error for ${employee.employeeName}:`, err);
    return { success: false, filename, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate certificates for all VALID employees in a batch
// No browser, no Chrome, no network — pure Node.js
// ─────────────────────────────────────────────────────────────────────────────

const generateBatchCertificates = async (batchId, styleConfig = {}) => {
  const batch = await Batch.findOne({ batchId });
  if (!batch) throw new Error(`Batch not found: ${batchId}`);

  const employees = await Employee.find({ batchId, validationStatus: "VALID" });
  if (employees.length === 0) {
    return { batchId, total: 0, generated: 0, failed: 0, files: [], message: "No valid employees found." };
  }

  console.log(`\n🖨️  Generating ${employees.length} certificates (pdf-lib — no browser needed)...`);

  let generated = 0, failed = 0;
  const results = [];

  for (const employee of employees) {
    const result = await generateOneCertificate(employee, batch, styleConfig);
    results.push(result);
    if (result.success) {
      generated++;
      await Employee.findByIdAndUpdate(employee._id, { certificateStatus: "GENERATED" });
      console.log(`  ✓ ${result.filename}`);
    } else {
      failed++;
      console.error(`  ✗ ${result.filename}: ${result.error}`);
    }
  }

  if (generated > 0) {
    await Batch.findOneAndUpdate({ batchId }, { status: "certificates_generated" });
  }

  console.log(`✓ Done — ${generated} generated, ${failed} failed`);

  return {
    batchId,
    total: employees.length,
    generated,
    failed,
    files: results.map(r => ({ filename: r.filename, success: r.success, error: r.error || null })),
    message: `Generated ${generated} of ${employees.length} certificates.`,
  };
};

module.exports = { generateBatchCertificates, buildFilename };