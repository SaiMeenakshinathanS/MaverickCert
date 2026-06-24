# Sanity Test Guide — Certificate Generation & Email Dispatch

## Overview
This guide covers the key fixes and new features implemented:

### 1. Puppeteer Chrome Configuration Fix
**What was fixed:** Chrome executable not found during certificate PDF generation

**Changes:**
- Improved fallback logic in `certificateService.js`
- Better error messages guiding users to solution
- Support for `CHROME_PATH` environment variable
- Uses "headless: 'new'" instead of deprecated "headless: true"

**How to test:**
```bash
# Option 1: Install Chrome from https://www.google.com/chrome/

# Option 2: Set CHROME_PATH environment variable
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Option 3: Install Puppeteer browsers
npx puppeteer browsers install chrome
```

---

## 2. LLM Integration Fixes

### EmailAgent Initialization
**What was fixed:** `emailAgent is not defined` error

**Changes:**
- Added graceful Groq initialization with validation
- Fallback templates when Groq API key missing
- Better error messages in logs

**Test:**
```bash
# Check that GROQ_API_KEY is set in .env
echo $GROQ_API_KEY

# Verify backend starts without errors
npm run dev:backend
```

---

## 3. Certificate Template Generation (Enhanced)

### New Features:
- **Quick Mode**: Keyword-based style selection (instant, no LLM)
- **Detailed Mode**: LLM-powered style selection with variations

### API Endpoint:
```http
POST /api/certificates/generate-template
Content-Type: application/json

{
  "description": "modern and elegant",
  "trainingName": "Azure Fundamentals",
  "organisation": "Hexavarsity",
  "mode": "detailed",  // or "quick"
  "requestVariations": true
}
```

### Test Quick Mode:
```bash
curl -X POST http://localhost:5000/api/certificates/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "description": "minimal and clean",
    "trainingName": "Azure",
    "organisation": "Hexavarsity",
    "mode": "quick"
  }'
```

### Expected Response (Quick Mode):
```json
{
  "success": true,
  "data": {
    "style": "minimal",
    "title": "Certificate of Completion",
    "suggestions": [],
    "alternatives": [],
    "followUp": null,
    "mode": "quick"
  }
}
```

### Test Detailed Mode:
```bash
curl -X POST http://localhost:5000/api/certificates/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "description": "professional corporate style",
    "trainingName": "Azure Fundamentals",
    "organisation": "Hexavarsity",
    "mode": "detailed",
    "requestVariations": true
  }'
```

---

## 4. Email Template Generation (Enhanced)

### New Features:
- **Quick Mode**: Pre-built email templates (instant)
- **Detailed Mode**: LLM-generated templates with variations
- **Feedback-based refinement**: Iterate on templates
- **Multiple variations**: Get alternatives with one request

### API Endpoint:
```http
POST /api/email/generate-template
Content-Type: application/json

{
  "trainingName": "Azure Fundamentals",
  "organisation": "Hexavarsity",
  "trainingStartDate": "2026-05-01",
  "trainingEndDate": "2026-05-31",
  "mode": "detailed",
  "feedback": "make it more celebratory",
  "requestVariations": true
}
```

### Test Quick Mode:
```bash
curl -X POST http://localhost:5000/api/email/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "trainingName": "Azure Fundamentals",
    "organisation": "Hexavarsity",
    "trainingStartDate": "2026-05-01",
    "trainingEndDate": "2026-05-31",
    "mode": "quick"
  }'
```

### Test Detailed Mode with Variations:
```bash
curl -X POST http://localhost:5000/api/email/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "trainingName": "Azure Fundamentals",
    "organisation": "Hexavarsity",
    "trainingStartDate": "2026-05-01",
    "trainingEndDate": "2026-05-31",
    "mode": "detailed",
    "requestVariations": true
  }'
```

---

## 5. Email Sending with Custom Templates

### Updated Endpoint:
```http
POST /api/email/send/:batchId
Content-Type: application/json

{
  "subject": "Your {{first_name}}, certificate is here!",
  "body": "Dear {{first_name}},\n\nYou've completed the training!\n\nBest,\nHexavarsity"
}
```

### Test Steps:
1. **Generate certificate for a batch first** (must have PDF files)
2. **Generate template** (using LLM or quick mode)
3. **Send emails** with the generated template

