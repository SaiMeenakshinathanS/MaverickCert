// Example: Testing Backend Validation API
// This file demonstrates how to use the backend validation service

// ─────────────────────────────────────────────────────────────
// Example 1: Valid Employee Data
// ─────────────────────────────────────────────────────────────

const validEmployeeExample = {
'Employee ID': '1234567890',
'Employee Name': 'John Doe',
'Email ID': 'john.doe@company.com',
'Training Name': 'Python Basics',
'Start Date': '2026-05-01',
'End Date': '2026-05-10',
};

// ─────────────────────────────────────────────────────────────
// Example 2: Invalid Employee Data (Multiple Errors)
// ─────────────────────────────────────────────────────────────

const invalidEmployeeExamples = [
{
description: 'Invalid Employee ID (too short)',
data: {
'Employee ID': '12345',
'Employee Name': 'Jane Smith',
'Email ID': 'jane@company.com',
'Training Name': 'Python Basics',
'Start Date': '2026-05-01',
'End Date': '2026-05-10',
},
error: 'Employee ID must contain exactly 10 digits (numeric only)',
},
{
description: 'Invalid Employee ID (with letters)',
data: {
'Employee ID': 'EMP1234567',
'Employee Name': 'Bob Johnson',
'Email ID': 'bob@company.com',
'Training Name': 'Python Basics',
'Start Date': '2026-05-01',
'End Date': '2026-05-10',
},
error: 'Employee ID must contain exactly 10 digits (numeric only)',
},
{
description: 'Training name mismatch',
data: {
'Employee ID': '1234567890',
'Employee Name': 'Alice Brown',
'Email ID': 'alice@company.com',
'Training Name': 'Java Advanced',
'Start Date': '2026-05-01',
'End Date': '2026-05-10',
},
error: 'Training name mismatch. Expected: "Python Basics", Got: "Java Advanced"',
},
{
description: 'Start date mismatch',
data: {
'Employee ID': '1234567890',
'Employee Name': 'Charlie Davis',
'Email ID': 'charlie@company.com',
'Training Name': 'Python Basics',
'Start Date': '2026-05-02',
'End Date': '2026-05-10',
},
error: 'Start Date: Expected "2026-05-01", Got "2026-05-02"',
},
{
description: 'End date mismatch',
data: {
'Employee ID': '1234567890',
'Employee Name': 'Diana Evans',
'Email ID': 'diana@company.com',
'Training Name': 'Python Basics',
'Start Date': '2026-05-01',
'End Date': '2026-05-15',
},
error: 'End Date: Expected "2026-05-10", Got "2026-05-15"',
},
{
description: 'Invalid email format',
data: {
'Employee ID': '1234567890',
'Employee Name': 'Eve Francis',
'Email ID': 'invalid-email',
'Training Name': 'Python Basics',
'Start Date': '2026-05-01',
'End Date': '2026-05-10',
},
warning: 'Invalid email format: "invalid-email"',
},
];

// ─────────────────────────────────────────────────────────────
// Example 3: Testing Date Format Support
// ─────────────────────────────────────────────────────────────

const dateFormatExamples = [
{
format: 'YYYY-MM-DD',
startDate: '2026-05-01',
endDate: '2026-05-10',
},
{
format: 'DD-MM-YYYY',
startDate: '01-05-2026',
endDate: '10-05-2026',
},
{
format: 'DD/MM/YYYY',
startDate: '01/05/2026',
endDate: '10/05/2026',
},
{
format: 'Excel Serial Date',
startDate: 45450, // Excel serial for 2026-05-01
endDate: 45459, // Excel serial for 2026-05-10
},
];

// ─────────────────────────────────────────────────────────────
// Example 4: Sample Batch Info
// ─────────────────────────────────────────────────────────────

const batchInfoExample = {
trainingName: 'Python Basics',
trainingStartDate: '2026-05-01',
trainingEndDate: '2026-05-10',
};

// ─────────────────────────────────────────────────────────────
// Example 5: API Request to Backend
// ─────────────────────────────────────────────────────────────

