# Excel Validation Testing & Verification Guide

## ✅ Quick Verification Checklist

### 1. Backend is Running

```bash
# Terminal check
curl http://localhost:5000/api/upload/health

# Expected response:
{
  "status": "ok",
  "service": "Upload & Validation Service",
  "timestamp": "2026-05-23T10:30:45.123Z"
}
```

### 2. Frontend .env Configured

```bash
# Check maverick-certify/.env
VITE_BACKEND_URL=http://localhost:5000
```

### 3. Both Servers Running

```bash
# Terminal 1: Backend (should show ✓ Server running)
cd backend && npm run dev

# Terminal 2: Frontend (should show http://localhost:5173)
cd maverick-certify && npm run dev
```

---

## 🧪 Test with Sample Data

### Create Test Excel File

Create `test-employees.xlsx` with these columns:

```
| Employee ID | Employee Name | Email ID           | Training Name  | Start Date | End Date   |
|-------------|---------------|-------------------|----------------|-----------|-----------|
| 1234567890  | John Doe      | john@example.com  | Python Basics  | 2026-05-01| 2026-05-10|
| 9876543210  | Jane Smith    | jane@example.com  | Python Basics  | 2026-05-01| 2026-05-10|
| 101         | Bob Johnson   | bob@example.com   | Python Basics  | 2026-05-01| 2026-05-10|
| EMP1234567  | Alice Brown   | alice@example.com | Python Basics  | 2026-05-01| 2026-05-10|
| 1234567890  | Charlie Davis | charlie@example.com| Python Basics | 2026-05-02| 2026-05-10|
| 5555555555  | Diana Evans   | invalid-email     | Java Advanced  | 2026-05-01| 2026-05-10|
```

### Expected Results

| Row | Employee ID | Status     | Reason                                        |
| --- | ----------- | ---------- | --------------------------------------------- |
| 1   | 1234567890  | ✅ VALID   | All fields match                              |
| 2   | 9876543210  | ✅ VALID   | All fields match                              |
| 3   | 101         | ❌ INVALID | ID too short (3 digits, needs 10)             |
| 4   | EMP1234567  | ❌ INVALID | ID contains letters                           |
| 5   | 1234567890  | ❌ INVALID | Start date mismatch (2026-05-02 ≠ 2026-05-01) |
| 6   | 5555555555  | ❌ INVALID | Training name mismatch + invalid email        |

**Summary:**

- Total Records: 6
- Valid: 2
- Invalid: 4
- Success Rate: 33.33%

---

## 🔍 Backend Console Logs

When you upload the test file, you should see logs like:

```
📨 UPLOAD VALIDATION REQUEST RECEIVED
📦 File size: 25.43 KB
📄 Parsing Excel file...
✓ Found headers: Employee ID, Employee Name, Email ID, Training Name, Start Date, End Date
✓ Found 6 data rows
🔍 Validating employee at row 2...
✓ Employee row 2 is VALID
🔍 Validating employee at row 3...
✓ Employee row 3 is VALID
🔍 Validating employee at row 4...
✗ Employee row 4 is INVALID
  Errors: Row 4 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)
🔍 Validating employee at row 5...
✗ Employee row 5 is INVALID
  Errors: Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only); Row 5 - Email: Invalid email format: "invalid-email"
...
📊 VALIDATION SUMMARY
✓ Valid Employees: 2
✗ Invalid Employees: 4
Success Rate: 33.33%
```

---

## 🎯 Frontend UI Expected Display

### Upload Results Section

**Summary Cards:**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Total Records   │  │     Valid       │  │    Invalid      │
│       6         │  │       2         │  │       4         │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Success Rate: 33.33%
[████░░░░░░░░░░░░░░░░░░░] 33%
```

**Invalid Records Table:**

```
⚠ 4 Record(s) Need Review

Employee ID  │ Name           │ Training       │ Validation Errors
─────────────┼────────────────┼────────────────┼────────────────────────────────
101          │ Bob Johnson    │ Python Basics  │ [Employee ID must contain...]
EMP1234567   │ Alice Brown    │ Python Basics  │ [Employee ID must contain...]
1234567890   │ Charlie Davis  │ Python Basics  │ [Start Date: Expected...]
5555555555   │ Diana Evans    │ Java Advanced  │ [Training name mismatch...]
                                              [Invalid email format...]
