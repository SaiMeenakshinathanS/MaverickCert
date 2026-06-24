# Maverick Certify - Complete Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Backend

```bash
# Copy environment template
cp .env.example .env

# .env file is ready (default PORT=5000)
```

### Step 3: Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:

```
✓ Server running on http://localhost:5000
✓ CORS enabled for frontend requests
```

### Step 4: Configure Frontend

Frontend is already configured to use `http://localhost:5000` by default.

If your backend runs on a different port/URL, update:

```
maverick-certify/.env
```

```env
VITE_BACKEND_URL=http://localhost:5000
```

### Step 5: Run Frontend

```bash
cd maverick-certify
npm run dev
```

Frontend will be at `http://localhost:5173`

---

## 📋 System Requirements

- Node.js 14+ (LTS recommended)
- npm 6+
- Modern web browser
- Excel file support (.xlsx, .xls, .csv)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│                                             │
│           React Frontend                    │
│        (http://localhost:5173)              │
│                                             │
└──────────────────┬──────────────────────────┘
                   │
                   │ HTTP Requests
                   │
┌──────────────────▼──────────────────────────┐
│                                             │
│        Express Backend API                  │
│      (http://localhost:5000)                │
│                                             │
│    ┌──────────────────────────────────┐    │
│    │  Upload Validation Endpoint      │    │
│    │  POST /api/upload/validate       │    │
│    └──────────────────────────────────┘    │
│                                             │
│    ┌──────────────────────────────────┐    │
│    │  Services                        │    │
│    │  - Excel Parser                  │    │
│    │  - Validation Engine             │    │
│    │  - Date Utils                    │    │
│    │  - Field Validators              │    │
│    └──────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Mavericks-certify-v1-master/
│
├── maverick-certify/               (Frontend - React)
│   ├── src/
│   │   ├── pages/
│   │   │   └── CreateBatch.jsx    (Updated with new form)
│   │   └── services/
│   │       └── api.js             (Updated to call backend)
│   ├── .env                        (Backend URL config)
│   └── package.json
│
└── backend/                        (NEW - Express API)
    ├── server.js                   (Main server)
    ├── package.json                (Dependencies)
    ├── .env                        (Server config)
    ├── routes/
    │   └── uploadRoutes.js         (Upload endpoints)
    ├── services/
    │   ├── excelService.js         (Excel parsing)
    │   └── validationService.js    (Validation logic)
    └── utils/
        ├── dateUtils.js            (Date handling)
        └── validators.js           (Field validation)
```

---

## 🔄 Data Flow

### Upload & Validation Flow

```
1. User fills Batch Info
   ├── Training Name: "Python Basics"
   ├── Start Date: "2026-05-01"
   └── End Date: "2026-05-10"

2. User uploads Excel file
   └── Contains: Employee ID, Name, Email, Training, Dates

3. Frontend reads Excel file
   └── Converts to Base64
   └── Sends to backend API

4. Backend validates data
   ├── Parses Excel
   ├── Validates each employee:
   │   ├── Employee ID (10 digits)
   │   ├── Training Name (exact match)
   │   ├── Start Date (exact match)
   │   ├── End Date (exact match)
   │   └── Email (valid format)
   └── Groups results

5. Backend returns validation result
   ├── Valid employees (ready for certificates)
   ├── Invalid employees (with errors)
   └── Summary statistics

6. Frontend displays results
   ├── Success rate
   ├── Valid employee count
   ├── Invalid employee details
   └── Option to proceed or fix
```

---

## ✅ Validation Rules

### 1. Employee ID

```
✓ VALID:     1234567890
✗ INVALID:   EMP001, 12345, 1234abcd56, 123 456 7890
Rules:
- Exactly 10 digits
- Numeric only
- No spaces/letters/special chars
```

### 2. Training Name

```
✓ VALID:     "Python Basics" matches " python basics "
✗ INVALID:   "Java Advanced" when expecting "Python Basics"
Rules:
- Must match batch training name
- Case-insensitive
- Ignore extra spaces
```

### 3. Training Dates

```
✓ VALID:     2026-05-01 matches 05/01/2026 matches Excel serial
✗ INVALID:   2026-05-02 when expecting 2026-05-01
Rules:
- Must match exactly
- Supports: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, Excel serial dates
```

### 4. Email

```
✓ VALID:     john@company.com, user@domain.co.uk
✗ INVALID:   invalid-email, user@, @domain.com
Rules:
- Valid email format
- Required field
- Non-blocking warning if invalid
```

---

## 🧪 Testing

### Test with Mock Data

1. Prepare a test Excel file with sample data
2. Use the examples in `backend/EXAMPLES.md`
3. Upload through the UI

### Test API Directly

```bash
# Check if backend is running
curl http://localhost:5000/api/upload/health

# Expected response:
# {
#   "status": "ok",
#   "service": "Upload & Validation Service",
#   "timestamp": "2026-05-23T10:30:45.123Z"
# }
```

### Check Backend Logs

Backend logs validation details to console:

```
📨 UPLOAD VALIDATION REQUEST RECEIVED
📦 File size: 45.23 KB
📄 Parsing Excel file...
✓ Found 120 data rows
🔍 Validating employee at row 2...
✓ Employee row 2 is VALID
...
📊 VALIDATION SUMMARY
✓ Valid Employees: 98
✗ Invalid Employees: 22
Success Rate: 81.67%
```

---

## 🐛 Troubleshooting

### Backend not starting

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:** Port 5000 is in use. Either:

- Kill the process using port 5000
- Use a different port in `.env`: `PORT=5001`

### CORS Error

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**

- Backend is running? (Check `http://localhost:5000/api/upload/health`)
- Frontend `.env` has correct backend URL? (Check `VITE_BACKEND_URL`)
- Restart both servers

### Excel parsing error

**Error:** `Failed to parse Excel file`

**Solution:**

- Excel file must be `.xlsx`, `.xls`, or `.csv` format
- First row must contain headers
- Check Excel file is not corrupted

### Validation always fails

**Checklist:**

1. Employee IDs are exactly 10 digits? ✓
2. Training names match exactly (case-insensitive)? ✓
3. Dates match batch configuration? ✓
4. Date formats are valid? ✓

---

## 📊 Expected Results

After successful validation, you should see:

```
✓ Valid Employees: 98
✗ Invalid Employees: 22
Success Rate: 81.67%
```

**Valid employees are ready for:**

- Template generation
- Certificate generation
- Email sending

**Invalid employees:**

- Shown with specific errors
- Can be reviewed and corrected
- Need to be resubmitted

---

## 🔐 Security Notes

- File size limit: 50MB
- Only `.xlsx`, `.xls`, `.csv` files allowed
- No sensitive data stored in logs
- CORS restricted to frontend origin
- Input validation on all fields

---

## 📚 Additional Resources

- **Backend API Docs:** `backend/README.md`
- **Examples & Test Data:** `backend/EXAMPLES.md`
- **Frontend Setup:** `maverick-certify/README.md`
- **Form Updates:** `CreateBatch.jsx` changes documented

---

## 🚀 Deployment

### Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd maverick-certify && npm run dev
```

### Production

```bash
# Backend
cd backend
npm install --production
NODE_ENV=production npm start

# Frontend
cd maverick-certify
npm run build
# Serve dist/ folder
```

---

## ✨ Next Steps

1. ✅ Start backend: `npm run dev` (in backend folder)
2. ✅ Start frontend: `npm run dev` (in maverick-certify folder)
3. ✅ Open http://localhost:5173
4. ✅ Create a new batch
5. ✅ Upload Excel file with employee data
6. ✅ Review validation results
7. ✅ Proceed to certificate generation

---

## 📞 Support

For issues:

1. Check backend is running: `curl http://localhost:5000/api/upload/health`
2. Check frontend `.env` points to correct backend URL
3. Review backend console logs for detailed validation info
4. Verify Excel file format matches requirements

Happy certifying! 🎉
