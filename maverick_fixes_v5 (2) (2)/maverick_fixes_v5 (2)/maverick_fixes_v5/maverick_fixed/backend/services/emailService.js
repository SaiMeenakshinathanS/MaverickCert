const { Resend } = require("resend");
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");

const Employee = require("../models/Employee");
const EmailLog = require("../models/EmailLog");
const Batch = require("../models/Batch");

// Initialize Groq with validation
let groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.warn(
      "⚠️  GROQ_API_KEY not set — LLM template generation will fail. Set it in .env",
    );
    groq = null;
  } else {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
} catch (err) {
  console.warn("⚠️  Failed to initialize Groq:", err.message);
  groq = null;
}

const HASHTAGS =
  "#Hexavarsity #RiseAndShine #AchievementUnlocked #ProudToBeAMaverick";

// Build a LinkedIn share URL with pre-filled post text via frontend share handler
// This generates a share token that the frontend will handle for pre-filling
const buildLinkedInShareUrl = (postText, employeeId, batchId) => {
  // Encode the post text and metadata into the URL
  const shareData = Buffer.from(
    JSON.stringify({ postText, employeeId, batchId }),
  ).toString("base64");
  return `/share/linkedin/${shareData}`;
};

// Generate LinkedIn post content and share URL for UI
const generateLinkedInContent = (employee, batch, subject, body) => {
  const name = employee ? employee.employeeName : "";
  const base = `🎓 Excited to share that I have successfully completed the ${batch.trainingName} training program at ${batch.organization}!`;
  const additional = `\n\n${subject || ""}`;
  const postText = `${base}${additional}\n\n${HASHTAGS}`.trim();
  const shareUrl = buildLinkedInShareUrl(
    postText,
    employee?.employeeId,
    batch.batchId,
  );
  return { postText, shareUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// Resend client (HTTPS port 443 — works through corporate firewalls)
// ─────────────────────────────────────────────────────────────────────────────

let resendClient = null;

const getResend = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in .env");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// No-op: Resend has no persistent connection to verify
const verifyTransporter = async () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in .env");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Groq Email Agent — called ONCE per batch, generates shared subject + body
// Enhanced with context-aware generation and variations
// ─────────────────────────────────────────────────────────────────────────────

const emailAgent = {
  async generate(batch) {
    const {
      trainingName,
      organization: organisation,
      trainingStartDate,
      trainingEndDate,
    } = batch;
    const startDate = new Date(trainingStartDate).toDateString();
    const endDate = new Date(trainingEndDate).toDateString();

    if (!groq) {
      console.warn("⚠️  Groq not initialized, using fallback template");
      return {
        subject: `🎓 Your ${trainingName} certificate is ready!`,
        body:
          `Hey {{first_name}},\n\n` +
          `Congratulations on completing ${trainingName} (${startDate} – ${endDate}).\n\n` +
          `Your certificate is attached as a PDF. Share your achievement on LinkedIn!\n\n` +
          `Best Regards,\n${organisation}`,
      };
    }

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You are an HR email writer. Write a warm, professional certificate dispatch email. " +
              'Return ONLY a JSON object with two keys: "subject" (string) and "body" (plain text string). ' +
              "Use {{first_name}} as placeholder for recipient name. " +
              "IMPORTANT: The greeting MUST start with 'Hey {{first_name}},' — never use 'Dear'. No markdown, no extra text.",
          },
          {
            role: "user",
            content:
              `Write a certificate completion email for:\n` +
              `- Training: ${trainingName}\n- Period: ${startDate} to ${endDate}\n- Organisation: ${organisation}\n` +
              `Use {{first_name}} for the name. Start with 'Hey {{first_name}},'. Congratulate them, mention the attached PDF, and encourage LinkedIn sharing. Be creative.`,
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      console.log("✓ Groq agent generated email template");
      return { subject: parsed.subject, body: parsed.body };
    } catch (err) {
      console.warn("⚠️  Groq agent failed, using fallback:", err.message);
      return {
        subject: `🎓 Your ${trainingName} certificate is ready!`,
        body:
          `Hey {{first_name}},\n\n` +
          `Congratulations on completing ${trainingName} (${startDate} – ${endDate}).\n\n` +
          `Your certificate is attached as a PDF. Share your achievement on LinkedIn!\n\n` +
          `Best Regards,\n${organisation}`,
      };
    }
  },

  async generateWithContext(batch, feedback = null, requestVariations = false, certTitle = null, certStyle = null) {
    const {
      trainingName,
      organization: organisation,
      trainingStartDate,
      trainingEndDate,
    } = batch;
    const startDate = new Date(trainingStartDate).toDateString();
    const endDate = new Date(trainingEndDate).toDateString();

    if (!groq) {
      console.warn("⚠️  Groq not initialized, using fallback template");
      return {
        subject: `🎓 Your ${trainingName} certificate is ready!`,
        body:
          `Hey {{first_name}},\n\n` +
          `Congratulations on completing ${trainingName} (${startDate} – ${endDate}).\n\n` +
          `Your ${certTitle || "Certificate of Completion"} is attached as a PDF. Share your achievement on LinkedIn!\n\n` +
          `Best Regards,\n${organisation}`,
        alternatives: [],
      };
    }

    try {
      const feedbackInstruction = feedback
        ? `\n\nPrevious feedback: "${feedback}"\nPlease adjust your response based on this feedback.`
        : "";

      const variationInstruction = requestVariations
        ? `\nAfter the main version, provide 2 alternative variations as an "alternatives" array with same structure.`
        : "";

      // Include the chosen certificate template context so the email is consistent with it
      const templateContext = certTitle || certStyle
        ? `\n- Certificate title: ${certTitle || "Certificate of Completion"}\n- Certificate style: ${certStyle || "modern"}`
        : "";

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You are an HR email writer. Write warm, professional certificate dispatch emails. " +
              `Return ONLY a JSON object with keys: "subject" (string), "body" (plain text).${variationInstruction ? ' If variations requested, include "alternatives": [{"subject": "", "body": ""}]' : ""} ` +
              "Use {{first_name}} as placeholder for recipient name. " +
              "IMPORTANT: The greeting MUST start with 'Hey {{first_name}},' — never use 'Dear'. No markdown, no extra text.",
          },
          {
            role: "user",
            content:
              `Write a certificate completion email for:\n` +
              `- Training: ${trainingName}\n- Period: ${startDate} to ${endDate}\n- Organisation: ${organisation}${templateContext}\n` +
              `Use {{first_name}} for the name. Start with 'Hey {{first_name}},'. Congratulate them, mention the attached PDF, and encourage LinkedIn sharing.${feedbackInstruction}${variationInstruction}`,
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      console.log("✓ Groq agent generated contextual email template");
      return {
        subject: parsed.subject,
        body: parsed.body,
        alternatives: parsed.alternatives || [],
      };
    } catch (err) {
      console.warn(
        "⚠️  Groq contextual generation failed, using fallback:",
        err.message,
      );
      return {
        subject: `🎓 Your ${trainingName} certificate is ready!`,
        body:
          `Hey {{first_name}},\n\n` +
          `Congratulations on completing ${trainingName} (${startDate} – ${endDate}).\n\n` +
          `Your certificate is attached as a PDF. Share your achievement on LinkedIn!\n\n` +
          `Best Regards,\n${organisation}`,
        alternatives: [],
      };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const buildCertificateFilename = (employee, batch) =>
  `${employee.employeeName.replace(/\s+/g, "_")}_${batch.trainingName.replace(/\s+/g, "_")}.pdf`;

const resolveCertificatePath = (filename) => {
  const fullPath = path.join(
    __dirname,
    "..",
    "uploads",
    "certificates",
    filename,
  );
  return fs.existsSync(fullPath) ? fullPath : null;
};

const personalise = (template, employee) =>
  template.replace(/\{\{first_name\}\}/g, employee.employeeName.split(" ")[0]);

const toHtml = (plainText, organisation, linkedInUrl) => {
  const lines = plainText
    .split("\n")
    .filter(Boolean)
    .map((l) => `<p>${l}</p>`)
    .join("");
  const backendBase = process.env.BACKEND_URL || "http://localhost:5000";

  // Share URL points to the backend share page which handles the full flow
  const absoluteShareUrl = linkedInUrl.startsWith("http")
    ? linkedInUrl
    : `${backendBase}/api/email${linkedInUrl}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0}
    .w{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .h{background:linear-gradient(135deg,#1e1b4b,#4f46e5);padding:28px 40px;text-align:center;color:#fff;font-size:20px;font-weight:700}
    .b{padding:28px 40px;color:#374151;line-height:1.8;font-size:15px}
    .li{margin:20px 0;text-align:center}
    .li a{display:inline-block;padding:14px 32px;background:#0077b5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px}
    .tags{text-align:center;padding:0 40px 16px;font-size:13px;color:#6366f1}
    .f{background:#f3f4f6;padding:16px 40px;text-align:center;font-size:12px;color:#9ca3af}
  </style></head><body>
  <div class="w">
    <div class="h">&#127891; Certificate of Completion</div>
    <div class="b">${lines}</div>
    <div class="li">
      <a href="${absoluteShareUrl}">&#128279; Share your achievement on LinkedIn</a>
    </div>
    <div class="tags">${HASHTAGS}</div>
    <div class="f">This is an automated message from ${organisation}. Please do not reply.</div>
  </div></body></html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core send — uses shared subject/body, personalises per employee
// ─────────────────────────────────────────────────────────────────────────────

const sendCertificateEmail = async (
  employee,
  batch,
  sharedSubject,
  sharedBody,
  isReminder = false,
) => {
  const filename = buildCertificateFilename(employee, batch);
  const certPath = resolveCertificatePath(filename);

  if (!certPath && !isReminder) {
    return {
      success: false,
      employeeId: employee.employeeId,
      email: employee.email,
      filename,
      error: `Certificate PDF not found: ${filename}`,
    };
  }

  // Build default LinkedIn post text
  const defaultPostText = `🎓 Excited to share that I have successfully completed the ${batch.trainingName} training program at ${batch.organization}!\n\n${HASHTAGS}`;
  const linkedInUrl = buildLinkedInShareUrl(
    defaultPostText,
    employee.employeeId,
    batch.batchId,
  );
  const subject = isReminder
    ? `⏰ Reminder: Share your ${batch.trainingName} certificate on LinkedIn!`
    : personalise(sharedSubject, employee);
  const plainText = isReminder
    ? `Hey ${employee.employeeName.split(" ")[0]},\n\nWe noticed you haven't shared your ${batch.trainingName} certificate on LinkedIn yet.\n\nDon't miss the chance to showcase your achievement!\n\n${HASHTAGS}\n\nBest Regards,\n${batch.organization}`
    : personalise(sharedBody, employee);

  const html = toHtml(plainText, batch.organization, linkedInUrl);

  // Build from address — Resend requires a verified domain sender.
  // Use EMAIL_FROM if set (e.g. "no-reply@yourdomain.com"), otherwise fall back
  // to the Resend sandbox address which works without domain verification.
  const fromAddress = process.env.EMAIL_FROM
    ? `"${batch.organization}" <${process.env.EMAIL_FROM}>`
    : "Maverick Certify <onboarding@resend.dev>";

  const attachments = [];
  if (certPath) {
    const fileBuffer = fs.readFileSync(certPath);
    attachments.push({
      filename,
      content: fileBuffer,         // Resend expects a Buffer, not a file path
    });
  }

  const { error } = await getResend().emails.send({
    from: fromAddress,
    to: employee.email,
    subject,
    text: plainText,
    html,
    attachments,
  });

  if (error) {
    throw new Error(error.message || "Resend API error");
  }

  return {
    success: true,
    employeeId: employee.employeeId,
    email: employee.email,
    filename,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Batch send orchestration
// ─────────────────────────────────────────────────────────────────────────────

const sendBatchEmails = async (batchId, subjectTemplate, bodyTemplate) => {
  await verifyTransporter();

  const batch = await Batch.findOne({ batchId });
  if (!batch) throw new Error(`Batch not found: ${batchId}`);

  const employees = await Employee.find({
    batchId,
    validationStatus: "VALID",
    emailStatus: { $ne: "SENT" },
  });

  if (employees.length === 0) {
    return {
      batchId,
      totalValid: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      logs: [],
      message: "No eligible employees found.",
    };
  }

  // Generate shared template once — use UI-provided or Groq-generated
  let sharedSubject = subjectTemplate;
  let sharedBody = bodyTemplate;
  if (!sharedSubject || !sharedBody) {
    const generated = await emailAgent.generateWithContext(batch);
    sharedSubject = sharedSubject || generated.subject;
    sharedBody = sharedBody || generated.body;
  }

  console.log(`📧 Sending with subject: "${sharedSubject}"`);

  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const employee of employees) {
    let result;
    try {
      result = await sendCertificateEmail(
        employee,
        batch,
        sharedSubject,
        sharedBody,
      );
    } catch (err) {
      result = {
        success: false,
        employeeId: employee.employeeId,
        email: employee.email,
        filename: buildCertificateFilename(employee, batch),
        error: err.message,
      };
    }

    const newStatus = result.success ? "SENT" : "FAILED";
    await Employee.findByIdAndUpdate(employee._id, {
      emailStatus: newStatus,
      ...(result.success && { certificateStatus: "SENT" }),
    });
    await EmailLog.create({
      batchId,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      email: employee.email,
      emailStatus: newStatus,
      sentAt: new Date(),
      failureReason: result.success ? null : result.error,
      certificateFile: result.filename,
    });

    result.success
      ? sentCount++
      : (failedCount++,
        console.error(`❌ ${employee.employeeName}: ${result.error}`));
    results.push({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      email: employee.email,
      status: newStatus,
      failureReason: result.success ? null : result.error,
    });
  }

  if (sentCount > 0) {
    await Batch.findOneAndUpdate(
      { batchId },
      { status: failedCount === 0 ? "emails_sent" : "certificates_generated" },
    );
  }

  return {
    batchId,
    totalValid: employees.length,
    sent: sentCount,
    failed: failedCount,
    skipped: 0,
    logs: results,
    message: `Email dispatch complete. Sent: ${sentCount}, Failed: ${failedCount}.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Reminder tone templates
// ─────────────────────────────────────────────────────────────────────────────

const getReminderEmailContent = (employee, batch, tone = "Friendly") => {
  const firstName = employee.employeeName.split(" ")[0];
  const trainingName = batch.trainingName;
  const org = batch.organization;

  const templates = {
    Friendly: {
      subject: `⏰ Reminder: Share your ${trainingName} certificate on LinkedIn!`,
      body:
        `Hi ${firstName},\n\n` +
        `Hope you're doing well.\n\n` +
        `We noticed that you have not yet shared your ${trainingName} achievement on LinkedIn.\n\n` +
        `We would love to see your accomplishment highlighted — it's a great way to showcase your growth!\n\n` +
        `${HASHTAGS}\n\n` +
        `Thank you.\n\nBest Regards,\n${org}`,
    },
    Formal: {
      subject: `Reminder: Please share your ${trainingName} certificate on LinkedIn`,
      body:
        `Hey ${firstName},\n\n` +
        `This is a reminder to share your ${trainingName} training completion certificate on LinkedIn.\n\n` +
        `Your participation and achievement are appreciated. Sharing your certificate helps highlight your professional development.\n\n` +
        `${HASHTAGS}\n\n` +
        `Regards,\nTraining Team\n${org}`,
    },
    Concise: {
      subject: `Action needed: Share your ${trainingName} certificate`,
      body:
        `Hi ${firstName},\n\n` +
        `Please share your ${trainingName} certificate on LinkedIn.\n\n` +
        `${HASHTAGS}\n\n` +
        `Thank you.\n${org}`,
    },
  };

  return templates[tone] || templates["Friendly"];
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-close logic — returns updated linkedinStatus or null if no change
// ─────────────────────────────────────────────────────────────────────────────

const evaluateAutoClose = (employee, rules) => {
  const { autoClosePolicy } = rules;
  const daysSinceCert = Math.floor(
    (new Date() - new Date(employee.createdAt)) / (24 * 60 * 60 * 1000),
  );

  if (autoClosePolicy === "After 30 days" && daysSinceCert >= 30) {
    return "Closed – Timeout";
  }
  if (autoClosePolicy === "After 60 days" && daysSinceCert >= 60) {
    return "Closed – Timeout";
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn reminder — driven entirely by ReminderRules from MongoDB
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RULES = {
  firstReminderAfter: 3,
  secondReminderAfter: 7,
  reminderInterval: 3, // NEW: interval between reminders after the second one
  maximumReminders: 3,
  reminderTone: "Friendly",
  autoClosePolicy: "Never",
};

const getReminderRules = async () => {
  try {
    const ReminderRules = require("../models/ReminderRules");
    const rules = await ReminderRules.findOne().lean();
    if (!rules) return DEFAULT_RULES;
    // Backfill reminderInterval for records saved before this field existed
    if (rules.reminderInterval == null) {
      rules.reminderInterval =
        rules.firstReminderAfter || DEFAULT_RULES.reminderInterval;
    }
    return rules;
  } catch (err) {
    console.warn(
      "⚠️  Could not load ReminderRules, using defaults:",
      err.message,
    );
    return DEFAULT_RULES;
  }
};

const sendLinkedInReminders = async () => {
  const rules = await getReminderRules();
  const {
    firstReminderAfter,
    secondReminderAfter,
    reminderInterval, // NEW: interval for reminders after the second one
    maximumReminders,
    reminderTone,
  } = rules;

  // Fallback: if reminderInterval not set (old record), use firstReminderAfter
  const interval = reminderInterval || firstReminderAfter;

  const now = new Date();

  // Find all employees who received cert email and haven't posted yet (check both fields)
  const candidates = await Employee.find({
    emailStatus: "SENT",
    linkedInPosted: { $ne: true },
    linkedinStatus: { $ne: "POSTED" },
  });

  if (candidates.length === 0) {
    console.log("✓ No LinkedIn reminders to send");
    return { sent: 0, failed: 0, skipped: 0, closed: 0 };
  }

  console.log(
    `📬 Evaluating ${candidates.length} LinkedIn reminder candidate(s)...`,
  );
  console.log(
    `   Rules: first=${firstReminderAfter}d, second=${secondReminderAfter}d, interval=${interval}d, max=${maximumReminders}, tone=${reminderTone}`,
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let closed = 0;

  for (const employee of candidates) {
    const daysSinceCert = Math.floor(
      (now - new Date(employee.createdAt)) / (24 * 60 * 60 * 1000),
    );

    // ── 1. Auto-close check ────────────────────────────────────────────────
    const closeStatus = evaluateAutoClose(employee, rules);
    if (closeStatus) {
      await Employee.findByIdAndUpdate(employee._id, {
        linkedinStatus: closeStatus,
      });
      console.log(`🔒 Auto-closed ${employee.employeeName}: ${closeStatus}`);
      closed++;
      continue;
    }

    // ── 2. Max reminders reached ───────────────────────────────────────────
    if (employee.linkedInReminderCount >= maximumReminders) {
      await Employee.findByIdAndUpdate(employee._id, {
        linkedinStatus: "Reminder Limit Reached",
      });
      console.log(`🚫 Max reminders reached for ${employee.employeeName}`);
      skipped++;
      continue;
    }

    // ── 3. Is a reminder due today? ────────────────────────────────────────
    // Schedule: Day firstReminderAfter, Day secondReminderAfter,
    // then every reminderInterval days after secondReminderAfter.
    // Example (first=4, second=8, interval=3): Day 4, 8, 11, 14, 17 ...
    let isDue = false;

    if (daysSinceCert === firstReminderAfter) {
      // First scheduled reminder
      isDue = true;
    } else if (daysSinceCert === secondReminderAfter) {
      // Second scheduled reminder
      isDue = true;
    } else if (daysSinceCert > secondReminderAfter) {
      // Continuing reminders: every reminderInterval days after secondReminderAfter
      const daysBeyondSecond = daysSinceCert - secondReminderAfter;
      isDue = daysBeyondSecond % interval === 0;
    }

    if (!isDue) {
      skipped++;
      continue;
    }

    // ── 4. Send reminder ───────────────────────────────────────────────────
    const batch = await Batch.findOne({ batchId: employee.batchId });
    if (!batch) {
      skipped++;
      continue;
    }

    try {
      const { subject, body } = getReminderEmailContent(
        employee,
        batch,
        reminderTone,
      );
      await sendCertificateEmail(employee, batch, subject, body, true);

      const newCount = employee.linkedInReminderCount + 1;
      const statusUpdate = {
        $inc: { linkedInReminderCount: 1 },
        lastReminderSentAt: now,
      };

      await Employee.findByIdAndUpdate(employee._id, statusUpdate);
      console.log(
        `✓ Reminder sent to ${employee.employeeName} (day ${daysSinceCert}, tone: ${reminderTone})`,
      );
      sent++;
    } catch (err) {
      console.error(
        `❌ Reminder failed for ${employee.employeeName}: ${err.message}`,
      );
      failed++;
    }
  }

  return { sent, failed, skipped, closed };
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch email logs
// ─────────────────────────────────────────────────────────────────────────────

const getBatchEmailLogs = async (batchId) => {
  const logs = await EmailLog.find({ batchId }).sort({ sentAt: -1 }).lean();
  const sent = logs.filter((l) => l.emailStatus === "SENT").length;
  const failed = logs.filter((l) => l.emailStatus === "FAILED").length;
  return { batchId, total: logs.length, sent, failed, logs };
};

module.exports = {
  sendBatchEmails,
  getBatchEmailLogs,
  verifyTransporter,
  sendLinkedInReminders,
  generateLinkedInContent,
  sendCertificateEmail,
  emailAgent,
  getReminderRules,
  getReminderEmailContent,
};