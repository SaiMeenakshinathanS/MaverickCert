const mongoose = require("mongoose");

/**
 * User Schema
 * Stores Admin and Coordinator accounts in MongoDB.
 * Replaces the localStorage-only coordinator list so users persist
 * across sessions and are accessible from all frontend clients.
 */
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Stored as plain text for this application (no bcrypt requirement stated).
    // The password is only ever returned when explicitly requested (credentials view).
    password: {
      type: String,
      required: true,
    },
    // "admin" | "coordinator"
    role: {
      type: String,
      enum: ["admin", "coordinator"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Display colour for the avatar chip (picked deterministically on creation)
    avatarColor: {
      type: String,
      default: "bg-indigo-500",
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  },
);

// Fast lookup by role + isActive (used in admin-count guard)
// NOTE: email index is created automatically by unique:true above — do NOT add it again here
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("User", userSchema);
