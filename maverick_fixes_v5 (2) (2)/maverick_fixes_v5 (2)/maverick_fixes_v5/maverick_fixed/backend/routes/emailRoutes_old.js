const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const {
  sendBatchEmails,
  getBatchEmailLogs,
  verifyTransporter,
  sendLinkedInReminders,
  emailAgent,
} = require("../services/emailService");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/email/generate-template
// Generates email subject + body using LLM, supports feedback and variations
// Mode: "quick" for simple template, "detailed" for LLM-optimized options
// ─────────────────────────────────────────────────────────────────────────────
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
    const batchData = { trainingName, organization: organisation, trainingStartDate, trainingEndDate };

    // Quick mode: use basic fallback templates
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

    // Detailed mode: use LLM with options for refinement and variations
    const result = await emailAgent.generateWithContext(batchData, feedback, requestVariations);

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
// Returns a default LinkedIn post text and a share URL (opens LinkedIn share dialog)
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/email/send/:batchId
// ─────────────────────────────────────────────────────────────────────────────
// Triggers the full email dispatch for all VALID employees in the batch.
// Recipient emails are fetched from MongoDB — no manual input required.
//
// Response:
//   200 — { success, data: { batchId, sent, failed, totalValid, logs } }
//   404 — batch not found
//   500 — SMTP or server error
// ─────────────────────────────────────────────────────────────────────────────
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

    const { subject, body } = req.body || {};
    const result = await sendBatchEmails(batchId.trim(), subject, body);

    console.log(
      `✓ Dispatch complete — Sent: ${result.sent}, Failed: ${result.failed}`,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("❌ Email dispatch error:", error.message);

    // Distinguish "batch not found" from other errors
    if (error.message && error.message.startsWith("Batch not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    // SMTP auth / connection errors are surfaced clearly
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/email/logs/:batchId
// ─────────────────────────────────────────────────────────────────────────────
// Returns all EmailLog documents for the batch — used by the tracking UI.
//
// Response:
//   200 — { success, data: { batchId, total, sent, failed, logs[] } }
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/email/verify
// ─────────────────────────────────────────────────────────────────────────────
// Health-checks the SMTP connection — useful for the settings / admin UI.
//
// Response:
//   200 — { success: true, message: "SMTP connection verified" }
//   503 — { success: false, message: "SMTP connection failed", detail }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/verify", async (req, res) => {
  try {
    await verifyTransporter();
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/email/linkedin-posted/:employeeId
// Called when employee confirms they posted on LinkedIn
// ─────────────────────────────────────────────────────────────────────────────
router.post("/linkedin-posted/:employeeId", async (req, res) => {
  try {
    const Employee = require("../models/Employee");
    const employee = await Employee.findOneAndUpdate(
      { employeeId: req.params.employeeId },
      { linkedInPosted: true },
      { returnDocument: "after" },
    );
    if (!employee)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    return res.json({ success: true, message: "LinkedIn post status updated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/email/send-reminders
// Manually trigger LinkedIn reminders (also runs on cron)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/send-reminders", async (req, res) => {
  try {
    const result = await sendLinkedInReminders();
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/email/send-reminder
// Send a LinkedIn reminder to a single employee and persist the count in MongoDB
//
// Body: { employeeId, batchId }
//
// Response:
//   200 — { success: true, data: { employeeId, linkedInReminderCount } }
//   404 — employee or batch not found
//   500 — email / server error
// ─────────────────────────────────────────────────────────────────────────────
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
    const { sendCertificateEmail } = require("../services/emailService");

    const employee = await Employee.findOne({ employeeId, batchId });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Send the reminder email
    await sendCertificateEmail(employee, batch, null, null, true);

    // Persist the incremented reminder count in MongoDB
    const updated = await Employee.findByIdAndUpdate(
      employee._id,
      {
        $inc: { linkedInReminderCount: 1 },
        lastReminderSentAt: new Date(),
      },
      { returnDocument: "after" },
    );

    console.log(
      `✓ Reminder sent to ${employee.employeeName} — count: ${updated.linkedInReminderCount}`,
    );

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/email/share/linkedin/:shareData
// Public endpoint for LinkedIn share links in emails
// Uses LinkedIn Share Dialog API for seamless sharing with pre-filled content
// ─────────────────────────────────────────────────────────────────────────────
router.get("/share/linkedin/:shareData", (req, res) => {
  try {
    const { shareData } = req.params;
    const decoded = Buffer.from(shareData, 'base64').toString('utf8');
    const { postText, employeeId, batchId } = JSON.parse(decoded);

    if (!postText) {
      return res.status(400).json({ success: false, message: 'Invalid share data' });
    }

    // Sanitize text for HTML attributes and JavaScript
    const sanitizedText = postText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    const pageUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email/share/linkedin/${shareData}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta property="og:title" content="My Achievement - Maverick Certify">
          <meta property="og:description" content="${sanitizedText}">
          <meta property="og:type" content="article">
          <meta property="og:url" content="${pageUrl}">
          <title>Share on LinkedIn - Maverick Certify</title>
          <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 40px;
              text-align: center;
            }
            h1 { color: #333; margin-bottom: 12px; font-size: 24px; }
            p { color: #666; margin-bottom: 24px; font-size: 14px; line-height: 1.6; }
            .post-preview {
              background: #f5f5f5;
              border-left: 4px solid #0077b5;
              padding: 16px;
              border-radius: 6px;
              margin-bottom: 24px;
              text-align: left;
              font-size: 13px;
              color: #333;
              max-height: 120px;
              overflow-y: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .button {
              display: inline-block;
              background: #0077b5;
              color: white;
              padding: 12px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              border: none;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.3s;
            }
            .button:hover { background: #006399; }
            .button:disabled { background: #ccc; cursor: not-allowed; }
            .spinner {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid #f3f3f3;
              border-top: 2px solid #0077b5;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-right: 8px;
              vertical-align: middle;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .status { margin-top: 16px; font-weight: 600; }
            .status.loading { color: #0077b5; }
            .status.success { color: #28a745; }
            .status.error { color: #dc3545; }
            .info {
              background: #e7f3ff;
              border: 1px solid #b3d9ff;
              color: #004085;
              padding: 12px;
              border-radius: 6px;
              font-size: 12px;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Share Your Achievement</h1>
            <p>One click to share your certificate on LinkedIn!</p>

            <div class="post-preview">${sanitizedText}</div>

            <button id="shareBtn" class="button" onclick="handleLinkedInShare()">
              <span class="spinner" style="display:none;" id="spinner"></span>
              <span id="btnText">Share on LinkedIn</span>
            </button>

            <div class="status" id="status"></div>

            <div class="info">
              <strong>💡 What happens next:</strong> LinkedIn will open in a new window. The post content will be ready in the compose area. Just click "Post" to share!
            </div>
          </div>

          <script>
            const postText = \`${postText.replace(/\`/g, '\\`')}\`;
            const employeeId = "${employeeId}";
            const batchId = "${batchId}";
            const pageUrl = "${pageUrl}";

            async function handleLinkedInShare() {
              const btn = document.getElementById('shareBtn');
              const spinner = document.getElementById('spinner');
              const btnText = document.getElementById('btnText');
              const status = document.getElementById('status');

              btn.disabled = true;
              spinner.style.display = 'inline-block';
              status.textContent = '';

              try {
                // First, copy content to clipboard
                await navigator.clipboard.writeText(postText);

                // Show loading status
                status.className = 'status loading';
                status.innerHTML = '<span class="spinner"></span>Opening LinkedIn...';

                // Wait a bit then open LinkedIn share with the page as URL
                setTimeout(() => {
                  // LinkedIn will use the og:description meta tag from this page
                  const linkedinShareUrl = \`https://www.linkedin.com/sharing/share-offsite/?url=\${encodeURIComponent(pageUrl)}\`;

                  const linkedinWindow = window.open(linkedinShareUrl, 'linkedin_share', 'width=550,height=650');

                  if (linkedinWindow) {
                    linkedinWindow.focus();

                    // Show success message
                    status.className = 'status success';
                    status.innerHTML = '✓ LinkedIn opened! Content is ready to paste.';
                    btnText.textContent = 'Shared!';

                    // Mark as posted (optional)
                    if (employeeId) {
                      fetch('/api/email/linkedin-posted/' + employeeId, { method: 'POST' })
                        .catch(err => console.log('Note: Could not update post status'));
                    }
                  } else {
                    throw new Error('LinkedIn window blocked');
                  }
                }, 300);
              } catch (err) {
                console.error('Error:', err);
                status.className = 'status error';
                status.innerHTML = '❌ ' + (err.message === 'LinkedIn window blocked'
                  ? 'LinkedIn blocked. Please disable pop-up blockers.'
                  : 'Failed to share. Please try again.');
                btn.disabled = false;
                spinner.style.display = 'none';
                btnText.textContent = 'Share on LinkedIn';
              }
            }

            // Auto-trigger share on page load
            window.addEventListener('load', () => {
              setTimeout(() => handleLinkedInShare(), 800);
            });
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('❌ Share endpoint error:', err.message);
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invalid Link</title>
          <style>
            body { font-family: sans-serif; background: #f5f5f5; padding: 40px; text-align: center; }
            .error { background: white; padding: 40px; border-radius: 8px; max-width: 400px; margin: 0 auto; }
            h1 { color: #d32f2f; margin-bottom: 16px; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Invalid Share Link</h1>
            <p>The share link is invalid or has expired. Please contact your administrator.</p>
          </div>
        </body>
      </html>
    `);
  }
});

module.exports = router;
