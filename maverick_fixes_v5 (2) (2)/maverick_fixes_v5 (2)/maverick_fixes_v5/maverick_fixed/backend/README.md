# Maverick Certify - Backend API Documentation

## Overview

Backend validation service for Maverick Certify that validates uploaded Excel employee data against batch information.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Update .env with your configuration
```

### 3. Start Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server will run on `http://localhost:5000`

---

## API Endpoints

### POST /api/upload/validate

Validates uploaded Excel file against batch information.

**Request:**

```javascript
{
  "fileBase64": "base64_encoded_file_content",
  "batchInfo": {
    "trainingName": "Python Basics",
    "trainingStartDate": "2026-05-01",
    "trainingEndDate": "2026-05-10"
  }
}
```

**Response (Success):**

```json
{
  "error": false,
  "message": "Validation completed successfully",
  "data": {
    "summary": {
      "totalRows": 120,
      "validEmployees": 98,
      "invalidEmployees": 22,
      "successRate": 81.67
    },
    "validData": [
      {
        "employeeId": "1234567890",
        "name": "John Doe",
        "email": "john@example.com",
        "trainingName": "Python Basics",
        "startDate": "2026-05-01",
        "endDate": "2026-05-10"
      }
    ],
    "invalidData": [
      {
        "employee": {
          "employeeId": "12345",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "trainingName": "Python Basics",
          "startDate": "2026-05-01",
          "endDate": "2026-05-10"
        },
        "errors": [
          "Row 5 - Employee ID: Employee ID must contain exactly 10 digits"
        ],
        "warnings": []
      }
    ],
    "validationErrors": [
      "Row 5 - Employee ID: Employee ID must contain exactly 10 digits",
      "Row 8 - Training: Training name does not match batch training",
      "Row 12 - Start Date: Expected \"2026-05-01\", Got \"2026-05-02\""
    ],
    "timestamp": "2026-05-23T10:30:45.123Z"
  }
}
```

**Response (Error):**

```json
{
  "error": true,
  "message": "Failed to parse Excel file",
  "details": "Error message details"
}
```

### GET /api/upload/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "service": "Upload & Validation Service",
  "timestamp": "2026-05-23T10:30:45.123Z"
}
```

---

## Validation Rules

### 1. Employee ID

- Must be exactly **10 digits**
- **Numeric only** (no letters or special characters)
- No spaces

Valid: `1234567890`
Invalid: `EMP001`, `12345`, `1234abcd56`

### 2. Training Name

- Must **match** application training name exactly
- **Case-insensitive**
- Extra spaces are ignored

Example:

```
Application: "Python Basics"
Excel:       " python basics "
Result:      ✓ VALID
```

### 3. Training Dates

- Start Date must match application's Training Start Date
- End Date must match application's Training End Date

Supported date formats:

- `2026-05-01` (YYYY-MM-DD)
- `01-05-2026` (DD-MM-YYYY)
- `01/05/2026` (DD/MM/YYYY)
- Excel serial dates
- Date objects

### 4. Email

- Must be valid email format
- Required field
- Invalid email shows warning (non-blocking)

---

## Integration with Frontend

Update `src/services/api.js` to call the backend:

```javascript
export const validateUploadedFile = async (file, batchInfo) => {
  // Read file as base64
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Send to backend
  const response = await fetch("http://localhost:5000/api/upload/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      batchInfo: {
        trainingName: batchInfo.eventName,
        trainingStartDate: batchInfo.trainingStartDate,
        trainingEndDate: batchInfo.trainingEndDate,
      },
    }),
  });

  return response.json();
};
```

---

## Debugging

### Enable Logs

The backend logs detailed information about validation process:

- File parsing details
- Each employee validation result
- Summary statistics

Example logs:

```
📨 UPLOAD VALIDATION REQUEST RECEIVED
📦 File size: 45.23 KB
📄 Parsing Excel file...
✓ Found headers: Employee ID, Employee Name, Email ID, Training Name, Start Date, End Date
✓ Found 120 data rows
🔍 Validating employee at row 2...
✓ Employee row 2 is VALID
...
📊 VALIDATION SUMMARY
✓ Valid Employees: 98
✗ Invalid Employees: 22
Success Rate: 81.67%
```

### Common Issues

**1. File Format Error**

- Ensure Excel file is in `.xlsx` format
- First row should contain headers

**2. Date Mismatch**

- Check date format in Excel
- Ensure dates match batch configuration exactly

**3. Employee ID Error**

- Must be exactly 10 digits
- Remove leading zeros if present
- No spaces or special characters

---

## Project Structure

```
backend/
├── server.js                 # Express server setup
├── package.json             # Dependencies
├── .env.example            # Environment template
├── routes/
│   └── uploadRoutes.js      # Upload validation routes
├── services/
│   ├── excelService.js      # Excel parsing logic
│   └── validationService.js # Validation logic
└── utils/
    ├── dateUtils.js         # Date parsing & normalization
    └── validators.js        # Field validators
```

---

## Future Enhancements

- [ ] Database storage for validation history
- [ ] Retry logic for failed validations
- [ ] Batch processing for large files
- [ ] Webhook notifications
- [ ] Export validation report
- [ ] Redis caching for performance
- [ ] Unit tests

---

## Support

For issues or questions, check:

1. Console logs for validation details
2. Response error messages
3. Validate Excel file format
4. Check environment configuration
