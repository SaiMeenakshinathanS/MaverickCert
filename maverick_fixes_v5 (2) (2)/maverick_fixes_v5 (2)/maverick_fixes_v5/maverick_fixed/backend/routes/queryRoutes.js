const express = require("express");
const router = express.Router();
const Batch = require("../models/Batch");
const Employee = require("../models/Employee");

// GET /api/batches
// Fetch all batches with aggregated employee counts
router.get("/batches", async (req, res) => {
  try {
    const batches = await Batch.find()
      .select(
        "batchId trainingName organization status createdAt totalEmployees validEmployees trainingStartDate trainingEndDate",
      )
      .sort({ createdAt: -1 })
      .lean();

    const enhanced = await Promise.all(
      batches.map(async (b) => {
        const [total, posted] = await Promise.all([
          Employee.countDocuments({ batchId: b.batchId }),
          // linkedInPosted is the single source of truth for LinkedIn posting.
          Employee.countDocuments({
            batchId: b.batchId,
            linkedInPosted: true,
          }),
        ]);

        const totalCandidates = total || b.totalEmployees || 0;
        const pending = Math.max(0, totalCandidates - posted);
        const completionPercentage =
          totalCandidates > 0
            ? Math.round((posted / totalCandidates) * 100)
            : 0;

        // Derive LinkedIn-aware status
        let batchStatus;
        if (completionPercentage === 100) {
          batchStatus = "Completed";
        } else if (completionPercentage > 0) {
          batchStatus = "In Progress";
        } else {
          batchStatus = "Pending";
        }

        return {
          ...b,
          totalEmployees: totalCandidates,
          linkedinPostedCount: posted,
          pendingCount: pending,
          completionPercentage,
          batchStatus,
        };
      }),
    );

    return res.json({ success: true, data: enhanced });
  } catch (err) {
    console.error("Error fetching batches:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees
// Fetch all employees (optionally filter by batchId or emailStatus)
router.get("/employees", async (req, res) => {
  try {
    const { batchId, emailStatus } = req.query;
    const filter = {};
    if (batchId) filter.batchId = batchId;
    // Default to fetching email-sent employees (for LinkedIn tracking)
    if (emailStatus) {
      filter.emailStatus = emailStatus.toUpperCase();
    } else {
      filter.emailStatus = "SENT";
    }

    const employees = await Employee.find(filter)
      .select(
        "_id employeeId employeeName email batchId trainingName emailStatus certificateStatus linkedInPosted linkedinStatus postedAt linkedInReminderCount lastReminderSentAt createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: employees });
  } catch (err) {
    console.error("Error fetching employees:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/employees/:id/linkedin
// Mark an employee as having posted on LinkedIn — coordinator action.
//
// IDEMPOTENCY: If the employee is already marked as posted (linkedInPosted === true)
// and the request is confirming (confirmed: true), the endpoint returns success
// WITHOUT creating a duplicate audit log entry.
router.patch("/employees/:id/linkedin", async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed, updatedBy } = req.body;
    const posted = confirmed === true;

    // Fetch current state first to detect duplicates
    const current = await Employee.findById(id)
      .select("linkedInPosted employeeName employeeId batchId")
      .lean();

    if (!current) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Build the update payload
    const updateFields = {
      linkedInPosted: posted,
      linkedinStatus: posted ? "POSTED" : "PENDING",
    };

    // Set postedAt when confirming; clear it when unconfirming
    if (posted) {
      updateFields.postedAt = current.linkedInPosted
        ? current.postedAt
        : new Date();
    } else {
      updateFields.postedAt = null;
    }

    const emp = await Employee.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: "after" },
    ).lean();

    // Audit log — only when coordinator confirms a post AND it wasn't already posted.
    // This prevents duplicate audit entries when the coordinator re-clicks confirm.
    if (posted && !current.linkedInPosted) {
      const { logActivity } = require("../utils/auditLogger");
      await logActivity({
        userName: updatedBy || "Coordinator",
        action: `Marked LinkedIn posted for ${emp.employeeName}`,
        type: "linkedin",
        meta: {
          employeeId: emp.employeeId,
          batchId: emp.batchId,
          source: "coordinator",
          postedAt: emp.postedAt,
        },
      });
    }

    return res.json({ success: true, data: emp });
  } catch (err) {
    console.error("Error updating linkedin status:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/send-reminder
// Send a single reminder email to an employee
router.post("/email/send-reminder", async (req, res) => {
  try {
    const { employeeId, batchId } = req.body;
    if (!employeeId || !batchId) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId and batchId required" });
    }

    const employee = await Employee.findOne({ employeeId });
    const batch = await Batch.findOne({ batchId });

    if (!employee || !batch) {
      return res
        .status(404)
        .json({ success: false, message: "Employee or batch not found" });
    }

    const { sendCertificateEmail } = require("../services/emailService");
    const result = await sendCertificateEmail(
      employee,
      batch,
      null,
      null,
      true,
    );

    if (result.success) {
      await Employee.updateOne(
        { _id: employee._id },
        {
          $inc: { linkedInReminderCount: 1 },
          $set: { lastReminderSentAt: new Date() },
        },
      );
      return res.json({ success: true, message: "Reminder sent" });
    } else {
      return res.status(500).json({ success: false, message: result.error });
    }
  } catch (err) {
    console.error("Error sending reminder:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/certificates/download/:batchId/:employeeId
// Download a certificate PDF
router.get("/certificates/download/:batchId/:employeeId", async (req, res) => {
  try {
    const { batchId, employeeId } = req.params;
    const path = require("path");
    const fs = require("fs");

    const employee = await Employee.findOne({ batchId, employeeId }).lean();
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Try to find certificate file
    const certDir = path.join(__dirname, "../uploads/certificates");
    const safeName = employee.employeeName.replace(/\s+/g, "_");
    const batchName = employee.trainingName?.replace(/\s+/g, "_") || batchId;

    const possibleFiles = [
      `${safeName}_${batchName}.pdf`,
      `${employee.employeeId}_${batchId}.pdf`,
    ];

    let certPath = null;
    for (const f of possibleFiles) {
      const fp = path.join(certDir, f);
      if (fs.existsSync(fp)) {
        certPath = fp;
        break;
      }
    }

    // Fallback: search directory
    if (!certPath && fs.existsSync(certDir)) {
      const files = fs.readdirSync(certDir);
      const match = files.find((f) =>
        f.toLowerCase().includes(safeName.toLowerCase().split("_")[0]),
      );
      if (match) certPath = path.join(certDir, match);
    }

    if (!certPath) {
      return res
        .status(404)
        .json({ success: false, message: "Certificate file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_certificate.pdf"`,
    );
    return res.sendFile(certPath);
  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
