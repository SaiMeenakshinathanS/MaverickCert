# MongoDB Setup Checklist ✅

Complete this checklist to activate MongoDB integration.

---

## 📋 Pre-Setup (You've Already Done)

- [x] MongoDB Atlas account created
- [x] Cluster "Cluster0" created
- [x] Connection string copied (mongodb+srv://...)

---

## ⚙️ Step 1: Update backend/.env

**File:** `backend/.env`

**What to do:**

1. Open the `.env` file in `backend/` folder
2. Find the line starting with `MONGODB_URI=`
3. Replace `USERNAME:PASSWORD@cluster0.xxxxx` with your real credentials

**Before:**

```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/maverick_certify?retryWrites=true&w=majority
```

**After (example with real values):**

```
MONGODB_URI=mongodb+srv://admin:MySecurePassword@cluster0.abc123def.mongodb.net/maverick_certify?retryWrites=true&w=majority
```

**How to get your values:**

1. Go to MongoDB Atlas → Cluster → Connect
2. Click "Drivers" tab
3. Copy the connection string
4. Replace USERNAME and PASSWORD

---

## 🔒 Password Encoding

If your password has special characters, encode them:

- `@` becomes `%40`
- `#` becomes `%23`
- `:` becomes `%3A`

Example:

- Password: `Pass@Word#123`
- Encoded: `Pass%40Word%23123`

---

## ✓ Step 2: Verify IP Whitelist

**MongoDB Atlas Security:**

1. Go to MongoDB Atlas dashboard
2. Click "Network Access"
3. Check if your IP is whitelisted
4. If not:
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (for development)
   - Or enter your specific IP
5. Wait 1-2 minutes for changes to take effect

---

## 🚀 Step 3: Start Backend

```bash
# Terminal 1: Backend
cd backend
npm run dev

# You should see:
# 🔌 Connecting to MongoDB...
# ✓ MongoDB connected successfully
# ✓ Database: maverick_certify
# ✓ Host: cluster0-abc123.mongodb.net
# ✓ Server running on http://localhost:5000
```

**If you see MongoDB logs, you're good!**

---

## 💻 Step 4: Start Frontend

```bash
# Terminal 2: Frontend
cd maverick-certify
npm run dev

# You should see:
# VITE v5.0.0 ready in XXX ms
# ➜  Local:   http://localhost:5173
```

---

## 🧪 Step 5: Quick Test

**In your browser:**

1. Go to http://localhost:5173
2. Fill out Step 1: Create Batch
   - Training Name: `Python Basics`
   - Start Date: `2026-05-01`
   - End Date: `2026-05-10`
   - Organization: `Test Corp`
3. Click "Next: Upload Data"
4. Upload a test Excel file
5. See validation results

**Check backend console:** Should show database save logs

---

## 🔍 Step 6: Verify MongoDB Storage

**In MongoDB Atlas:**

1. Log in to https://account.mongodb.com
2. Click your cluster
3. Click "Collections" tab
4. Look for `maverick_certify` database
5. Check collections:
   - ✓ `batches` - Batch metadata
   - ✓ `employees` - Valid employees only
   - ✓ `validationlogs` - Invalid employees with errors

---

## ❌ Troubleshooting

### Backend won't connect to MongoDB

**Error:** `getaddrinfo ENOTFOUND cluster0...`

- Check cluster URL in `.env`
- Check internet connection
- Try copying fresh connection string

**Error:** `authentication failed`

- Check username/password in `.env`
- Make sure password is URL-encoded if special chars
- Reset password in MongoDB Atlas if needed

**Error:** `IP Address Not Whitelisted`

- Go to MongoDB Atlas → Network Access
- Add your IP address
- Wait 1-2 minutes
- Restart backend

### MongoDB isn't saving data

**Check:**

1. Backend console shows "✓ Saved X valid employees"
2. No error messages in backend console
3. MongoDB Atlas shows documents in collections

### Can't see collections in MongoDB Atlas

**Collections auto-create when first document inserted**

- Upload a test file to trigger creation
- Refresh MongoDB Atlas page
- Check `maverick_certify` database

---

## ✅ Success Indicators

You'll know it's working when:

✅ Backend logs show "✓ MongoDB connected successfully"  
✅ Frontend creates batch without errors  
✅ Excel upload validates and shows results  
✅ Backend logs show "✓ Saved X valid employees"  
✅ MongoDB Atlas shows documents in collections  
✅ `employees` collection has valid employees  
✅ `validationlogs` collection has invalid employees  
✅ `batches` collection has batch metadata

---

## 📊 What Gets Saved

After uploading a test file:

**MongoDB Collections:**

```
maverick_certify/
├── batches
│  └── 1 document: Batch metadata + status
├── employees
│  └── 2+ documents: Valid employees only
└── validationlogs
   └── 0+ documents: Invalid employees + errors
```

---

## 📚 Documentation

For more details, see:

- **Setup:** `MONGODB_INTEGRATION_GUIDE.md`
- **API Reference:** `backend/API_DOCUMENTATION.md`
- **Implementation:** `MONGODB_IMPLEMENTATION_COMPLETE.md`
- **Quick Reference:** `QUICK_REFERENCE.md`

---

## 🎯 Next Steps After Setup

Once MongoDB is connected:

1. **Verify storage** - Check MongoDB Atlas collections
2. **Test thoroughly** - Upload various test files
3. **Continue workflow** - Work on Step 3 (Certificate Template)
4. **Prepare for AI** - Backend ready for CrewAI agents

---

## 💡 Important Reminders

- 🔒 **Never commit `.env`** - It contains secrets
- 🔑 **Keep credentials safe** - Don't share connection strings
- 🌍 **Whitelist IP** - Required for MongoDB Atlas access
- 📝 **Check logs** - Backend console shows everything
- 🗄️ **MongoDB Atlas** - Check collections after uploads

---

## ✨ You're All Set!

All files have been created and updated. Just need to:

1. Add your MongoDB URI to `.env`
2. Whitelist your IP in MongoDB Atlas
3. Run `npm run dev` in both backend and frontend

**Total setup time:** ~5 minutes

---

**Questions?** Check the documentation files included in the project.

**Ready to go!** 🚀
