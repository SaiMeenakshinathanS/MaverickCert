# Backend Validation Rules & Error Messages

## Employee ID Validation

### Rule

- **Length:** Exactly 10 digits
- **Format:** Numeric only
- **Characters:** No letters, spaces, or special characters

### Validation Code

```javascript
const validateEmployeeId = (id) => {
  if (!id) return { valid: false, error: "Employee ID is required" };
  const idStr = String(id).trim();
  if (!/^\d{10}$/.test(idStr)) {
    return {
      valid: false,
      error: "Employee ID must contain exactly 10 digits (numeric only)",
    };
  }
  return { valid: true };
};
```

### Examples

| Input         | Valid | Reason                    |
| ------------- | ----- | ------------------------- |
| `1234567890`  | ✅    | Exactly 10 digits         |
| `12345`       | ❌    | Too short (5 digits)      |
| `12345678901` | ❌    | Too long (11 digits)      |
| `EMP1234567`  | ❌    | Contains letters          |
| `1234 567890` | ❌    | Contains space            |
| `123456789A`  | ❌    | Contains letter 'A'       |
| `12345-6789`  | ❌    | Contains special char '-' |

### Error Response

```
"Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)"
```

---

## Training Name Validation

### Rule

- **Comparison:** Must match batch training name exactly
- **Case:** Insensitive (ignores upper/lowercase)
- **Spaces:** Extra spaces are ignored (trimmed)

### Validation Code

```javascript
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
```

### Examples

| Batch           | Excel              | Valid | Reason                 |
| --------------- | ------------------ | ----- | ---------------------- |
| `Python Basics` | `Python Basics`    | ✅    | Exact match            |
| `Python Basics` | `python basics`    | ✅    | Case-insensitive match |
| `Python Basics` | `python basics`    | ✅    | Extra spaces ignored   |
| `Python Basics` | `PYTHON BASICS`    | ✅    | All uppercase          |
| `Python Basics` | `Java Advanced`    | ❌    | Completely different   |
| `Python Basics` | `Python`           | ❌    | Partial match only     |
| `Python Basics` | `Python Basics II` | ❌    | Extra text             |

### Error Response

```
"Row 8 - Training: Training name mismatch. Expected: "Python Basics", Got: "Java Advanced""
```

---

## Start Date Validation

### Rule

- **Match:** Must match batch Training Start Date exactly
- **Comparison:** Dates are normalized to YYYY-MM-DD format

### Supported Date Formats

1. **ISO Format:** `2026-05-01` (YYYY-MM-DD)
2. **European Format:** `01-05-2026` (DD-MM-YYYY)
3. **European Slash:** `01/05/2026` (DD/MM/YYYY)
4. **Excel Serial:** `45450` (Excel date serial)
5. **Date Objects:** `new Date('2026-05-01')`

### Validation Code

```javascript
const compareDates = (date1, date2) => {
  const normalized1 = normalizeDateToString(date1);
  const normalized2 = normalizeDateToString(date2);
  if (!normalized1 || !normalized2) return false;
  return normalized1 === normalized2;
};
```

### Examples

| Batch        | Excel          | Valid | Reason                      |
| ------------ | -------------- | ----- | --------------------------- |
| `2026-05-01` | `2026-05-01`   | ✅    | Exact match                 |
| `2026-05-01` | `01-05-2026`   | ✅    | Different format, same date |
| `2026-05-01` | `01/05/2026`   | ✅    | Different format, same date |
| `2026-05-01` | `2026-05-02`   | ❌    | One day difference          |
| `2026-05-01` | `2026-06-01`   | ❌    | Different month             |
| `2026-05-01` | `2025-05-01`   | ❌    | Different year              |
| `2026-05-01` | `Invalid Date` | ❌    | Unparseable format          |

### Error Response

```
"Row 12 - Start Date: Expected "2026-05-01", Got "2026-05-02""
```

---

## End Date Validation

### Rule

- **Match:** Must match batch Training End Date exactly
- **Comparison:** Same as Start Date validation

### Examples

| Batch        | Excel        | Valid | Reason                      |
| ------------ | ------------ | ----- | --------------------------- |
| `2026-05-10` | `2026-05-10` | ✅    | Exact match                 |
| `2026-05-10` | `10-05-2026` | ✅    | Different format, same date |
| `2026-05-10` | `10/05/2026` | ✅    | Different format, same date |
| `2026-05-10` | `2026-05-09` | ❌    | One day before expected     |
| `2026-05-10` | `2026-05-11` | ❌    | One day after expected      |

### Error Response

```
"Row 15 - End Date: Expected "2026-05-10", Got "2026-05-11""
```

---

## Email Validation

### Rule

