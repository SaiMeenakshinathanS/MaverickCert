const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const EmailLog = require("../models/EmailLog");
const AuditLog = require("../models/AuditLog");

// GET /api/admin/system-health
// Returns focused, BRD-aligned data for the Email & System Settings page.
router.get("/system-health", async (req, res) => {
  try {
    // ── Database connectivity ──────────────────────────────────────────────────
    const databaseStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    // ── Last certificate email sent (type = "email" in auditlogs) ─────────────
    const lastCertEmailLog = await AuditLog.findOne({ type: "email" })
      .sort({ createdAt: -1 })
      .select("userName action createdAt")
      .lean();

    // ── Last reminder email sent (type = "reminder" in auditlogs) ─────────────
    const lastReminderLog = await AuditLog.findOne({ type: "reminder" })
      .sort({ createdAt: -1 })
      .select("userName action createdAt")
      .lean();

    // ── Last settings/config update ───────────────────────────────────────────
    const lastConfigUpdate = await AuditLog.findOne({
      type: { $in: ["settings", "user", "reminder"] },
    })
      .sort({ createdAt: -1 })
      .select("userName action createdAt")
      .lean();

    // ── Recent configuration activity (settings + user + reminder rule changes)
    const recentActivity = await AuditLog.find({
      type: { $in: ["settings", "user", "reminder"] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("userName action type createdAt")
      .lean();

    // ── Email volume summary (from emaillogs collection) ───────────────────────
    const [totalEmailsSent, totalEmailsFailed] = await Promise.all([
      EmailLog.countDocuments({ emailStatus: "SENT" }),
      EmailLog.countDocuments({ emailStatus: "FAILED" }),
    ]);

    return res.json({
      success: true,
      data: {
        databaseStatus,
        emailServiceProvider: "Nodemailer SMTP",
        emailServiceStatus: "Active",
        lastCertificateEmail: lastCertEmailLog?.createdAt || null,
        lastCertificateEmailBy: lastCertEmailLog?.userName || null,
        lastReminderEmail: lastReminderLog?.createdAt || null,
        lastReminderEmailBy: lastReminderLog?.userName || null,
        lastConfigUpdate: lastConfigUpdate?.createdAt || null,
        lastConfigUpdateBy: lastConfigUpdate?.userName || null,
        totalEmailsSent,
        totalEmailsFailed,
        recentActivity,
      },
    });
  } catch (err) {
    console.error("❌ system-health error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
