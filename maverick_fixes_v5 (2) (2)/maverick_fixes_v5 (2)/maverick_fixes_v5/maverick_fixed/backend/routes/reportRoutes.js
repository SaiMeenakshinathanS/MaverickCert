const express = require("express");
const router = express.Router();
const Batch = require("../models/Batch");
const Employee = require("../models/Employee");
const EmailLog = require("../models/EmailLog");

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn aggregation helper expression (reused across pipelines).
//
// SINGLE SOURCE OF TRUTH: linkedInPosted === true
// Do NOT use: share button clicks, LinkedIn page opens, clipboard copies,
//             linkedinStatus alone, or any other proxy metric.
// ─────────────────────────────────────────────────────────────────────────────
const LINKEDIN_POSTED_EXPR = {
  $cond: [{ $eq: ["$linkedInPosted", true] }, 1, 0],
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/overview
// Returns aggregated KPIs: total certs, emails sent/failed, linkedin stats
// ─────────────────────────────────────────────────────────────────────────────
router.get("/overview", async (req, res) => {
  try {
    const [empStats, emailStats] = await Promise.all([
      Employee.aggregate([
        { $match: { emailStatus: "SENT" } }, // only count sent-email employees everywhere
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            certGenerated: {
              $sum: {
                $cond: [
                  { $in: ["$certificateStatus", ["GENERATED", "SENT"]] },
                  1,
                  0,
                ],
              },
            },
            emailSent: { $sum: 1 }, // all docs in this stage have emailStatus=SENT
            // linkedInPosted === true is the single source of truth for LinkedIn sharing
            linkedinPosted: { $sum: LINKEDIN_POSTED_EXPR },
            remindersSent: { $sum: "$linkedInReminderCount" },
          },
        },
      ]),
      EmailLog.aggregate([
        {
          $group: {
            _id: "$emailStatus",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = empStats[0] || {
      totalEmployees: 0,
      certGenerated: 0,
      emailSent: 0,
      linkedinPosted: 0,
      remindersSent: 0,
    };

    const emailSentCount =
      emailStats.find((e) => e._id === "SENT")?.count || stats.emailSent;
    const emailFailedCount =
      emailStats.find((e) => e._id === "FAILED")?.count || 0;
    const totalEmails = emailSentCount + emailFailedCount;
    const openRate =
      totalEmails > 0 ? Math.round((emailSentCount / totalEmails) * 100) : 0;

    const pendingLinkedin = stats.emailSent - stats.linkedinPosted;
    const completionPct =
      stats.emailSent > 0
        ? Math.round((stats.linkedinPosted / stats.emailSent) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        totalCertificates: stats.certGenerated,
        totalEmployees: stats.totalEmployees,
        emailsDelivered: emailSentCount,
        emailsFailed: emailFailedCount,
        emailOpenRate: openRate,
        linkedinPosted: stats.linkedinPosted,
        linkedinPending: pendingLinkedin < 0 ? 0 : pendingLinkedin,
        remindersSent: stats.remindersSent,
        completionPercentage: completionPct,
      },
    });
  } catch (err) {
    console.error("Reports overview error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/batches
// Returns per-batch performance metrics
// ─────────────────────────────────────────────────────────────────────────────
router.get("/batches", async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      batches.map(async (b) => {
        const [empAgg] = await Employee.aggregate([
          { $match: { batchId: b.batchId, emailStatus: "SENT" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              emailSent: { $sum: 1 },
              // linkedInPosted === true is the single source of truth
              linkedinPosted: { $sum: LINKEDIN_POSTED_EXPR },
              certGenerated: {
                $sum: {
                  $cond: [
                    { $in: ["$certificateStatus", ["GENERATED", "SENT"]] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);

        const counts = empAgg || {
          total: 0,
          emailSent: 0,
          linkedinPosted: 0,
          certGenerated: 0,
        };
        const completionPct =
          counts.emailSent > 0
            ? Math.round((counts.linkedinPosted / counts.emailSent) * 100)
            : 0;

        return {
          batchId: b.batchId,
          trainingName: b.trainingName,
          organization: b.organization,
          startDate: b.trainingStartDate,
          endDate: b.trainingEndDate,
          status: b.status,
          totalEmployees: counts.total || b.totalEmployees || 0,
          validEmployees: b.validEmployees || counts.total || 0,
          certGenerated: counts.certGenerated,
          emailSent: counts.emailSent,
          linkedinPostedCount: counts.linkedinPosted,
          pendingCount: Math.max(0, counts.emailSent - counts.linkedinPosted),
          completionPercentage: completionPct,
          createdAt: b.createdAt,
        };
      }),
    );

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("Reports batches error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/linkedin
// LinkedIn-specific stats and per-batch breakdown.
//
// All counts are derived exclusively from linkedInPosted === true.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/linkedin", async (req, res) => {
  try {
    const [overall, perBatch] = await Promise.all([
      Employee.aggregate([
        { $match: { emailStatus: "SENT" } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: 1 },
            // Single source of truth: linkedInPosted === true
            posted: { $sum: LINKEDIN_POSTED_EXPR },
            // Reminded = sent at least one reminder AND not yet posted
            reminded: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$linkedInReminderCount", 0] },
                      { $ne: ["$linkedInPosted", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Employee.aggregate([
        { $match: { emailStatus: "SENT" } },
        {
          $group: {
            _id: "$batchId",
            total: { $sum: 1 },
            // Single source of truth: linkedInPosted === true
            posted: { $sum: LINKEDIN_POSTED_EXPR },
          },
        },
        {
          $lookup: {
            from: "batches",
            localField: "_id",
            foreignField: "batchId",
            as: "batchInfo",
          },
        },
        { $unwind: { path: "$batchInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            batchId: "$_id",
            trainingName: { $ifNull: ["$batchInfo.trainingName", "$_id"] },
            total: 1,
            posted: 1,
            pending: { $subtract: ["$total", "$posted"] },
            rate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$posted", "$total"] }, 100] },
                0,
              ],
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const g = overall[0] || { totalSent: 0, posted: 0, reminded: 0 };
    const pending = Math.max(0, g.totalSent - g.posted);
    const rate =
      g.totalSent > 0 ? Math.round((g.posted / g.totalSent) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalPosted: g.posted,
        totalPending: pending,
        totalReminded: g.reminded,
        overallRate: rate,
        perBatch: perBatch.map((b) => ({
          ...b,
          pending: Math.max(0, b.pending),
          rate: Math.round(b.rate),
        })),
      },
    });
  } catch (err) {
    console.error("Reports linkedin error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/trends
// Weekly certificate generation trend (last 8 weeks)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/trends", async (req, res) => {
  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const trend = await Employee.aggregate([
      { $match: { createdAt: { $gte: eightWeeksAgo } } },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$createdAt" },
            week: { $isoWeek: "$createdAt" },
          },
          certs: { $sum: 1 },
          emailsSent: {
            $sum: { $cond: [{ $eq: ["$emailStatus", "SENT"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      {
        $project: {
          _id: 0,
          // Monday of that ISO week — lets the frontend show a real,
          // human-readable date (e.g. "May 25") instead of "W21 '26".
          weekStart: {
            $dateFromParts: {
              isoWeekYear: "$_id.year",
              isoWeek: "$_id.week",
              isoDayOfWeek: 1,
            },
          },
          label: {
            $concat: [
              "W",
              { $toString: "$_id.week" },
              " '",
              { $substr: [{ $toString: "$_id.year" }, 2, 2] },
            ],
          },
          certs: 1,
          emailsSent: 1,
        },
      },
    ]);

    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error("Reports trends error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/email-stats
// Email delivery breakdown for pie chart
// ─────────────────────────────────────────────────────────────────────────────
router.get("/email-stats", async (req, res) => {
  try {
    const stats = await EmailLog.aggregate([
      {
        $group: {
          _id: "$emailStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Also get employees with email status for richer breakdown
    const empStats = await Employee.aggregate([
      {
        $group: {
          _id: "$emailStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const sent =
      stats.find((s) => s._id === "SENT")?.count ||
      empStats.find((s) => s._id === "SENT")?.count ||
      0;
    const failed =
      stats.find((s) => s._id === "FAILED")?.count ||
      empStats.find((s) => s._id === "FAILED")?.count ||
      0;
    const pending = empStats.find((s) => s._id === "PENDING")?.count || 0;
    const total = sent + failed + pending;
    const openRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    return res.json({
      success: true,
      data: {
        sent,
        failed,
        pending,
        total,
        openRate,
        breakdown: [
          { name: "Delivered", value: sent, color: "#10b981" },
          { name: "Failed", value: failed, color: "#ef4444" },
          { name: "Pending", value: pending, color: "#f59e0b" },
        ].filter((d) => d.value > 0),
      },
    });
  } catch (err) {
    console.error("Reports email-stats error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/certificates
// Returns all certificates (employees with cert status) with batch info
// ─────────────────────────────────────────────────────────────────────────────
router.get("/certificates", async (req, res) => {
  try {
    const { batchId, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (batchId) filter.batchId = batchId;
    if (status) filter.certificateStatus = status.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Employee.countDocuments(filter),
    ]);

    // Get batch info for all batchIds
    const batchIds = [...new Set(employees.map((e) => e.batchId))];
    const batches = await Batch.find({ batchId: { $in: batchIds } })
      .select(
        "batchId trainingName organization trainingStartDate trainingEndDate",
      )
      .lean();
    const batchMap = Object.fromEntries(batches.map((b) => [b.batchId, b]));

    const records = employees.map((e) => {
      const batch = batchMap[e.batchId] || {};
      return {
        _id: e._id,
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        employeeEmail: e.email,
        batchId: e.batchId,
        batchName: batch.trainingName || e.batchId,
        organization: batch.organization || "",
        certificateStatus: e.certificateStatus,
        emailStatus: e.emailStatus,
        // linkedInPosted is the single source of truth
        linkedInPosted: e.linkedInPosted,
        postedAt: e.postedAt,
        trainingStartDate: e.trainingStartDate || batch.trainingStartDate,
        trainingEndDate: e.trainingEndDate || batch.trainingEndDate,
        generatedDate: e.updatedAt,
        createdAt: e.createdAt,
      };
    });

    return res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Certificates list error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSV helper — converts array of objects to a CSV buffer using xlsx
// ─────────────────────────────────────────────────────────────────────────────
const XLSX = require("xlsx");

const toCSVBuffer = (rows) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  return XLSX.write(wb, { type: "buffer", bookType: "csv" });
};

const fmt = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export/certificates
// ─────────────────────────────────────────────────────────────────────────────
router.get("/export/certificates", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();
    const batchIds = [...new Set(employees.map((e) => e.batchId))];
    const batches = await Batch.find({ batchId: { $in: batchIds } }).lean();
    const batchMap = Object.fromEntries(batches.map((b) => [b.batchId, b]));

    const rows = employees.map((e) => ({
      "Batch ID": e.batchId,
      "Batch Name": batchMap[e.batchId]?.trainingName || e.batchId,
      "Candidate Name": e.employeeName,
      Email: e.email,
      "Certificate Status": e.certificateStatus || "PENDING",
      "Generated Date": fmt(e.updatedAt),
    }));

    const buf = toCSVBuffer(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate_report_${fmt(new Date())}.csv"`,
    );
    return res.send(buf);
  } catch (err) {
    console.error("Export certificates error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export/emails
// ─────────────────────────────────────────────────────────────────────────────
router.get("/export/emails", async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ sentAt: -1 }).lean();
    const batchIds = [...new Set(logs.map((l) => l.batchId))];
    const batches = await Batch.find({ batchId: { $in: batchIds } }).lean();
    const batchMap = Object.fromEntries(batches.map((b) => [b.batchId, b]));

    const rows = logs.map((l) => ({
      "Batch ID": l.batchId,
      "Batch Name": batchMap[l.batchId]?.trainingName || l.batchId,
      "Candidate Name": l.employeeName,
      Email: l.email,
      "Delivery Status": l.emailStatus,
      "Open Status": l.emailStatus === "SENT" ? "Delivered" : "Failed",
      "Sent Date": fmt(l.sentAt),
      "Failure Reason": l.failureReason || "",
    }));

    const buf = toCSVBuffer(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="email_analytics_${fmt(new Date())}.csv"`,
    );
    return res.send(buf);
  } catch (err) {
    console.error("Export emails error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export/linkedin
// LinkedIn Report CSV — status derived from linkedInPosted === true only
// ─────────────────────────────────────────────────────────────────────────────
router.get("/export/linkedin", async (req, res) => {
  try {
    const employees = await Employee.find({ emailStatus: "SENT" })
      .sort({ createdAt: -1 })
      .lean();
    const batchIds = [...new Set(employees.map((e) => e.batchId))];
    const batches = await Batch.find({ batchId: { $in: batchIds } }).lean();
    const batchMap = Object.fromEntries(batches.map((b) => [b.batchId, b]));

    const now = Date.now();
    const rows = employees.map((e) => {
      const emailSentMs = e.updatedAt ? new Date(e.updatedAt).getTime() : now;
      const daysSince = Math.floor((now - emailSentMs) / (1000 * 60 * 60 * 24));
      return {
        "Batch ID": e.batchId,
        "Batch Name": batchMap[e.batchId]?.trainingName || e.batchId,
        "Candidate Name": e.employeeName,
        Email: e.email,
        // Single source of truth: linkedInPosted === true
        "LinkedIn Status": e.linkedInPosted === true ? "Posted" : "Not Posted",
        "Posted At": fmt(e.postedAt),
        "Reminder Count": e.linkedInReminderCount || 0,
        "Last Reminder Sent": fmt(e.lastReminderSentAt),
        "Days Since Email": daysSince,
      };
    });

    const buf = toCSVBuffer(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="linkedin_report_${fmt(new Date())}.csv"`,
    );
    return res.send(buf);
  } catch (err) {
    console.error("Export linkedin error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export/full
// Full Report PDF via Puppeteer
// ─────────────────────────────────────────────────────────────────────────────
router.get("/export/full", async (req, res) => {
  const puppeteer = require("puppeteer");
  try {
    const [empStats] = await Employee.aggregate([
      { $match: { emailStatus: "SENT" } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          certGenerated: {
            $sum: {
              $cond: [
                { $in: ["$certificateStatus", ["GENERATED", "SENT"]] },
                1,
                0,
              ],
            },
          },
          emailSent: { $sum: 1 },
          // Single source of truth: linkedInPosted === true
          linkedinPosted: { $sum: LINKEDIN_POSTED_EXPR },
          remindersSent: { $sum: "$linkedInReminderCount" },
        },
      },
    ]);

    const s = empStats || {
      totalEmployees: 0,
      certGenerated: 0,
      emailSent: 0,
      linkedinPosted: 0,
      remindersSent: 0,
    };
    const pending = Math.max(0, s.emailSent - s.linkedinPosted);
    const shareRate =
      s.emailSent > 0 ? Math.round((s.linkedinPosted / s.emailSent) * 100) : 0;
    const deliveryRate =
      s.emailSent > 0 ? Math.round((s.emailSent / s.totalEmployees) * 100) : 0;

    const batches = await Batch.find().sort({ createdAt: -1 }).lean();
    const enrichedBatches = await Promise.all(
      batches.map(async (b) => {
        const [agg] = await Employee.aggregate([
          { $match: { batchId: b.batchId, emailStatus: "SENT" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              certs: {
                $sum: {
                  $cond: [
                    { $in: ["$certificateStatus", ["GENERATED", "SENT"]] },
                    1,
                    0,
                  ],
                },
              },
              emails: { $sum: 1 },
              // Single source of truth: linkedInPosted === true
              posted: { $sum: LINKEDIN_POSTED_EXPR },
            },
          },
        ]);
        const a = agg || { total: 0, certs: 0, emails: 0, posted: 0 };
        const rate = a.emails > 0 ? Math.round((a.posted / a.emails) * 100) : 0;
        return { ...b, ...a, rate };
      }),
    );

    const generatedOn = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const batchRows = enrichedBatches
      .map(
        (b) => `
      <tr>
        <td>${b.trainingName || "—"}</td>
        <td class="mono">${b.batchId}</td>
        <td>${b.organization || "—"}</td>
        <td class="num">${b.total}</td>
        <td class="num">${b.certs}</td>
        <td class="num">${b.emails}</td>
        <td class="num">${b.posted}</td>
        <td class="num">${Math.max(0, b.emails - b.posted)}</td>
        <td class="num">${b.rate}%</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,Helvetica,sans-serif; background:#fff; color:#1e293b; padding:48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; padding-bottom:20px; border-bottom:2px solid #6366f1; }
  .header-title h1 { font-size:26px; font-weight:800; color:#1e293b; }
  .header-title p { font-size:12px; color:#64748b; margin-top:4px; }
  .header-meta { text-align:right; font-size:11px; color:#64748b; }
  .section-title { font-size:13px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:16px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:40px; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px; }
  .kpi .val { font-size:28px; font-weight:800; color:#6366f1; }
  .kpi .label { font-size:11px; color:#64748b; margin-top:4px; font-weight:500; }
  .kpi.green .val { color:#10b981; }
  .kpi.blue .val  { color:#3b82f6; }
  .kpi.amber .val { color:#f59e0b; }
  .kpi.violet .val { color:#8b5cf6; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  thead tr { background:#6366f1; color:#fff; }
  thead th { padding:10px 12px; text-align:left; font-weight:600; white-space:nowrap; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .mono { font-family:monospace; font-size:10px; color:#64748b; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
  .row2 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:40px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-title">
      <h1>MaverickCertify — Full Report</h1>
      <p>Consolidated certificate, email &amp; LinkedIn engagement analytics</p>
    </div>
    <div class="header-meta">
      <div style="font-size:13px;font-weight:700;color:#6366f1">MaverickCertify</div>
      <div>Generated: ${generatedOn}</div>
      <div>Total batches: ${batches.length}</div>
    </div>
  </div>

  <p class="section-title">Executive Summary</p>
  <div class="kpi-grid">
    <div class="kpi"><div class="val">${s.totalEmployees.toLocaleString()}</div><div class="label">Total Trainees</div></div>
    <div class="kpi blue"><div class="val">${s.certGenerated.toLocaleString()}</div><div class="label">Certificates Generated</div></div>
    <div class="kpi green"><div class="val">${s.emailSent.toLocaleString()}</div><div class="label">Emails Sent</div></div>
    <div class="kpi violet"><div class="val">${deliveryRate}%</div><div class="label">Email Delivery Rate</div></div>
  </div>

  <div class="row2">
    <div class="kpi green"><div class="val">${s.linkedinPosted.toLocaleString()}</div><div class="label">LinkedIn Shared</div></div>
    <div class="kpi amber"><div class="val">${pending.toLocaleString()}</div><div class="label">Yet to Share</div></div>
    <div class="kpi violet"><div class="val">${shareRate}%</div><div class="label">LinkedIn Share Rate</div></div>
  </div>

  <p class="section-title">Batch Performance</p>
  <table>
    <thead>
      <tr>
        <th>Batch Name</th><th>Batch ID</th><th>Organisation</th>
        <th class="num">Trainees</th><th class="num">Certs</th>
        <th class="num">Emails</th><th class="num">Shared</th>
        <th class="num">Pending</th><th class="num">Rate</th>
      </tr>
    </thead>
    <tbody>${batchRows || '<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px">No batch data found</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <span>MaverickCertify — Confidential</span>
    <span>Reminders sent: ${s.remindersSent} &nbsp;|&nbsp; Report generated on ${generatedOn}</span>
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const pdfData = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      const pdfBuffer = Buffer.from(pdfData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="full_report_${fmt(new Date())}.pdf"`,
      );
      return res.send(pdfBuffer);
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (err) {
    console.error("Export full PDF error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
