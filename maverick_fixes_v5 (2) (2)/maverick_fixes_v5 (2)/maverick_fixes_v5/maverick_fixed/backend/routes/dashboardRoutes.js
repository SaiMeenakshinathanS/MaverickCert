const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const AuditLog = require("../models/AuditLog");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats
// LinkedIn KPIs used by BOTH Admin and Coordinator dashboards.
//
// Returns:
//   linkedInSharedCount  — employees where linkedInPosted === true  (single source of truth)
//   yetToShareCount      — email-sent employees who have NOT posted
//   shareRate            — percentage of email-sent employees who posted
//
// NOTE: linkedInPosted is the only field consulted here.
// Share button clicks, clipboard copies, and LinkedIn page opens are NOT counted.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [agg] = await Employee.aggregate([
      { $match: { emailStatus: "SENT" } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          // Single source of truth: only linkedInPosted === true counts as shared
          linkedInSharedCount: {
            $sum: { $cond: [{ $eq: ["$linkedInPosted", true] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = agg || { totalSent: 0, linkedInSharedCount: 0 };
    const yetToShareCount = Math.max(
      0,
      stats.totalSent - stats.linkedInSharedCount,
    );
    const shareRate =
      stats.totalSent > 0
        ? Math.round((stats.linkedInSharedCount / stats.totalSent) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        linkedInSharedCount: stats.linkedInSharedCount,
        yetToShareCount,
        shareRate,
        totalEmailSent: stats.totalSent,
      },
    });
  } catch (err) {
    console.error("❌ Dashboard stats error:", err.message);
    return res.json({
      success: true,
      data: {
        linkedInSharedCount: 0,
        yetToShareCount: 0,
        shareRate: 0,
        totalEmailSent: 0,
      },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/recent-activity
// Returns the 10 most recent AuditLog entries, newest first.
// Used by the Admin Dashboard "Recent Activity" card.
//
// LinkedIn confirmations appear here as:
//   "Marked LinkedIn posted for {Employee Name}"  (type: "linkedin")
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-activity", async (req, res) => {
  try {
    const activities = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      success: true,
      data: activities,
    });
  } catch (err) {
    console.error("❌ Failed to fetch recent activities:", err.message);
    // Return empty array — never throw a 500 for a dashboard widget
    return res.json({ success: true, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/audit-logs
// Returns all AuditLog entries (for the full Audit Logs page).
// Supports optional ?type= and ?user= query filters.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.user)
      filter.userName = { $regex: req.query.user, $options: "i" };

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("❌ Failed to fetch audit logs:", err.message);
    return res.json({ success: true, data: [] });
  }
});

module.exports = router;
