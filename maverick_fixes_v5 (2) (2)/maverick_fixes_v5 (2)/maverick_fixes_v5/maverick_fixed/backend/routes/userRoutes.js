const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { logActivity } = require("../utils/auditLogger");

// Avatar colours cycled on creation
const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// Return all users sorted by createdAt ASC
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("fullName email role isActive avatarColor createdAt password")
      .sort({ createdAt: 1 })
      .lean();

    // Normalize any legacy documents that have wrong casing
    // (old localStorage flow stored role as "Coordinator"/"Admin" with capital C/A)
    const normalized = users.map((u) => ({
      ...u,
      // Normalize role to lowercase
      role: (u.role || "coordinator").toLowerCase(),
      // Normalize fullName — old docs may have stored it under "name"
      fullName: u.fullName || u.name || "(Unknown)",
      // Ensure avatarColor is always present
      avatarColor: u.avatarColor || "bg-indigo-500",
    }));

    return res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("❌ GET /api/users:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/migrate
// One-time migration: normalizes all existing User documents in MongoDB to have
// lowercase role ("admin"/"coordinator") and ensures fullName is populated.
// Safe to call multiple times (idempotent).
// ─────────────────────────────────────────────────────────────────────────────
router.post("/migrate", async (req, res) => {
  try {
    const all = await User.find().lean();
    let updated = 0;

    for (const u of all) {
      const patches = {};

      // Fix role casing
      const normalizedRole = (u.role || "coordinator").toLowerCase();
      if (!["admin", "coordinator"].includes(u.role)) {
        patches.role = normalizedRole;
      }

      // Fix fullName if missing
      if (!u.fullName && u.name) {
        patches.fullName = u.name;
      }

      // Fix isActive if undefined
      if (u.isActive === undefined || u.isActive === null) {
        patches.isActive = true;
      }

      if (Object.keys(patches).length > 0) {
        await User.findByIdAndUpdate(u._id, { $set: patches });
        updated++;
      }
    }

    return res.json({
      success: true,
      message: `Migration complete. Updated ${updated} of ${all.length} documents.`,
      data: { total: all.length, updated },
    });
  } catch (err) {
    console.error("❌ POST /api/users/migrate:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// Create a new admin or coordinator
// Body: { fullName, email, password, role: "admin"|"coordinator", createdBy }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { fullName, email, password, role, createdBy } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!fullName || !fullName.trim())
      return res
        .status(400)
        .json({ success: false, message: "Full name is required." });
    if (!email || !email.trim())
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    if (!password || password.length < 6)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
    if (!["admin", "coordinator"].includes(role))
      return res
        .status(400)
        .json({
          success: false,
          message: "Role must be 'admin' or 'coordinator'.",
        });

    // ── Uniqueness ────────────────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "This email is already in use." });

    // ── Avatar colour (cycle through list) ────────────────────────────────────
    const total = await User.countDocuments();
    const avatarColor = AVATAR_COLORS[total % AVATAR_COLORS.length];

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      isActive: true,
      avatarColor,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    const roleLabel = role === "admin" ? "admin" : "coordinator";
    await logActivity({
      userName: createdBy || "Admin",
      action: `Created ${roleLabel}: ${user.fullName}`,
      type: "user",
      meta: { userId: user._id, role, email: user.email },
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error("❌ POST /api/users:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id
// Delete a user — with safeguards:
//   1. Cannot delete the currently logged-in user
//   2. Cannot delete the last active admin
// Body: { currentUserId, currentUserEmail }
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserId, currentUserEmail, deletedBy } = req.body;

    const target = await User.findById(id).lean();
    if (!target)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    // ── Guard 1: Cannot delete yourself ──────────────────────────────────────
    if (
      (currentUserId && String(target._id) === String(currentUserId)) ||
      (currentUserEmail && target.email === currentUserEmail.toLowerCase())
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    // ── Guard 2: Cannot delete the last active admin ──────────────────────────
    // Use case-insensitive regex to handle legacy docs with "Admin" casing
    const targetRole = (target.role || "").toLowerCase();
    if (targetRole === "admin" && target.isActive) {
      const activeAdminCount = await User.countDocuments({
        role: { $regex: /^admin$/i },
        isActive: true,
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last active Admin.",
        });
      }
    }

    await User.findByIdAndDelete(id);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await logActivity({
      userName: deletedBy || "Admin",
      action: `Deleted user: ${target.fullName}`,
      type: "user",
      meta: { userId: id, role: target.role, email: target.email },
    });

    return res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    console.error("❌ DELETE /api/users/:id:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/status
// Toggle isActive on/off
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { returnDocument: "after" },
    );
    const userDoc = user ? user.toObject() : null;
    if (!userDoc)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    return res.json({ success: true, data: userDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/count
// Returns total user count (used by Admin Dashboard "Total Users" stat)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/count", async (req, res) => {
  try {
    const count = await User.countDocuments();
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
