// Employee ID: Must be exactly 10 numeric digits
const validateEmployeeId = (id) => {
  if (!id) return { valid: false, error: "Employee ID is required" };

  const idStr = String(id).trim();

  // Check if exactly 10 digits
  if (!/^\d{10}$/.test(idStr)) {
    return {
      valid: false,
      error: "Employee ID must contain exactly 10 digits (numeric only)",
    };
  }

  return { valid: true };
};

// Training Name: Case-insensitive, ignore extra spaces
const validateTrainingName = (excelName, appName) => {
  if (!excelName || !appName) {
    return { valid: false, error: "Training name is required" };
  }

  const normalize = (str) => String(str).trim().toLowerCase();
  const excelNormalized = normalize(excelName);
  const appNormalized = normalize(appName);

  if (excelNormalized !== appNormalized) {
    return {
      valid: false,
      error: `Training name mismatch. Expected: "${appName}", Got: "${excelName}"`,
    };
  }

  return { valid: true };
};

// Email validation
const validateEmail = (email) => {
  if (!email) return { valid: false, error: "Email is required" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: `Invalid email format: "${email}"` };
  }

  return { valid: true };
};

module.exports = {
  validateEmployeeId,
  validateTrainingName,
  validateEmail,
};