```

**Ready for Next Steps:**

```
✓ Ready for Next Steps
2 valid employee(s) are ready for certificate generation
```

---

## ❌ Common Issues & Solutions

### Issue 1: "Validation is not happening" / "All records showing as valid"

**Causes:**

1. Backend not running
2. Frontend CORS error
3. Backend PORT mismatch

**Solution:**

```bash
# 1. Check backend health
curl http://localhost:5000/api/upload/health

# 2. Check frontend .env
cat maverick-certify/.env
# Should show: VITE_BACKEND_URL=http://localhost:5000

# 3. Check browser console for errors
# F12 → Console tab → Look for CORS or network errors

# 4. Restart both servers
# Kill backend: Ctrl+C
# Kill frontend: Ctrl+C
# Restart backend: npm run dev
# Restart frontend: npm run dev
```

### Issue 2: "Employee ID validation not working"

**Check:**

```bash
# Test regex directly
node -e "console.log(/^\d{10}$/.test('1234567890')); // true"
node -e "console.log(/^\d{10}$/.test('101')); // false"
node -e "console.log(/^\d{10}$/.test('EMP1234567')); // false"
```

**If regex works but validation doesn't:**

1. Check backend console for error messages
2. Verify Excel column names exactly match:
   - "Employee ID" (case-sensitive)
   - "Employee Name"
   - "Email ID"
   - "Training Name"
   - "Start Date"
   - "End Date"

### Issue 3: "Excel file won't upload"

**Check:**

1. File format is .xlsx (not .xls or .csv)
2. First row contains headers
3. File size < 50MB
4. No special characters in file name

### Issue 4: "Date validation failing unexpectedly"

**Check date formats in Excel:**

- ✅ Valid: `2026-05-01` (YYYY-MM-DD)
- ✅ Valid: `01-05-2026` (DD-MM-YYYY)
- ✅ Valid: `01/05/2026` (DD/MM/YYYY)
- ❌ Invalid: `5/1/26` (ambiguous)
- ❌ Invalid: `May 1, 2026` (text format)

---

## 📊 Expected Validation Output Format

When validation completes, frontend receives:

```json
{
  "error": false,
  "message": "Validation completed successfully",
  "data": {
    "summary": {
      "totalRows": 6,
      "validEmployees": 2,
      "invalidEmployees": 4,
      "successRate": 33.33
    },
    "validData": [
      {
        "employeeId": "1234567890",
        "name": "John Doe",
        "email": "john@example.com",
        "trainingName": "Python Basics",
        "startDate": "2026-05-01",
        "endDate": "2026-05-10",
        "rowIndex": 2
      },
      {
        "employeeId": "9876543210",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "trainingName": "Python Basics",
        "startDate": "2026-05-01",
        "endDate": "2026-05-10",
        "rowIndex": 3
      }
    ],
    "invalidData": [
      {
        "employee": {
          "employeeId": "101",
          "name": "Bob Johnson",
          "email": "bob@example.com",
          "trainingName": "Python Basics",
          "startDate": "2026-05-01",
          "endDate": "2026-05-10",
          "rowIndex": 4
        },
        "errors": [
          "Row 4 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)"
        ],
        "warnings": []
      },
      {
        "employee": {
          "employeeId": "EMP1234567",
          "name": "Alice Brown",
          "email": "alice@example.com",
          "trainingName": "Python Basics",
          "startDate": "2026-05-01",
          "endDate": "2026-05-10",
          "rowIndex": 5
        },
        "errors": [
          "Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)"
        ],
        "warnings": []
      },
      {
        "employee": {
          "employeeId": "1234567890",
          "name": "Charlie Davis",
          "email": "charlie@example.com",
          "trainingName": "Python Basics",
          "startDate": "2026-05-02",
          "endDate": "2026-05-10",
          "rowIndex": 6
        },
        "errors": [
          "Row 6 - Start Date: Expected \"2026-05-01\", Got \"2026-05-02\""
        ],
        "warnings": []
      },
      {
        "employee": {
          "employeeId": "5555555555",
          "name": "Diana Evans",
          "email": "invalid-email",
          "trainingName": "Java Advanced",
          "startDate": "2026-05-01",
          "endDate": "2026-05-10",
          "rowIndex": 7
        },
        "errors": [
          "Row 7 - Training: Training name mismatch. Expected: \"Python Basics\", Got: \"Java Advanced\""
        ],
        "warnings": ["Row 7 - Email: Invalid email format: \"invalid-email\""]
      }
    ],
    "validationErrors": [
      "Row 4 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)",
      "Row 5 - Employee ID: Employee ID must contain exactly 10 digits (numeric only)",
      "Row 6 - Start Date: Expected \"2026-05-01\", Got \"2026-05-02\"",
      "Row 7 - Training: Training name mismatch. Expected: \"Python Basics\", Got: \"Java Advanced\""
    ],
    "timestamp": "2026-05-23T10:30:45.123Z"
  }
}
```

---

## 🚀 Step-by-Step Test Procedure

### 1. Start Backend

```bash
cd backend
npm install  # (if not done)
npm run dev
```

✓ Should see: `✓ Server running on http://localhost:5000`