async function validateExcelFile(file, batchInfo) {
try {
// Read file as base64
const fileBase64 = await new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => {
const base64 = reader.result.split(',')[1];
resolve(base64);
};
reader.onerror = reject;
reader.readAsDataURL(file);
});

    // Send to backend
    const response = await fetch('http://localhost:5000/api/upload/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBase64,
        batchInfo: {
          trainingName: batchInfo.eventName,
          trainingStartDate: batchInfo.trainingStartDate,
          trainingEndDate: batchInfo.trainingEndDate,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      console.error('Validation error:', result.message);
      return null;
    }

    console.log('✓ Validation successful');
    console.log('Summary:', result.data.summary);
    console.log('Valid employees:', result.data.validData.length);
    console.log('Invalid employees:', result.data.invalidData.length);

    return result.data;

} catch (error) {
console.error('Request failed:', error);
return null;
}
}

// ─────────────────────────────────────────────────────────────
// Example 6: Expected Response Structure
// ─────────────────────────────────────────────────────────────

const expectedResponseExample = {
error: false,
message: 'Validation completed successfully',
data: {
summary: {
totalRows: 120,
validEmployees: 98,
invalidEmployees: 22,
successRate: 81.67,
},
validData: [
{
employeeId: '1234567890',
name: 'John Doe',
email: 'john@company.com',
trainingName: 'Python Basics',
startDate: '2026-05-01',
endDate: '2026-05-10',
rowIndex: 2,
},
// ... more valid employees
],
invalidData: [
{
employee: {
employeeId: '12345',
name: 'Jane Smith',
email: 'jane@company.com',
trainingName: 'Python Basics',
startDate: '2026-05-01',
endDate: '2026-05-10',
rowIndex: 5,
},
errors: [
'Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)',
],
warnings: [],
},
// ... more invalid employees
],
validationErrors: [
'Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)',
'Row 8 - Training: Training name mismatch. Expected: "Python Basics", Got: "Java Advanced"',
'Row 12 - Start Date: Expected "2026-05-01", Got "2026-05-02"',
// ... more errors
],
timestamp: '2026-05-23T10:30:45.123Z',
},
};

// ─────────────────────────────────────────────────────────────
// Example 7: Processing Valid Employees for Next Steps
// ─────────────────────────────────────────────────────────────

function processValidEmployees(validationResult) {
const { validData, invalidData, summary } = validationResult;

console.log(`📊 Processing results:`);
console.log(`  Total: ${summary.totalRows}`);
console.log(`  Valid: ${summary.validEmployees} (${summary.successRate}%)`);
console.log(`  Invalid: ${summary.invalidEmployees}`);

if (validData.length > 0) {
console.log('\n✓ Valid employees ready for:');
console.log(' - Template generation');
console.log(' - Certificate generation');
console.log(' - Email sending');

    // Filter by email for email sending
    const emailList = validData
      .filter((emp) => emp.email && emp.email.includes('@'))
      .map((emp) => emp.email);

    console.log(`  - Email recipients: ${emailList.length}`);

}

if (invalidData.length > 0) {
console.log('\n✗ Invalid employees - Review needed:');
invalidData.forEach((invalid) => {
console.log(`  Row ${invalid.employee.rowIndex}: ${invalid.employee.name}`);
invalid.errors.forEach((error) => console.log(`    - ${error}`));
});

    // Save invalid records for review
    const invalidRecordsForReview = invalidData.map((inv) => ({
      rowIndex: inv.employee.rowIndex,
      employee: inv.employee,
      errors: inv.errors,
    }));

    console.log('\n💾 Save these invalid records for review:');
    console.log(JSON.stringify(invalidRecordsForReview, null, 2));

}
}

// ─────────────────────────────────────────────────────────────
// Example 8: Error Handling
// ─────────────────────────────────────────────────────────────

async function handleValidationError(error) {
console.error('❌ Validation failed:', error.message);

// Different error types
if (error.message.includes('parse')) {
console.error('→ Excel file format issue. Ensure file is .xlsx');
} else if (error.message.includes('missing')) {
console.error('→ Required fields missing from Excel');
} else if (error.message.includes('connection')) {
console.error('→ Backend server not responding. Start backend with: npm run dev');
}

// Fallback to manual review
console.log('\n📋 Fallback: Manual review of Excel file');
}

// ─────────────────────────────────────────────────────────────
// Export Examples
// ─────────────────────────────────────────────────────────────

module.exports = {
validEmployeeExample,
invalidEmployeeExamples,
dateFormatExamples,
batchInfoExample,
validateExcelFile,
expectedResponseExample,
processValidEmployees,
handleValidationError,
};
