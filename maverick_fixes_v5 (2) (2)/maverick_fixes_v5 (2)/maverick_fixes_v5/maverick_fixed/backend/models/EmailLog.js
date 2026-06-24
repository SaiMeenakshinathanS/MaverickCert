const mongoose = require("mongoose");

/**
 * EmailLog Schema
 * Records every email send attempt — success or failure — for full audit trail.
 * One document per employee per send attempt.
 */
const emailLogSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: [true, "Batch ID is required"],
      index: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
    },
    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    emailStatus: {
      type: String,
      enum: ["SENT", "FAILED"],
      required: [true, "Email status is required"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    failureReason: {
      type: String,
      default: null,
      // Populated when emailStatus = "FAILED"
    },
    certificateFile: {
      type: String,
      default: null,
      // Filename of the attached PDF, for reference
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: look up all logs for a batch quickly
emailLogSchema.index({ batchId: 1, emailStatus: 1 });

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

module.exports = EmailLog;
