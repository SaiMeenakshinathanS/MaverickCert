// Convert Excel serial date to Date object
const excelDateToDate = (excelDate) => {
  // Excel starts counting from Jan 1, 1900
  const EXCEL_DATE_BASE = 25569; // Days between 1/1/1900 and 1/1/1970
  const MS_PER_DAY = 86400000;

  if (typeof excelDate === "number") {
    return new Date((excelDate - EXCEL_DATE_BASE) * MS_PER_DAY);
  }
  return null;
};

// Parse various date formats
const parseDate = (dateValue) => {
  if (!dateValue) return null;

  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue;
  }

  // If it's a number (Excel serial date)
  if (typeof dateValue === "number") {
    return excelDateToDate(dateValue);
  }

  // If it's a string, try parsing
  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();

    // Try yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(trimmed + "T00:00:00Z");
    }

    // Try dd-mm-yyyy format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const parts = trimmed.split("-");
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    }

    // Try dd/mm/yyyy format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split("/");
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    }

    // Try standard date string
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

// Normalize date to YYYY-MM-DD string for comparison
const normalizeDateToString = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date || isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Compare two dates
const compareDates = (date1, date2) => {
  const normalized1 = normalizeDateToString(date1);
  const normalized2 = normalizeDateToString(date2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
};

module.exports = {
  excelDateToDate,
  parseDate,
  normalizeDateToString,
  compareDates,
};
