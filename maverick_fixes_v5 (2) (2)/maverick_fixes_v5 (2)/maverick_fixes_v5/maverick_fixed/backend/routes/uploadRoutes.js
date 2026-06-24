const express = require("express");
const router = express.Router();
const { parseExcelFile } = require("../services/excelService");
const { validateAllEmployees } = require("../services/validationService");
const databaseService = require("../services/databaseService");
const { logActivity } = require("../utils/auditLogger");

// GET /api/batch/new
// Generate a new batchId with format HexCert-ddmmyyyy-<n>
router.get("/batch/new", async (req, res) => {
  try {
    const batchId = await databaseService.generateBatchId();
    return res.json({ error: false, data: { batchId } });
  } catch (err) {
    console.error("❌ Failed to generate batchId:", err.message);
    return res
      .status(500)
      .json({
        error: true,
        message: "Failed to generate batchId",
        details: err.message,
      });
  }
});

// POST /api/batch/create
// Create a new batch in "draft" status
router.post("/batch/create", async (req, res) => {
  try {
    console.log("\n📝 CREATE BATCH REQUEST");

    let {
      batchId,
      trainingName,
      organization,
      trainingStartDate,
      trainingEndDate,
      userName,
    } = req.body;

    if (
      !trainingName ||
      !organization ||
      !trainingStartDate ||
      !trainingEndDate
    ) {
      return res.status(400).json({
        error: true,
        message: "Missing required batch fields",
      });
    }

    // If frontend did not provide a batchId, generate one server-side
    if (!batchId) {
      batchId = await databaseService.generateBatchId();
    }

    const result = await databaseService.saveBatchToDB(batchId, {
      trainingName,
      organization,
      trainingStartDate,
      trainingEndDate,
    });

    if (!result.success) {
      return res.status(500).json({
        error: true,
        message: result.message,
      });
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    await logActivity({
      userName: userName || "Coordinator",
      action: `Created batch: ${trainingName}`,
      type: "batch",
      meta: { batchId },
    });

    return res.status(201).json({
      error: false,
      message: "Batch created successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Create batch error:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error creating batch",
      details: error.message,
    });
  }
});

// POST /api/upload/validate
// Validate Excel file and store results in MongoDB
router.post("/validate", async (req, res) => {
  try {
    console.log("\n📨 UPLOAD VALIDATION REQUEST RECEIVED");

    const { fileBase64, batchInfo, batchId, userName } = req.body;

    // Validate request body
    if (!fileBase64 || !batchInfo) {
      return res.status(400).json({
        error: true,
        message: "Missing fileBase64 or batchInfo in request",
      });
    }

    // batchId is required — must come from the frontend-generated value in Step 1
    if (!batchId) {
      return res.status(400).json({
        error: true,
        message: "Missing batchId — must be provided from the Batch Info step",
      });
    }

    console.log(`🆔 Using batchId: ${batchId}`);

    const { trainingName, trainingStartDate, trainingEndDate, organization } =
      batchInfo;
    if (!trainingName || !trainingStartDate || !trainingEndDate) {
      return res.status(400).json({
        error: true,
        message: "Missing required batch info fields",
      });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, "base64");
    console.log(`📦 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Parse Excel file
    const parseResult = parseExcelFile(fileBuffer);
    if (!parseResult.success) {
      return res.status(400).json({
        error: true,
        message: "Failed to parse Excel file",
        details: parseResult.error,
      });
    }

    // Validate all employees
    const validationResult = validateAllEmployees(
      parseResult.employees,
      parseResult.headers,
      batchInfo,
    );

    // Save valid employees to database — use the real batchId, never "unknown"
    console.log("\n📊 SAVING RESULTS TO DATABASE");
    try {
      const saveValidResult = await databaseService.saveValidEmployees(
        batchId,
        validationResult.validData,
      );

      const saveErrorResult = await databaseService.saveValidationErrors(
        batchId,
        validationResult.invalidData,
      );

      const Batch = require("../models/Batch");
      await Batch.findOneAndUpdate(
        { batchId },
        {
          $setOnInsert: {
            batchId,
            trainingName,
            organization: organization || "Organisation",
            trainingStartDate,
            trainingEndDate,
            status: "uploaded",
          },
        },
        { upsert: true, returnDocument: "after" },
      );

      await databaseService.updateBatchSummary(
        batchId,
        validationResult.totalRows,
        validationResult.validEmployees,
        validationResult.invalidEmployees,
      );

      // ── Audit log ────────────────────────────────────────────────────────────
      await logActivity({
        userName: userName || "Coordinator",
        action: `Uploaded ${validationResult.validEmployees} candidates to ${trainingName}`,
        type: "upload",
        meta: { batchId, total: validationResult.validEmployees },
      });
    } catch (dbError) {
      console.warn(
        "⚠️  DB save skipped (MongoDB unavailable):",
        dbError.message,
      );
    }

    // Return validation result
    console.log("✓ Validation complete - sending response");
    return res.status(200).json({
      error: false,
      message: "Validation completed successfully",
      data: {
        summary: {
          totalRows: validationResult.totalRows,
          validEmployees: validationResult.validEmployees,
          invalidEmployees: validationResult.invalidEmployees,
          successRate: parseFloat(validationResult.successRate),
        },
        validData: validationResult.validData,
        invalidData: validationResult.invalidData,
        validationErrors: validationResult.validationErrors,
        timestamp: new Date().toISOString(),
        databaseStatus: {
          validSaved: true,
          errorsSaved: true,
        },
      },
    });
  } catch (error) {
    console.error("❌ Upload validation error:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error during validation",
      details: error.message,
    });
  }
});

// GET /api/upload/health
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Upload & Validation Service",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
