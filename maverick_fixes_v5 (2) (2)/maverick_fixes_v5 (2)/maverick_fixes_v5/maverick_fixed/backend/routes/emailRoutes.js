const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const {
  sendBatchEmails,
  getBatchEmailLogs,
  verifyTransporter,
  sendLinkedInReminders,
  emailAgent,
  getReminderRules,
  getReminderEmailContent,
  sendCertificateEmail,
} = require("../services/emailService");
const { logActivity } = require("../utils/auditLogger");

let groq = null;
try {
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️  GROQ_API_KEY not set — AI email generation will use fallback mode.");
  } else {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
} catch (err) {
  console.warn("⚠️  Failed to initialize Groq:", err.message);
}

// POST /api/email/generate-template
router.post("/generate-template", async (req, res) => {
  const {
    trainingName,
    organisation,
    trainingStartDate,
    trainingEndDate,
    customPrompt,
    feedback,
    requestVariations = false,
    mode = "detailed",
  } = req.body;
  try {
    const Batch = require("../models/Batch");
    const batchData = {
      trainingName,
      organization: organisation,
      trainingStartDate,
      trainingEndDate,
    };

    if (mode === "quick") {
      return res.json({
        success: true,
        data: {
          subject: `🎓 Your ${trainingName} certificate is ready!`,
          body:
            `Dear {{first_name}},\n\n` +
            `Congratulations on completing ${trainingName}!\n\n` +
            `Your certificate is attached as a PDF. Share your achievement on LinkedIn!\n\n` +
            `Best Regards,\n${organisation}`,
          alternatives: [],
          mode: "quick",
        },
      });
    }

    if (!groq) {
      // No API key — return a sensible fallback rather than crashing
      return res.json({
        success: true,
        data: {
          subject: `🎓 Your ${trainingName || "Training"} Certificate is Ready!`,
          body:
            `Dear {{first_name}},\n\n` +
            `Congratulations on successfully completing ${trainingName || "your training"} at ${organisation || "our organisation"}!\n\n` +
            `Please find your certificate of completion attached to this email.\n\n` +
            `We encourage you to share this achievement on LinkedIn to celebrate your growth!\n\n` +
            `Best Regards,\n${organisation || "The Training Team"}`,
          alternatives: [],
          mode: "fallback",
        },
      });
    }

    const result = await emailAgent.generateWithContext(
      batchData,
      feedback,
      requestVariations,
    );

    return res.json({
      success: true,
      data: {
        ...result,
        mode: "detailed",
      },
    });
  } catch (err) {
    console.error("Email template generation failed:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/generate-linkedin
router.post("/generate-linkedin", async (req, res) => {
  try {
    const { batchId, subject, body, employeeId } = req.body || {};
    const Batch = require("../models/Batch");
    const batch = await Batch.findOne({ batchId });
    if (!batch)
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });

    const Employee = require("../models/Employee");
    const employee = employeeId ? await Employee.findOne({ employeeId }) : null;

    const { generateLinkedInContent } = require("../services/emailService");
    const content = generateLinkedInContent(employee, batch, subject, body);
    return res.json({ success: true, data: content });
  } catch (err) {
    console.error("❌ generate-linkedin failed:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/send/:batchId
router.post("/send/:batchId", async (req, res) => {
  const { batchId } = req.params;

  if (!batchId || !batchId.trim()) {
    return res.status(400).json({
      success: false,
      message: "batchId is required",
    });
  }

  try {
    console.log(`\n📧 Email dispatch requested for batch: ${batchId}`);

    const { subject, body, userName } = req.body || {};
    const result = await sendBatchEmails(batchId.trim(), subject, body);

    console.log(
      `✓ Dispatch complete — Sent: ${result.sent}, Failed: ${result.failed}`,
    );

    // ── Audit log ──────────────────────────────────────────────────────────────
    await logActivity({
      userName: userName || "Coordinator",
      action: `Sent bulk emails to ${result.sent} candidates for batch ${batchId.trim()}`,
      type: "email",
      meta: {
        batchId: batchId.trim(),
        sent: result.sent,
        failed: result.failed,
      },
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("❌ Email dispatch error:", error.message);

    if (error.message && error.message.startsWith("Batch not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message &&
      (error.message.includes("Invalid login") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("535"))
    ) {
      return res.status(503).json({
        success: false,
        message:
          "SMTP connection failed. Check EMAIL_USER and EMAIL_PASS environment variables.",
        detail: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Email dispatch failed",
      detail: error.message,
    });
  }
});

// GET /api/email/logs/:batchId
router.get("/logs/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    const data = await getBatchEmailLogs(batchId.trim());
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching email logs:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email logs",
      detail: error.message,
    });
  }
});

// GET /api/email/verify
router.get("/verify", async (req, res) => {
  try {
    await verifyTransporter();
    // Log the test email event so system-health can show "Last Test Email"
    await logActivity({
      userName: "Admin",
      action: "Sent test email — SMTP connection verified",
      type: "settings",
      meta: { result: "success" },
    });
    return res.status(200).json({
      success: true,
      message: "SMTP connection verified",
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "SMTP connection failed",
      detail: error.message,
    });
  }
});

// POST /api/email/linkedin-posted/:employeeId
// This endpoint is intentionally a no-op.
// LinkedIn status is ONLY updated via the coordinator action:
//   PATCH /api/employees/:id/linkedin  (with confirmed:true)
// That is the single source of truth and the only place that writes audit logs.
// Keeping this route to avoid 404s from legacy share-page calls.
router.post("/linkedin-posted/:employeeId", async (req, res) => {
  return res.json({
    success: true,
    message: "No action — use coordinator dashboard to confirm LinkedIn post",
  });
});

// POST /api/email/send-reminders
router.post("/send-reminders", async (req, res) => {
  try {
    const result = await sendLinkedInReminders();
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/send-reminder
router.post("/send-reminder", async (req, res) => {
  const { employeeId, batchId } = req.body || {};

  if (!employeeId || !batchId) {
    return res
      .status(400)
      .json({ success: false, message: "employeeId and batchId are required" });
  }

  try {
    const Employee = require("../models/Employee");
    const Batch = require("../models/Batch");

    const employee = await Employee.findOne({ employeeId, batchId });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // If already posted (either field), no reminders needed
    if (
      employee.linkedInPosted === true ||
      employee.linkedinStatus === "POSTED"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Employee has already posted on LinkedIn",
        });
    }

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Load live reminder rules from DB
    const rules = await getReminderRules();
    const { maximumReminders, reminderTone, autoClosePolicy } = rules;

    // Enforce max reminders
    if (employee.linkedInReminderCount >= maximumReminders) {
      // Mark status if not already done
      await Employee.findByIdAndUpdate(employee._id, {
        linkedinStatus: "Reminder Limit Reached",
      });
      return res.status(400).json({
        success: false,
        message: `Maximum reminders (${maximumReminders}) already reached for this employee`,
      });
    }

    // Generate tone-based reminder content
    const { subject, body } = getReminderEmailContent(
      employee,
      batch,
      reminderTone,
    );
    await sendCertificateEmail(employee, batch, subject, body, true);

    const newCount = employee.linkedInReminderCount + 1;
    const statusUpdate = {
      $inc: { linkedInReminderCount: 1 },
      lastReminderSentAt: new Date(),
    };

    const updated = await Employee.findByIdAndUpdate(
      employee._id,
      statusUpdate,
      { returnDocument: "after" },
    );

    console.log(
      `✓ Reminder sent to ${employee.employeeName} — count: ${updated.linkedInReminderCount}, tone: ${reminderTone}`,
    );

    // ── Audit log ────────────────────────────────────────────────────────────
    await logActivity({
      userName: req.body?.userName || "Coordinator",
      action: `Sent LinkedIn reminder to ${employee.employeeName} (batch: ${batchId}, tone: ${reminderTone})`,
      type: "reminder",
      meta: {
        employeeId,
        batchId,
        reminderTone,
        reminderCount: updated.linkedInReminderCount,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        employeeId: updated.employeeId,
        linkedInReminderCount: updated.linkedInReminderCount,
      },
    });
  } catch (err) {
    console.error("❌ send-reminder error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/email/share/linkedin/:shareData
// Serves the "Post to LinkedIn" page.
// Uses a plain <a> link to open LinkedIn — avoids all pop-up blocker issues.
// The "Confirm I Posted" button is ONLY here (not in the email) to keep one clear flow.
router.get("/share/linkedin/:shareData", (req, res) => {
  try {
    const { shareData } = req.params;
    const decoded = Buffer.from(shareData, "base64").toString("utf8");
    const { postText, employeeId, batchId } = JSON.parse(decoded);

    if (!postText) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid share data" });
    }

    // HTML-safe version for display
    const sanitizedText = postText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    // JS-safe version for inline <script>
    const jsPostText = postText
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    // Absolute confirm URL — backend served, no React
    const backendBase = process.env.BACKEND_URL || "http://localhost:5000";
    const confirmUrl = `${backendBase}/api/linkedin/confirm/${shareData}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Share Achievement on LinkedIn</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;
     background:linear-gradient(135deg,#0077b5 0%,#005885 100%);
     min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.container{background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);
           max-width:580px;width:100%;overflow:hidden;}
.header{background:linear-gradient(135deg,#0077b5,#005885);padding:24px 28px;color:#fff;}
.header h1{margin:0;font-size:21px;font-weight:700;margin-bottom:4px;}
.header p{margin:0;font-size:13px;opacity:.88;}
.body{padding:24px 28px;}
/* Steps hint */
.hint{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
      padding:13px 16px;font-size:13px;color:#1e40af;line-height:1.7;margin-bottom:18px;}
.hint strong{font-weight:700;}
/* Post text box */
.post-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
            color:#94a3b8;margin-bottom:7px;display:block;}
.post-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
          padding:14px 16px;font-size:14px;color:#1e293b;white-space:pre-wrap;
          word-wrap:break-word;line-height:1.65;min-height:90px;margin-bottom:18px;}
/* Buttons */
.btn-row{display:flex;gap:10px;margin-bottom:0;}
.btn{flex:1;padding:13px 18px;border:none;border-radius:9px;font-weight:700;font-size:14px;
     cursor:pointer;text-decoration:none;display:flex;align-items:center;
     justify-content:center;gap:8px;transition:filter .15s,transform .1s;}
.btn:active{transform:scale(.97);}
.btn-linkedin{background:#0077b5;color:#fff;}
.btn-linkedin:hover{filter:brightness(1.1);}
.btn-copy{background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;}
.btn-copy:hover{background:#e2e8f0;}
/* Confirm button — shown after LinkedIn link is clicked */
.btn-confirm{width:100%;margin-top:11px;padding:14px 18px;border:none;border-radius:9px;
             font-weight:700;font-size:14px;background:#16a34a;color:#fff;cursor:pointer;
             display:none;align-items:center;justify-content:center;gap:8px;
             text-decoration:none;transition:filter .15s,transform .1s;}
.btn-confirm.show{display:flex;}
.btn-confirm:hover{filter:brightness(1.1);}
/* Copied flash */
.flash{margin-top:10px;padding:10px 14px;border-radius:7px;font-size:13px;
       display:none;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;}
.flash.show{display:block;}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>&#128241; Post to LinkedIn</h1>
    <p>Your achievement is ready to share</p>
  </div>
  <div class="body">
    <div class="hint">
      <strong>Steps:</strong>
      1. Click <strong>Open LinkedIn</strong> &rarr;
      2. Click <strong>Start a post</strong> &rarr;
      3. Paste (Ctrl+V / Cmd+V) &rarr;
      4. Click <strong>Post</strong> &rarr;
      5. Come back here &amp; click <strong>&#10003;&nbsp;Yes, I Posted</strong>
    </div>
    <span class="post-label">Your Post</span>
    <div class="post-box" id="postBox">${sanitizedText}</div>
    <div class="btn-row">
      <!-- Plain anchor — opens in new tab with no pop-up blocker issues -->
      <a href="https://www.linkedin.com/feed/"
         target="_blank"
         rel="noopener"
         class="btn btn-linkedin"
         id="linkedinLink"
         onclick="onLinkedInClick()">
        &#128228; Open LinkedIn
      </a>
      <button class="btn btn-copy" onclick="copyText()">
        &#128203; Copy Text
      </button>
    </div>
    <div class="flash" id="flash"></div>
    <!-- Confirm button — only appears after they click Open LinkedIn or Copy -->
    <a href="${confirmUrl}"
       target="_blank"
       rel="noopener"
       class="btn-confirm"
       id="confirmBtn">
      &#10003; Yes, I Posted &mdash; Confirm my post
    </a>
  </div>
</div>

<script>
const POST_TEXT = \`${jsPostText}\`;

function onLinkedInClick() {
  // Copy to clipboard on the same user gesture as the link click
  tryCopy();
  // Show the confirm button after a short delay
  setTimeout(function() {
    var btn = document.getElementById('confirmBtn');
    btn.classList.add('show');
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 800);
}

function copyText() {
  tryCopy();
  showFlash('Post text copied to clipboard!');
  // Also reveal confirm button when they copy
  document.getElementById('confirmBtn').classList.add('show');
}

function tryCopy() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(POST_TEXT).catch(legacyCopy);
  } else {
    legacyCopy();
  }
}

function legacyCopy() {
  var ta = document.createElement('textarea');
  ta.value = POST_TEXT;
  ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

function showFlash(msg) {
  var f = document.getElementById('flash');
  f.textContent = msg;
  f.classList.add('show');
  setTimeout(function() { f.classList.remove('show'); }, 2200);
}
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Share error:", err.message);
    res.status(400)
      .send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invalid Link</title>
<style>body{font-family:sans-serif;background:#f5f5f5;padding:40px;text-align:center}
.e{background:#fff;padding:40px;border-radius:8px;max-width:400px;margin:0 auto}
h1{color:#d32f2f;margin-bottom:16px;font-size:24px}p{color:#666}</style>
</head><body><div class="e"><h1>Invalid Share Link</h1>
<p>The link is invalid or has expired. Please contact your administrator.</p>
</div></body></html>`);
  }
});

module.exports = router;