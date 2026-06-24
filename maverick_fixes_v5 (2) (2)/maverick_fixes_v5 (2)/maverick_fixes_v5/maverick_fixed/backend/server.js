const express = require("express");
const cors = require("cors");
const path = require("path");
const dns = require("dns");
const cron = require("node-cron");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const { connectDB } = require("./config/db");
const uploadRoutes = require("./routes/uploadRoutes");
const emailRoutes = require("./routes/emailRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const queryRoutes = require("./routes/queryRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const reminderRulesRoutes = require("./routes/reminderRulesRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const linkedinConfirmRoutes = require("./routes/linkedinConfirmRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api", queryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reminder-rules", reminderRulesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/linkedin", linkedinConfirmRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal server error",
  });
});

// Start server and connect to MongoDB
const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error(
      "⚠️  Starting server without MongoDB — database features will fail",
    );
  }

  app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ CORS enabled for frontend requests`);
    console.log(`✓ Ready to receive requests\n`);
  });

  // Run LinkedIn reminder check every day at 9am
  cron.schedule("0 9 * * *", async () => {
    console.log("\n⏰ Running LinkedIn reminder cron job...");
    const { sendLinkedInReminders } = require("./services/emailService");
    const result = await sendLinkedInReminders();
    console.log(`✓ Reminders: ${result.sent} sent, ${result.failed} failed`);
  });
  console.log("✓ LinkedIn reminder cron scheduled (daily at 9am)");
};

startServer();
