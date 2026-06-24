const XLSX = require("xlsx");

// Parse Excel file from buffer
const parseExcelFile = (fileBuffer) => {
  try {
    console.log("📄 Parsing Excel file...");

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Get as array instead of object with auto headers
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("Excel file is empty");
    }

    // Extract headers (first row)
    const headers = rows[0];
    console.log(`✓ Found headers: ${headers.join(", ")}`);

    // Extract data rows (skip header)
    const dataRows = rows.slice(1);
    console.log(`✓ Found ${dataRows.length} data rows`);

    // Convert to objects with headers as keys
    const employees = dataRows
      .filter((row) => row.some((cell) => cell !== "")) // Skip empty rows
      .map((row, index) => {
        const employee = {};
        headers.forEach((header, colIndex) => {
          employee[header] = row[colIndex] || "";
        });
        employee._rowIndex = index + 2; // Store original row index (1-based, +1 for header)
        return employee;
      });

    console.log(
      `✓ Successfully parsed ${employees.length} employees from Excel`,
    );

    return {
      success: true,
      headers,
      employees,
      totalRows: employees.length,
    };
  } catch (error) {
    console.error("❌ Excel parsing error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Find column index by header (case-insensitive, supports partial matches)
const findColumnIndex = (headers, searchTerm) => {
  const lowerSearch = searchTerm.toLowerCase();
  return headers.findIndex((header) =>
    header.toLowerCase().includes(lowerSearch),
  );
};

// Extract employee data with flexible column matching
const extractEmployeeData = (employee, headers) => {
  return {
    employeeId:
      employee["Employee ID"] || employee["EmployeeID"] || employee["ID"] || "",
    name:
      employee["Employee Name"] ||
      employee["Name"] ||
      employee["Full Name"] ||
      "",
    email: employee["Email ID"] || employee["Email"] || "",
    trainingName: employee["Training Name"] || employee["Training"] || "",
    startDate: employee["Start Date"] || employee["StartDate"] || "",
    endDate: employee["End Date"] || employee["EndDate"] || "",
    rowIndex: employee._rowIndex || 0,
  };
};

module.exports = {
  parseExcelFile,
  findColumnIndex,
  extractEmployeeData,
};