### 2. Start Frontend

```bash
cd maverick-certify
npm run dev
```

✓ Should see: `localhost:5173`

### 3. Create Test Batch (Step 1)

- Training Name: `Python Basics`
- Start Date: `2026-05-01`
- End Date: `2026-05-10`
- Organization: `Test Corp`
- Click "Next: Upload Data"

### 4. Upload Test Excel (Step 2)

- Drag & drop `test-employees.xlsx`
- Watch backend console for validation logs
- Wait for results to display

### 5. Verify Results

- Check Summary Cards (Total: 6, Valid: 2, Invalid: 4)
- Check Invalid Records Table (4 records with errors)
- Check Green success indicator (✓ Ready for Next Steps)

### 6. Verify Blocking Logic

- Try clicking "Next: Template" without any valid employees
- Button should be DISABLED (grayed out)
- Only enable when validEmployees.length > 0

---

## 📋 Validation Rules Summary

| Field         | Rule                                         | Example Valid                            | Example Invalid                          |
| ------------- | -------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Employee ID   | Exactly 10 digits `^\d{10}$`                 | `1234567890`                             | `101`, `EMP1234567`, `12345`             |
| Training Name | Match batch name (case-insensitive, trimmed) | `python basics` (batch: `Python Basics`) | `Java Advanced` (batch: `Python Basics`) |
| Start Date    | Match batch start date                       | `2026-05-01` (batch: `2026-05-01`)       | `2026-05-02` (batch: `2026-05-01`)       |
| End Date      | Match batch end date                         | `2026-05-10` (batch: `2026-05-10`)       | `2026-05-11` (batch: `2026-05-10`)       |
| Email         | Valid format (non-blocking warning)          | `john@example.com`                       | `invalid-email`                          |

---

## 🎯 Success Criteria

✅ **Backend validation working:**

- Server responds with proper validation results
- Invalid Employee IDs (101, EMP001, etc.) are rejected
- Date mismatches are detected
- Training name mismatches are detected

✅ **Frontend displaying correctly:**

- Summary cards show Total/Valid/Invalid counts
- Invalid records table displays errors
- Valid records show with green indicator
- Next button disabled until valid employees exist

✅ **Business logic enforced:**

- Only valid employees proceed to Step 3
- Invalid employees cannot proceed
- Clear error messages shown to user
- User can see exactly why each record failed

---

## 📞 Quick Debugging Commands

```bash
# Test if backend is accepting requests
curl -X GET http://localhost:5000/api/upload/health

# Check backend logs in real-time
# (Already showing in terminal where npm run dev is running)

# View frontend console errors
# F12 in browser → Console tab

# Test Employee ID regex
node -e "console.log(/^\d{10}$/.test('1234567890'))"  # true
node -e "console.log(/^\d{10}$/.test('101'))"         # false

# Check if ports are in use
# macOS/Linux: lsof -i :5000
# Windows: netstat -ano | findstr :5000
```

---

## ✨ What Should NOT Happen

❌ All records showing as valid
❌ Empty validation errors
❌ "Next" button always enabled
❌ No validation happening on upload
❌ Backend console showing no logs
❌ Frontend CORS errors

If any of these occur, follow the troubleshooting section above.
