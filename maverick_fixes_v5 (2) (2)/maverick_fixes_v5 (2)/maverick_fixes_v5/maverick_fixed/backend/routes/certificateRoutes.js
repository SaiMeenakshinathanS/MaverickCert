const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const Employee = require("../models/Employee");
const Batch = require("../models/Batch");
const { logActivity } = require("../utils/auditLogger");
const { generateBatchCertificates, buildFilename: svcBuildFilename } = require("../services/certificateService");

// ─────────────────────────────────────────────────────────────────────────────
// Initialization & Configuration
// ─────────────────────────────────────────────────────────────────────────────

let groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️  GROQ_API_KEY not set — LLM template generation will fail. Set it in .env");
    groq = null;
  } else {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
} catch (err) {
  console.warn("⚠️  Failed to initialize Groq:", err.message);
  groq = null;
}

const getCertDir = () => {
  const dir = path.join(__dirname, "..", "uploads", "certificates");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const sanitize = (value) => {
  return value.trim().replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
};

const buildFilename = (employeeName, trainingName) => {
  return `${sanitize(employeeName)}_${sanitize(trainingName)}.pdf`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation Helper
// ─────────────────────────────────────────────────────────────────────────────

const validateStyleConfig = (config) => {
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  const rgbaColorRegex = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
  const gradientRegex = /^(linear-gradient|radial-gradient|conic-gradient)/;
  const solidColorRegex = /^#[0-9A-F]{6}$/i;

  const required = ['title', 'bgGradient', 'accentColor', 'stripeGradient', 'borderColor', 'textColor', 'cornerStyle', 'decoration'];
  for (const field of required) {
    if (!config[field]) throw new Error(`Missing required field: ${field}`);
  }

  if (!hexColorRegex.test(config.accentColor)) throw new Error(`Invalid accentColor: ${config.accentColor}`);
  if (!hexColorRegex.test(config.textColor)) throw new Error(`Invalid textColor: ${config.textColor}`);
  if (!rgbaColorRegex.test(config.borderColor)) throw new Error(`Invalid borderColor: ${config.borderColor}`);

  if (!(gradientRegex.test(config.bgGradient) || solidColorRegex.test(config.bgGradient))) {
    throw new Error(`Invalid bgGradient: ${config.bgGradient}`);
  }
  if (!(gradientRegex.test(config.stripeGradient) || solidColorRegex.test(config.stripeGradient))) {
    throw new Error(`Invalid stripeGradient: ${config.stripeGradient}`);
  }

  const validCornerStyles = ['none', 'rounded', 'square', 'ornate'];
  if (!validCornerStyles.includes(config.cornerStyle)) throw new Error(`Invalid cornerStyle: ${config.cornerStyle}`);

  const validDecorations = ['lines', 'corners', 'double-border', 'ornate'];
  if (!validDecorations.includes(config.decoration)) throw new Error(`Invalid decoration: ${config.decoration}`);

  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoint Routes
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/certificates/generate-template
router.post("/generate-template", async (req, res) => {
  const {
    description,
    trainingName,
    organisation,
    conversationHistory,
    mode = "detailed"
  } = req.body;

  console.log(`🎨 Certificate template request: mode=${mode}, description="${description}"`);

  try {
    if (mode === "quick") {
      const keywords = (description || "").toLowerCase();
      let selectedStyle = "modern";

      if (keywords.includes("minimal") || keywords.includes("simple")) selectedStyle = "minimal";
      else if (keywords.includes("corporate") || keywords.includes("professional")) selectedStyle = "corporate";
      else if (keywords.includes("gold") || keywords.includes("premium")) selectedStyle = "gold";
      else if (keywords.includes("emerald") || keywords.includes("green")) selectedStyle = "emerald";
      else if (keywords.includes("rose") || keywords.includes("pink")) selectedStyle = "rose";

      return res.json({
        success: true,
        data: { style: selectedStyle, title: "Certificate of Completion", suggestions: [], followUp: null, mode: "quick" }
      });
    }

    if (!groq) {
      const keywords = (description || "").toLowerCase();
      let selectedStyle = "modern";
      if (keywords.includes("black") || keywords.includes("dark background")) selectedStyle = "black";
      else if (keywords.includes("plain") || keywords.includes("white background")) selectedStyle = "minimal";
      return res.json({ success: true, data: { style: selectedStyle, title: "Certificate of Completion", mode: "fallback" } });
    }

    const messages = conversationHistory && conversationHistory.length > 0 ? conversationHistory : [];
    const safeDescription = (description || "professional and elegant").replace(/"/g, '\\"').replace(/\n/g, ' ');

    messages.push({
      role: "user",
      content: `Design a custom certificate template based on this requirement:\n"${safeDescription}"\n\nFor: ${trainingName} at ${organisation}`
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a certificate design expert. Generate a custom certificate template design. Return ONLY valid JSON.\nFormat:\n{\n  "title": "Title",\n  "bgGradient": "#ffffff",\n  "accentColor": "#0078d7",\n  "stripeGradient": "#0078d7",\n  "borderColor": "rgba(0,120,215,0.4)",\n  "textColor": "#333333",\n  "cornerStyle": "rounded",\n  "decoration": "lines"\n}`
        },
        ...messages
      ]
    });

    let raw = completion.choices[0].message.content.trim();
    let parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    validateStyleConfig(parsed);

    return res.json({ success: true, data: { ...parsed, mode: "custom" } });
  } catch (err) {
    return res.json({ success: true, data: { style: "modern", title: "Certificate of Completion", mode: "fallback" } });
  }
});

// POST /api/certificates/generate/:batchId
router.post("/generate/:batchId", async (req, res) => {
  const { batchId } = req.params;
  const styleConfig = req.body?.styleConfig || {};
  const userName = req.body?.userName;

  if (!batchId?.trim()) {
    return res.status(400).json({ success: false, message: "batchId is required" });
  }

  try {
    console.log(`\n🖨️  Certificate generation requested for batch: ${batchId}${styleConfig.customDocxHtml ? " (custom docx template)" : ""}`);

    // Delegate entirely to certificateService — handles both canvas and customDocxHtml paths
    const result = await generateBatchCertificates(batchId.trim(), styleConfig);

    await logActivity({
      userName: userName || "Coordinator",
      action: `Generated ${result.generated} certificates for batch ${batchId}`,
      type: "certificate",
      meta: { batchId, generated: result.generated }
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    if (err.message?.startsWith("Batch not found")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Certificate generation failed", detail: err.message });
  }
});

// GET /api/certificates/download/:batchId/:employeeId
router.get("/download/:batchId/:employeeId", async (req, res) => {
  const { batchId, employeeId } = req.params;
  try {
    const [employee, batch] = await Promise.all([
      Employee.findOne({ batchId, employeeId }),
      Batch.findOne({ batchId })
    ]);

    if (!employee || !batch) return res.status(404).json({ success: false, message: "Not found" });

    const filename = svcBuildFilename(employee.employeeName, batch.trainingName);
    const certPath = path.join(__dirname, "..", "uploads", "certificates", filename);

    if (!fs.existsSync(certPath)) return res.status(404).json({ success: false, message: "File missing" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    fs.createReadStream(certPath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: "Download failed" });
  }
});

// CRITICAL EXPORT FOR EXPRESS APP.USE()
module.exports = router;