```bash
# Step 1: Generate template
curl -X POST http://localhost:5000/api/email/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "trainingName": "Azure Fundamentals",
    "organisation": "Hexavarsity",
    "trainingStartDate": "2026-05-01",
    "trainingEndDate": "2026-05-31",
    "mode": "detailed"
  }' > template.json

# Step 2: Extract subject and body from response
# Step 3: Send emails with custom template
curl -X POST http://localhost:5000/api/email/send/HEX-2026-001 \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "...",  # from template.json
    "body": "..."      # from template.json
  }'
```

---

## Frontend Integration Testing

### Certificate Page
**Location:** `maverick-certify/src/pages/Certificates.jsx`
- View generated certificates
- Download PDFs
- Filter by batch and status

**Test:**
- Navigate to Certificates page
- Verify certificates are listed
- Try downloading a PDF

### Email Generator Page
**Location:** `maverick-certify/src/pages/EmailGenerator.jsx`
- **New:** Template mode selector (Tone Presets / Quick LLM / Advanced LLM)
- Generate templates with different modes
- Send emails with generated templates
- View dispatch results and logs

**Test Steps:**
1. Go to Email Generator page
2. Enter batch ID (e.g., HEX-2026-001)
3. Select "Advanced LLM" mode
4. Click to generate template
5. Preview generated email
6. Send certificates
7. Check email logs for results

---

## Troubleshooting

### Chrome Not Found
**Error:** `Could not find Chrome (ver. xxx)`

**Solution:**
```bash
# Install Chrome
# Or set environment variable
export CHROME_PATH="/path/to/chrome/executable"

# Or install Puppeteer browsers
npx puppeteer browsers install chrome
```

### GROQ_API_KEY Missing
**Error:** "Groq not initialized" in logs

**Solution:**
```bash
# Add to .env file
GROQ_API_KEY=your_actual_groq_api_key_here

# Restart backend
npm run dev:backend
```

### Email Template Generation Failing
**Error:** Template generation returns empty or error

**Solution:**
1. Check GROQ_API_KEY is valid
2. Verify batch data has proper dates and names
3. Try "Quick Mode" first (doesn't require LLM)
4. Check backend logs for details

---

## Environment Setup

### Required Environment Variables
```bash
# .env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017/maverick
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GROQ_API_KEY=your-groq-api-key
CHROME_PATH=/path/to/chrome  # Optional
```

### Backend Start
```bash
cd MaverickCertify_Fixed/maverick_project/backend
npm install
npm run dev:backend
```

### Frontend Start
```bash
cd MaverickCertify_Fixed/maverick_project/maverick-certify
npm install
npm run dev:frontend
```

---

## Quick Sanity Checklist

### ✅ Backend Health
- [ ] Server starts without errors
- [ ] Health endpoint: `GET http://localhost:5000/api/health` returns `{status: "ok"}`
- [ ] MongoDB connection successful
- [ ] Environment variables loaded

### ✅ Certificate Generation
- [ ] Template generation (quick mode) works
- [ ] Template generation (detailed mode) works with LLM
- [ ] Puppeteer launches and creates PDFs
- [ ] PDFs saved to `backend/uploads/certificates/`

### ✅ Email Features
- [ ] Template generation (quick mode) works
- [ ] Template generation (detailed mode with variations) works
- [ ] Email dispatch sends successfully
- [ ] Email logs saved to database
- [ ] LinkedIn reminders function

### ✅ Frontend
- [ ] Certificates page loads and displays data
- [ ] Email Generator page loads
- [ ] Template mode switcher works
- [ ] Email sending via UI works
- [ ] Results and logs display correctly

---

## Performance Notes

- **Template Generation**: ~3-5 seconds with LLM (detailed mode)
- **Quick Mode**: < 100ms (keyword-based)
- **Certificate PDF Generation**: ~5-10 seconds per certificate (depends on Puppeteer)
- **Email Dispatch**: ~1-2 seconds per recipient

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| Puppeteer | Better fallback logic | Fixes Chrome not found errors |
| Groq Init | Graceful initialization | Fixes emailAgent undefined errors |
| Cert Routes | Added mode selection | Supports quick and detailed template generation |
| Email Routes | Added mode selection | Supports quick and detailed template generation |
| Email Service | Better error handling | Prevents silent failures |
| Email Page | Template mode selector | Users can choose LLM or preset templates |
| API Service | sendEmail now accepts template | Custom templates can be sent |

---

## Next Steps

1. **Monitor Logs**: Watch backend logs for any errors
2. **Test All Paths**: Go through complete workflow (upload → validate → generate cert → send email)
3. **Verify Database**: Check MongoDB for created records
4. **Load Testing**: Test with batch of 100+ employees (if needed)
5. **User Feedback**: Gather feedback on new LLM template features
