// ─── Maverick Certify — Unified API Service Layer ───────────────────────────
// All backend calls go through this module. No mock data is used here.

import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Intercept responses for uniform error handling ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || "Network error";
    return Promise.reject(new Error(msg));
  },
);

// ── Helpers ────────────────────────────────────────────────────────────────────
const getData = (res) => res.data?.data ?? res.data;

// ─────────────────────────────────────────────────────────────────────────────
// BATCH APIs
// ─────────────────────────────────────────────────────────────────────────────
export const getBatches = async () => {
  const res = await api.get("/api/batches");
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS APIs
// ─────────────────────────────────────────────────────────────────────────────
export const getReportsOverview = async () => {
  const res = await api.get("/api/reports/overview");
  return getData(res);
};

export const getReportsBatches = async () => {
  const res = await api.get("/api/reports/batches");
  return getData(res);
};

export const getReportsLinkedIn = async () => {
  const res = await api.get("/api/reports/linkedin");
  return getData(res);
};

export const getReportsTrends = async () => {
  const res = await api.get("/api/reports/trends");
  return getData(res);
};

export const getReportsEmailStats = async () => {
  const res = await api.get("/api/reports/email-stats");
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE APIs
// ─────────────────────────────────────────────────────────────────────────────
export const getCertificates = async ({
  batchId,
  status,
  page = 1,
  limit = 50,
} = {}) => {
  const params = { page, limit };
  if (batchId) params.batchId = batchId;
  if (status) params.status = status;
  const res = await api.get("/api/reports/certificates", { params });
  return res.data; // { success, data, pagination }
};

export const downloadCertificate = (batchId, employeeId) =>
  `${BACKEND_URL}/api/certificates/download/${batchId}/${employeeId}`;

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE / LINKEDIN APIs
// ─────────────────────────────────────────────────────────────────────────────
export const getEmployees = async ({ batchId, emailStatus } = {}) => {
  const params = {};
  if (batchId) params.batchId = batchId;
  if (emailStatus) params.emailStatus = emailStatus;
  const res = await api.get("/api/employees", { params });
  return getData(res);
};

export const confirmLinkedIn = async (employeeMongoId, confirmed = true) => {
  const user = JSON.parse(localStorage.getItem("mc_user") || "{}");
  const updatedBy = user.name || user.userName || "Coordinator";
  const res = await api.patch(`/api/employees/${employeeMongoId}/linkedin`, {
    confirmed,
    updatedBy,
  });
  return getData(res);
};

export const sendLinkedInReminder = async (employeeId, batchId) => {
  const res = await api.post("/api/email/send-reminder", {
    employeeId,
    batchId,
  });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL APIs
// ─────────────────────────────────────────────────────────────────────────────
export const sendEmail = async (batchId, emailTemplate = {}) => {
  const res = await api.post(`/api/email/send/${batchId}`, emailTemplate);
  return getData(res);
};

export const getEmailLogs = async (batchId) => {
  const res = await api.get(`/api/email/logs/${batchId}`);
  return getData(res);
};

export const verifySmtp = async () => {
  const res = await api.get("/api/email/verify");
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD / VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
export const uploadFile = async (file, batchInfo) => {
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await api.post("/api/upload/validate", {
    fileBase64,
    batchInfo: {
      trainingName: batchInfo.eventName,
      trainingStartDate: batchInfo.trainingStartDate,
      trainingEndDate: batchInfo.trainingEndDate,
    },
  });

  const d = getData(res);
  return {
    success: true,
    records: d.summary?.validEmployees ?? 0,
    validRecords: d.validData,
    invalidRecords: d.invalidData,
    validationErrors: d.validationErrors,
    summary: d.summary,
    filename: file?.name || "candidates.xlsx",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE TEMPLATE / GENERATION
// ─────────────────────────────────────────────────────────────────────────────
export const generateCertTemplate = async ({
  description,
  trainingName,
  organisation,
  conversationHistory = [],
  mode = 'detailed',
  requestVariations = false,
}) => {
  const res = await api.post("/api/certificates/generate-template", {
    description,
    trainingName,
    organisation,
    conversationHistory,
    mode,
    requestVariations,
  });
  return getData(res);
};

export const generateCertificates = async (batchId, styleConfig = {}) => {
  const res = await api.post(`/api/certificates/generate/${batchId}`, {
    styleConfig,
  });
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE GENERATION (AI)
// Supports: trainingName, organisation, trainingStartDate, trainingEndDate
// Optional: feedback (string), requestVariations (boolean)
// ─────────────────────────────────────────────────────────────────────────────
export const generateEmailTemplate = async (payload) => {
  const res = await api.post("/api/email/generate-template", payload);
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the 10 most recent audit log entries for the Admin Dashboard
 * "Recent Activity" section. Returns an array of AuditLog documents.
 */
export const getRecentActivities = async () => {
  const res = await api.get("/api/admin/dashboard/recent-activity");
  return getData(res);
};

/**
 * Fetch all audit log entries (optionally filtered) for the Audit Logs page.
 * @param {{ type?: string, user?: string }} filters
 */
export const getAuditLogs = async (filters = {}) => {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.user) params.user = filters.user;
  const res = await api.get("/api/admin/dashboard/audit-logs", { params });
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT APIs
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the logged-in user's display name for audit log entries. */
export const currentUserName = () => {
  try {
    return JSON.parse(localStorage.getItem("mc_user") || "{}").name || "Admin";
  } catch {
    return "Admin";
  }
};

/** Returns the logged-in user's email (used for delete-self guard). */
export const currentUserEmail = () => {
  try {
    return JSON.parse(localStorage.getItem("mc_user") || "{}").email || "";
  } catch {
    return "";
  }
};

/** Fetch all users from MongoDB. */
export const getUsers = async () => {
  const res = await api.get("/api/users");
  return getData(res);
};

/**
 * Create a new user.
 * @param {{ fullName, email, password, role: "admin"|"coordinator" }} payload
 */
export const createUser = async (payload) => {
  const res = await api.post("/api/users", {
    ...payload,
    createdBy: currentUserName(),
  });
  return getData(res);
};

/**
 * Delete a user by MongoDB _id.
 * Passes currentUserEmail so the backend can block self-deletion.
 */
export const deleteUser = async (userId) => {
  const res = await api.delete(`/api/users/${userId}`, {
    data: {
      currentUserEmail: currentUserEmail(),
      deletedBy: currentUserName(),
    },
  });
  return getData(res);
};

/** Toggle isActive. */
export const toggleUserStatus = async (userId, isActive) => {
  const res = await api.patch(`/api/users/${userId}/status`, { isActive });
  return getData(res);
};

/** Fetch total user count (for dashboard stat). */
export const getUserCount = async () => {
  const res = await api.get("/api/users/count");
  return getData(res);
};

/**
 * One-time migration — normalizes legacy MongoDB documents (wrong role casing, missing fullName).
 * Called automatically on UserManagement mount. Idempotent and non-breaking.
 */
export const migrateUsers = async () => {
  try {
    const res = await api.post("/api/users/migrate");
    return getData(res);
  } catch {
    // Non-fatal — migration failure must never block the UI
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  const res = await api.get("/api/health");
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// REMINDER RULES
// ─────────────────────────────────────────────────────────────────────────────
export const getReminderRules = async () => {
  const res = await api.get("/api/reminder-rules");
  return getData(res);
};

export const saveReminderRules = async (rules) => {
  const res = await api.post("/api/reminder-rules", rules);
  return getData(res);
};


// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SYSTEM HEALTH
// ─────────────────────────────────────────────────────────────────────────────
export const getSystemHealth = async () => {
  const res = await api.get("/api/admin/system-health");
  return getData(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SETTINGS — save via settings endpoint
// ─────────────────────────────────────────────────────────────────────────────
export const saveEmailSettings = async (settings) => {
  const res = await api.post("/api/settings", {
    ...settings,
    userName: currentUserName(),
  });
  return getData(res);
};

export default api;
