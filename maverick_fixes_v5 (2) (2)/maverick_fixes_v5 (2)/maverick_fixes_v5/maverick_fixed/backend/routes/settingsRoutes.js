const express = require("express");
const router = express.Router();
const { logActivity } = require("../utils/auditLogger");

// In-memory settings storage (in production, use MongoDB)
let appSettings = {
  linkedinReminderIntervalDays: 3,
  linkedinTrackingEnabled: true,
};

// GET /api/settings
router.get("/", (req, res) => {
  try {
    res.json({ success: true, data: appSettings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings
router.post("/", async (req, res) => {
  try {
    const { linkedinReminderIntervalDays, linkedinTrackingEnabled, userName } =
      req.body;

    if (linkedinReminderIntervalDays !== undefined) {
      appSettings.linkedinReminderIntervalDays = Math.max(
        1,
        Math.min(30, linkedinReminderIntervalDays),
      );
    }

    if (linkedinTrackingEnabled !== undefined) {
      appSettings.linkedinTrackingEnabled = linkedinTrackingEnabled;
    }

    console.log("✓ Settings updated:", appSettings);

    // ── Audit log ──────────────────────────────────────────────────────────────
    await logActivity({
      userName: userName || "Admin",
      action: `Updated system settings`,
      type: "settings",
      meta: { ...appSettings },
    });

    res.json({ success: true, data: appSettings, message: "Settings saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.getSettings = () => appSettings;