- **Format:** Valid email format (contains @ and domain)
- **Required:** Must not be empty
- **Type:** Warning (non-blocking) if invalid

### Validation Code

```javascript
const validateEmail = (email) => {
  if (!email) return { valid: false, error: "Email is required" };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: `Invalid email format: "${email}"` };
  }
  return { valid: true };
};
```

### Examples

| Input                    | Valid | Reason                 |
| ------------------------ | ----- | ---------------------- |
| `john@company.com`       | ✅    | Valid format           |
| `user.name@domain.co.uk` | ✅    | Valid format with dots |
| `invalid-email`          | ❌    | Missing @ and domain   |
| `user@`                  | ❌    | Missing domain         |
| `@domain.com`            | ❌    | Missing username       |
| `user name@domain.com`   | ❌    | Contains space         |
| ``                       | ❌    | Empty (required)       |

### Warning Response

```
"Row 18 - Email: Invalid email format: "invalid-email""
```

---

## Complete Validation Flow

### Step 1: Extract Employee Data

```javascript
{
  employeeId: "1234567890",
  name: "John Doe",
  email: "john@company.com",
  trainingName: "Python Basics",
  startDate: "2026-05-01",
  endDate: "2026-05-10",
  rowIndex: 2
}
```

### Step 2: Validate Each Field

```javascript
✓ Employee ID: 1234567890 → VALID
✓ Training Name: "Python Basics" → MATCHES
✓ Start Date: "2026-05-01" → MATCHES
✓ End Date: "2026-05-10" → MATCHES
✓ Email: "john@company.com" → VALID
```

### Step 3: Determine Result

```javascript
isValid = (no errors) && (no warnings)

// If all checks pass:
Result: VALID ✓
Employee ready for certificate generation

// If any check fails:
Result: INVALID ✗
Employee needs review/correction
```

---

## API Response Example

### Success Response

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
        "email": "john@company.com",
        "trainingName": "Python Basics",
        "startDate": "2026-05-01",
        "endDate": "2026-05-10",
        "rowIndex": 2
      }
    ],
    "invalidData": [
      {
        "employee": {
          "employeeId": "12345",
          "name": "Jane Smith",
          "email": "jane@company.com",
          "trainingName": "Python Basics",
          "startDate": "2026-05-01",
          "endDate": "2026-05-10",
          "rowIndex": 5
        },
        "errors": [
          "Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)"
        ],
        "warnings": []
      }
    ],
    "validationErrors": [
      "Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)",
      "Row 8 - Training: Training name mismatch. Expected: \"Python Basics\", Got: \"Java Advanced\"",
      "Row 12 - Start Date: Expected \"2026-05-01\", Got \"2026-05-02\""
    ],
    "timestamp": "2026-05-23T10:30:45.123Z"
  }
}
```

### Error Response

```json
{
  "error": true,
  "message": "Failed to parse Excel file",
  "details": "File format not supported"
}
```

---

## Date Normalization Details

### How Dates Are Normalized

All dates are converted to `YYYY-MM-DD` format for comparison:

```javascript
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
```

### Excel Serial Date Conversion

Excel stores dates as days since 1/1/1900:

```javascript
const excelDateToDate = (excelDate) => {
  const EXCEL_DATE_BASE = 25569; // Days between 1/1/1900 and 1/1/1970
  const MS_PER_DAY = 86400000;
  return new Date((excelDate - EXCEL_DATE_BASE) * MS_PER_DAY);
};
```

**Example:**

- Excel serial `45450` = May 1, 2026
- Excel serial `45459` = May 10, 2026

---

## Summary Table

| Field         | Type    | Length     | Format           | Required | Blocking |
| ------------- | ------- | ---------- | ---------------- | -------- | -------- |
| Employee ID   | Numeric | Exactly 10 | Digits only      | ✅       | ✅       |
| Training Name | String  | Any        | Must match       | ✅       | ✅       |
| Start Date    | Date    | -          | Multiple formats | ✅       | ✅       |
| End Date      | Date    | -          | Multiple formats | ✅       | ✅       |
| Email         | String  | -          | Valid format     | ✅       | ❌       |
| Employee Name | String  | -          | Any text         | ❌       | ❌       |

---

## Quick Reference

### Employee ID Pattern

```regex
^\d{10}$
```

### Email Pattern

```regex
^[^\s@]+@[^\s@]+\.[^\s@]+$
```

### Date Formats Supported

```
YYYY-MM-DD
DD-MM-YYYY
DD/MM/YYYY
Excel serial numbers
JavaScript Date objects
```

### Valid/Invalid Counts

```
Total = Valid + Invalid
Success Rate = (Valid / Total) × 100%
```

All valid employees proceed to next steps.
All invalid employees are flagged for review.
