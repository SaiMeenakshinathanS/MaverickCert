const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Validates email + password against the User collection in MongoDB.
// Also accepts the legacy hardcoded admin credential so existing deployments
// continue working without a DB migration.
//
// Returns: { success, data: { _id, fullName, email, role, avatarColor } }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── 1. Check MongoDB User collection ─────────────────────────────────────
    const user = await User.findOne({ email: normalizedEmail }).lean();

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been disabled. Contact an administrator.",
        });
      }

      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password. Please try again.",
        });
      }

      return res.json({
        success: true,
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          // Always return lowercase role — frontend normalises display
          role: (user.role || "coordinator").toLowerCase(),
          avatarColor: user.avatarColor || "bg-indigo-500",
        },
      });
    }

    // ── 2. Fallback: legacy hardcoded admin credential ────────────────────────
    // Allows the original "admin@maverick.com / admin123" to keep working
    // even before the admin is re-created in MongoDB.
    const LEGACY_ADMIN = {
      email: "admin@maverick.com",
      password: "admin123",
      fullName: "Rohan Anand",
      role: "admin",
      avatarColor: "bg-indigo-500",
    };

    if (
      normalizedEmail === LEGACY_ADMIN.email &&
      password === LEGACY_ADMIN.password
    ) {
      return res.json({
        success: true,
        data: {
          _id: "legacy-admin",
          fullName: LEGACY_ADMIN.fullName,
          email: LEGACY_ADMIN.email,
          role: LEGACY_ADMIN.role,
          avatarColor: LEGACY_ADMIN.avatarColor,
        },
      });
    }

    // ── 3. Not found anywhere ─────────────────────────────────────────────────
    return res.status(401).json({
      success: false,
      message: "Invalid email or password. Please try again.",
    });
  } catch (err) {
    console.error("❌ POST /api/auth/login:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
