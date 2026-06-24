const mongoose = require("mongoose");

/**
 * AuditLog Schema
 * Records all significant actions performed by Admins and Coordinators.
 * Used by both the Admin Dashboard "Recent Activity" feed and the Audit Logs page.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "batch",
        "upload",
        "certificate",
        "email",
        "linkedin",
        "reminder",
        "user",
        "settings",
        "report",
      ],
      default: "batch",
    },
    // Optional: store extra context (batchId, count, etc.) for richer messages
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt / updatedAt added automatically
  },
);

// Index for fast recent-activity queries
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
