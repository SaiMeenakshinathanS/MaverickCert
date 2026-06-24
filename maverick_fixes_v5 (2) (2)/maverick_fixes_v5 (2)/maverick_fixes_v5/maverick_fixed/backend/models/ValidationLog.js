const mongoose = require("mongoose");

/**
 * ValidationLog Schema
 * Stores INVALID employees (those who failed validation)
 * Separate from Employee collection to maintain business logic:
 * Only valid employees proceed to next steps
 */
const validationLogSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: [true, "Batch ID is required"],
      index: true, // Index for batch lookups
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
      trim: true,
      lowercase: true,
    },
    trainingName: {
      type: String,
      trim: true,
    },
    trainingStartDate: {
      type: String,
    },
    trainingEndDate: {
      type: String,
    },
    validationErrors: [
      {
        field: String,
        message: String,
      },
    ],
    // Each error stores: field name and error message
    // Example: {field: "Employee ID", message: "must contain exactly 10 digits"}

    warnings: [
      {
        field: String,
        message: String,
      },
    ],
    // Warnings don't block validation but are recorded
    // Example: {field: "Email", message: "Invalid email format"}

    rowIndex: {
      type: Number,
      // Original row number from Excel for reference
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Manual timestamp via 'timestamp' field above
  }
);

// Compound index for audit queries
validationLogSchema.index({ batchId: 1, employeeId: 1 });

// Create and export model
const ValidationLog = mongoose.model("ValidationLog", validationLogSchema);

module.exports = ValidationLog;
