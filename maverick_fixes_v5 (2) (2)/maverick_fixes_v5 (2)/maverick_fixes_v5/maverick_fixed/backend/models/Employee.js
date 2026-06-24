const mongoose = require("mongoose");

/**
 * Employee Schema
 * Stores ONLY valid employees from validated Excel uploads
 * Invalid employees are stored separately in ValidationLog collection
 */
const employeeSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: [true, "Batch ID is required"],
      index: true, // Index for fast batch lookups
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Employee ID must be exactly 10 digits",
      },
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
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    trainingName: {
      type: String,
      required: [true, "Training name is required"],
      trim: true,
    },
    trainingStartDate: {
      type: String, // Stored as YYYY-MM-DD for consistency
      required: [true, "Training start date is required"],
    },
    trainingEndDate: {
      type: String, // Stored as YYYY-MM-DD for consistency
      required: [true, "Training end date is required"],
    },
    validationStatus: {
      type: String,
      enum: ["VALID"],
      default: "VALID",
      // All employees in this collection are valid by definition
    },
    certificateStatus: {
      type: String,
      enum: ["PENDING", "GENERATED", "SENT"],
      default: "PENDING",
      // Tracks certificate generation progress: PENDING → GENERATED → SENT
    },
    emailStatus: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    linkedInPosted: {
      type: Boolean,
      default: false,
    },
    linkedinStatus: {
      type: String,
      enum: ["PENDING", "POSTED"],
      default: "PENDING",
    },
    postedAt: {
      type: Date,
      default: null,
    },
    linkedInReminderCount: {
      type: Number,
      default: 0,
    },
    lastReminderSentAt: {
      type: Date,
      default: null,
    },
    rowIndex: {
      type: Number,
      // Original row number from Excel (for reference/debugging)
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// Compound index for batch + employee lookups
employeeSchema.index({ batchId: 1, employeeId: 1 }, { unique: false });

// Create and export model
const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
