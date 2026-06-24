const mongoose = require("mongoose");

/**
 * Batch Schema
 * Stores batch metadata from Step 1: Create Batch
 * Tracks workflow status through certificate generation pipeline
 */
const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: [true, "Batch ID is required"],
      unique: true,
      index: true,
    },
    trainingName: {
      type: String,
      required: [true, "Training name is required"],
      trim: true,
    },
    organization: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    trainingStartDate: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, "Training start date is required"],
    },
    trainingEndDate: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, "Training end date is required"],
    },
    uploadedFileName: {
      type: String,
      // Original Excel file name (informational)
    },
    totalEmployees: {
      type: Number,
      default: 0,
      // Total rows in uploaded Excel (valid + invalid)
    },
    validEmployees: {
      type: Number,
      default: 0,
      // Count of employees who passed validation
    },
    invalidEmployees: {
      type: Number,
      default: 0,
      // Count of employees who failed validation
    },
    status: {
      type: String,
      enum: [
        "draft", // Just created, no Excel uploaded yet
        "uploaded", // Excel uploaded, validation pending
        "validated", // Validation complete, results available
        "template_generated", // Certificate template designed
        "certificates_generated", // Certificates generated
        "emails_sent", // Certificates emailed
        "completed", // Workflow complete
      ],
      default: "draft",
      index: true, // Index for status queries
    },
    createdBy: {
      type: String,
      // Will store user ID when authentication is added
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create and export model
const Batch = mongoose.model("Batch", batchSchema);

module.exports = Batch;
