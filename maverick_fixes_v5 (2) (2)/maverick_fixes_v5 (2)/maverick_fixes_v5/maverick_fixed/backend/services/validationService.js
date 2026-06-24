const {
  validateEmployeeId,
  validateTrainingName,
  validateEmail,
} = require("../utils/validators");
const { compareDates, normalizeDateToString } = require("../utils/dateUtils");
const { extractEmployeeData } = require("./excelService");

// Validate single employee against batch info
const validateEmployee = (employee, batchInfo, rowIndex) => {
  console.log(`🔍 Validating employee at row ${rowIndex}...`);

  const errors = [];
  const warnings = [];

  // 1. Validate Employee ID
  const idValidation = validateEmployeeId(employee.employeeId);
  if (!idValidation.valid) {
    errors.push(`Row ${rowIndex} - Employee ID: ${idValidation.error}`);
  }

  // 2. Validate Training Name
  const trainingValidation = validateTrainingName(
    employee.trainingName,
    batchInfo.trainingName,
  );
  if (!trainingValidation.valid) {
    errors.push(`Row ${rowIndex} - Training: ${trainingValidation.error}`);
  }

  // 3. Validate Start Date
  const startDateMatch = compareDates(
    employee.startDate,
    batchInfo.trainingStartDate,
  );
  if (!startDateMatch) {
    const normalized = normalizeDateToString(employee.startDate);
    errors.push(
      `Row ${rowIndex} - Start Date: Expected "${batchInfo.trainingStartDate}", Got "${normalized || employee.startDate}"`,
    );
  }

  // 4. Validate End Date
  const endDateMatch = compareDates(
    employee.endDate,
    batchInfo.trainingEndDate,
  );
  if (!endDateMatch) {
    const normalized = normalizeDateToString(employee.endDate);
    errors.push(
      `Row ${rowIndex} - End Date: Expected "${batchInfo.trainingEndDate}", Got "${normalized || employee.endDate}"`,
    );
  }

  // 5. Validate Email
  const emailValidation = validateEmail(employee.email);
  if (!emailValidation.valid) {
    warnings.push(`Row ${rowIndex} - Email: ${emailValidation.error}`);
  }

  // Warnings are informational only — records are invalid ONLY when errors exist
  const isValid = errors.length === 0;

  // Detailed per-row debug log: Employee ID, Name, errors, warnings, final status
  console.log(`\n  ── Row ${rowIndex} ──────────────────────────────`);
  console.log(`     Employee ID : ${employee.employeeId || "(missing)"}`);
  console.log(`     Name        : ${employee.name || "(missing)"}`);
  console.log(`     Email       : ${employee.email || "(missing)"}`);
  console.log(`     Status      : ${isValid ? "✓ VALID" : "✗ INVALID"}`);
  if (errors.length > 0)
    console.log(`     Errors (${errors.length})   : ${errors.join(" | ")}`);
  if (warnings.length > 0)
    console.log(`     Warnings (${warnings.length}) : ${warnings.join(" | ")}`);

  return {
    isValid,
    errors,
    warnings,
    employee,
    rowIndex,
  };
};

// Validate all employees
const validateAllEmployees = (employees, headers, batchInfo) => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 STARTING VALIDATION PROCESS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Batch: ${batchInfo.trainingName}`);
  console.log(
    `Training Period: ${batchInfo.trainingStartDate} to ${batchInfo.trainingEndDate}`,
  );
  console.log(`Total employees to validate: ${employees.length}\n`);

  const validEmployees = [];
  const invalidEmployees = [];
  const validationErrors = [];

  // ── Pass 1: extract all rows so we can detect cross-row duplicates ──────────
  const extractedRows = employees.map((employee) =>
    extractEmployeeData(employee, headers),
  );

  // Build maps: normalizedValue -> [rowIndex, ...]
  const employeeIdRows = {};
  const emailRows = {};

  extractedRows.forEach((emp) => {
    const idKey = String(emp.employeeId || "")
      .trim()
      .toLowerCase();
    const emailKey = String(emp.email || "")
      .trim()
      .toLowerCase();
    if (idKey) {
      if (!employeeIdRows[idKey]) employeeIdRows[idKey] = [];
      employeeIdRows[idKey].push(emp.rowIndex);
    }
    if (emailKey) {
      if (!emailRows[emailKey]) emailRows[emailKey] = [];
      emailRows[emailKey].push(emp.rowIndex);
    }
  });

  // Row indexes that are part of a duplicate group
  const duplicateIdRows = new Set();
  const duplicateEmailRows = new Set();
  Object.values(employeeIdRows).forEach((rows) => {
    if (rows.length > 1) rows.forEach((r) => duplicateIdRows.add(r));
  });
  Object.values(emailRows).forEach((rows) => {
    if (rows.length > 1) rows.forEach((r) => duplicateEmailRows.add(r));
  });

  // ── Pass 2: per-row validation + duplicate errors ───────────────────────────
  extractedRows.forEach((employeeData) => {
    const validation = validateEmployee(
      employeeData,
      batchInfo,
      employeeData.rowIndex,
    );

    if (duplicateIdRows.has(employeeData.rowIndex)) {
      const idKey = String(employeeData.employeeId || "")
        .trim()
        .toLowerCase();
      const dupeRows = employeeIdRows[idKey].filter(
        (r) => r !== employeeData.rowIndex,
      );
      validation.errors.push(
        `Row ${employeeData.rowIndex} - Employee ID: Duplicate found in row(s) ${dupeRows.join(", ")} — Employee IDs must be unique within the file`,
      );
      validation.isValid = false;
    }

    if (duplicateEmailRows.has(employeeData.rowIndex)) {
      const emailKey = String(employeeData.email || "")
        .trim()
        .toLowerCase();
      const dupeRows = emailRows[emailKey].filter(
        (r) => r !== employeeData.rowIndex,
      );
      validation.errors.push(
        `Row ${employeeData.rowIndex} - Email: Duplicate found in row(s) ${dupeRows.join(", ")} — Email addresses must be unique within the file`,
      );
      validation.isValid = false;
    }

    if (validation.isValid) {
      validEmployees.push(validation.employee);
    } else {
      invalidEmployees.push({
        employee: validation.employee,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      validationErrors.push(...validation.errors);
    }
  });

  const totalWarnings =
    invalidEmployees.reduce(
      (sum, r) => sum + (r.warnings ? r.warnings.length : 0),
      0,
    ) + validEmployees.reduce
      ? 0
      : 0; // warnings on valid rows are already counted via console above
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 VALIDATION SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Total Rows    : ${employees.length}`);
  console.log(`  ✓ Valid       : ${validEmployees.length}`);
  console.log(`  ✗ Invalid     : ${invalidEmployees.length}`);
  console.log(`  ⚠ Warnings    : ${totalWarnings}`);
  console.log(
    `  Success Rate  : ${((validEmployees.length / employees.length) * 100).toFixed(2)}%`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  return {
    totalRows: employees.length,
    validEmployees: validEmployees.length,
    invalidEmployees: invalidEmployees.length,
    successRate: ((validEmployees.length / employees.length) * 100).toFixed(2),
    validData: validEmployees,
    invalidData: invalidEmployees,
    validationErrors,
  };
};

module.exports = {
  validateEmployee,
  validateAllEmployees,
};
