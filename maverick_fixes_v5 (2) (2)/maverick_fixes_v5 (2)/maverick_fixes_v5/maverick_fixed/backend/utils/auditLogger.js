/**
 * auditLogger.js
 * Thin helper to write AuditLog records from any route without repeating boilerplate.
 *
 * Usage:
 *   const { logActivity } = require('../utils/auditLogger');
 *   await logActivity({ userName, action, type, meta });
 *
 * Always resolves — failures are swallowed so they never break the calling route.
 */

const AuditLog = require("../models/AuditLog");

/**
 * @param {object} params
 * @param {string} params.userName  - Display name of the acting user
 * @param {string} params.action    - Human-readable description e.g. "Created batch: Kubernetes Training"
 * @param {string} params.type      - One of: batch | upload | certificate | email | linkedin | reminder | user | settings | report
 * @param {object} [params.meta]    - Optional extra data (batchId, count, etc.)
 */
async function logActivity({ userName, action, type, meta = {} }) {
  try {
    await AuditLog.create({ userName, action, type, meta });
  } catch (err) {
    // Log to console but never propagate — audit failures must not break user workflows
    console.error("⚠️  AuditLog write failed (non-fatal):", err.message);
  }
}

module.exports = { logActivity };
