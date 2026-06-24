const Batch = require("../models/Batch");
const Employee = require("../models/Employee");
const ValidationLog = require("../models/ValidationLog");

/**
 * Database Service
 * Centralizes all database operations
 * Provides clean API for routes to save validation results
 */

/**
 * Save batch to database in "draft" status
 * Called from Step 1: Create Batch endpoint
 */
const saveBatchToDB = async (batchId, batchInfo) => {
  try {
    console.log(`\n💾 Saving batch to database...`);

    const batch = new Batch({
      batchId,
      trainingName: batchInfo.trainingName,
      organization: batchInfo.organization,
      trainingStartDate: batchInfo.trainingStartDate,
      trainingEndDate: batchInfo.trainingEndDate,
      uploadedFileName: null,
      status: "draft",
    });

    await batch.save();

    console.log(`✓ Batch saved: ${batchId}`);
    return {
      success: true,
      message: "Batch created successfully",
      data: batch,
    };
  } catch (error) {
    console.error("❌ Error saving batch:", error.message);
    return {
      success: false,
      message: "Failed to save batch",
      error: error.message,
    };
  }
};

/**
 * Update batch status in database
 * Called throughout workflow: draft → uploaded → validated → etc
 */
const updateBatchStatus = async (batchId, newStatus, updates = {}) => {
  try {
    console.log(`📝 Updating batch status: ${newStatus}`);

    const batch = await Batch.findOneAndUpdate(
      { batchId },
      { status: newStatus, ...updates },
      { returnDocument: "after" },
    );

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    console.log(`✓ Batch status updated to: ${newStatus}`);
    return {
      success: true,
      message: "Batch status updated",
      data: batch,
    };
  } catch (error) {
    console.error("❌ Error updating batch status:", error.message);
    return {
      success: false,
      message: "Failed to update batch status",
      error: error.message,
    };
  }
};

/**
 * Save valid employees to database
 * Called after successful validation
 * Only VALID employees stored here
 */
const saveValidEmployees = async (batchId, validEmployees) => {
  try {
    if (!validEmployees || validEmployees.length === 0) {
      console.log(`⚠️  No valid employees to save`);
      return {
        success: true,
        message: "No valid employees to save",
        data: [],
      };
    }

    console.log(
      `💾 Saving ${validEmployees.length} valid employees to database...`,
    );

    // Transform validation result format to Employee schema format
    const employeeDocuments = validEmployees.map((emp) => ({
      batchId,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      email: emp.email,
      trainingName: emp.trainingName,
      trainingStartDate: emp.startDate,
      trainingEndDate: emp.endDate,
      rowIndex: emp.rowIndex,
      validationStatus: "VALID",
      certificateStatus: "PENDING",
      emailStatus: "PENDING",
    }));

    // insertMany with ordered=false allows partial success
    const result = await Employee.insertMany(employeeDocuments, {
      ordered: false,
    });

    console.log(`✓ Saved ${result.length} valid employees`);
    return {
      success: true,
      message: `Successfully saved ${result.length} valid employees`,
      data: result,
    };
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      console.warn(
        `⚠️  Some employees may already exist (duplicate key error)`,
      );
      return {
        success: true,
        message: "Employees saved (some duplicates skipped)",
        error: error.message,
      };
    }

    console.error("❌ Error saving valid employees:", error.message);
    return {
      success: false,
      message: "Failed to save valid employees",
      error: error.message,
    };
  }
};

/**
 * Save invalid employees to ValidationLog
 * Called after validation
 * Invalid employees do NOT proceed to next steps
 */
const saveValidationErrors = async (batchId, invalidEmployees) => {
  try {
    if (!invalidEmployees || invalidEmployees.length === 0) {
      console.log(`⚠️  No invalid employees to log`);
      return {
        success: true,
        message: "No validation errors to log",
        data: [],
      };
    }

    console.log(
      `💾 Saving ${invalidEmployees.length} validation errors to audit log...`,
    );

    // Transform to ValidationLog format
    const logDocuments = invalidEmployees.map((emp) => ({
      batchId,
      employeeId: emp.employee.employeeId,
      employeeName: emp.employee.name,
      email: emp.employee.email,
      trainingName: emp.employee.trainingName,
      trainingStartDate: emp.employee.startDate,
      trainingEndDate: emp.employee.endDate,
      validationErrors: emp.errors.map((err) => {
        // Parse error message to extract field and message
        const match = err.match(/^Row \d+ - (.+?): (.+)$/);
        return {
          field: match ? match[1] : "Unknown",
          message: match ? match[2] : err,
        };
      }),
      warnings: emp.warnings.map((warn) => {
        const match = warn.match(/^Row \d+ - (.+?): (.+)$/);
        return {
          field: match ? match[1] : "Unknown",
          message: match ? match[2] : warn,
        };
      }),
      rowIndex: emp.employee.rowIndex,
      timestamp: new Date(),
    }));

    const result = await ValidationLog.insertMany(logDocuments, {
      ordered: false,
    });

    console.log(`✓ Logged ${result.length} validation errors`);
    return {
      success: true,
      message: `Successfully logged ${result.length} validation errors`,
      data: result,
    };
  } catch (error) {
    console.error("❌ Error saving validation errors:", error.message);
    return {
      success: false,
      message: "Failed to save validation errors",
      error: error.message,
    };
  }
};

/**
 * Update batch with validation summary statistics
 * Called after saving employees and logs
 */
const updateBatchSummary = async (
  batchId,
  totalRows,
  validCount,
  invalidCount,
  fileName,
) => {
  try {
    const result = await Batch.findOneAndUpdate(
      { batchId },
      {
        totalEmployees: totalRows,
        validEmployees: validCount,
        invalidEmployees: invalidCount,
        uploadedFileName: fileName,
        status: "validated",
      },
      { returnDocument: "after" },
    );

    console.log(
      `✓ Batch summary updated: ${validCount}/${totalRows} valid employees`,
    );
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("❌ Error updating batch summary:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get batch by batchId
 */
const getBatchById = async (batchId) => {
  try {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return { success: false, error: "Batch not found" };
    }
    return { success: true, data: batch };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all valid employees for a batch
 */
const getEmployeesByBatch = async (batchId) => {
  try {
    const employees = await Employee.find({ batchId }).sort({ rowIndex: 1 });
    return { success: true, data: employees };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get validation logs for a batch
 */
const getValidationLogsByBatch = async (batchId) => {
  try {
    const logs = await ValidationLog.find({ batchId }).sort({ rowIndex: 1 });
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const generateBatchId = async () => {
  const prefix = 'HexCert-';
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const datePart = `${dd}${mm}${yyyy}`;
  const base = `${prefix}${datePart}-`;
  // Find existing batches for today and compute next suffix
  const existing = await Batch.find({ batchId: { $regex: '^' + base } }).select('batchId').lean();
  let max = 0;
  existing.forEach((b) => {
    const parts = b.batchId.split('-');
    const suffix = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(suffix) && suffix > max) max = suffix;
  });
  const next = max + 1;
  return `${prefix}${datePart}-${next}`;
};

module.exports = {
  saveBatchToDB,
  updateBatchStatus,
  saveValidEmployees,
  saveValidationErrors,
  updateBatchSummary,
  getBatchById,
  getEmployeesByBatch,
  getValidationLogsByBatch,
  generateBatchId,
};
