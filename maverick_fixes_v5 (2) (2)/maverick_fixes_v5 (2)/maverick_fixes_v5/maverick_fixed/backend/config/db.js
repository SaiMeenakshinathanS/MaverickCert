const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas
 * Should be called before app.listen()
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error(
        "MONGODB_URI not found in .env - Please check your MongoDB connection string",
      );
    }

    console.log("\n🔌 Connecting to MongoDB...");

    // Modern mongoose connection
    const conn = await mongoose.connect(mongoURI);

    console.log("✅ MongoDB connected successfully");
    console.log(`✅ Database: ${conn.connection.name}`);
    console.log(`✅ Host: ${conn.connection.host}`);

    return conn.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error(`   Error: ${error.message}`);

    console.error("\n💡 Troubleshooting:");
    console.error("   1. Check MONGODB_URI in backend/.env");
    console.error(
      "   2. Verify credentials: username and password are URL-encoded",
    );
    console.error("   3. Verify IP whitelist in MongoDB Atlas allows your IP");
    console.error("   4. Check internet connection");

    console.error(
      "\n   MongoDB Atlas → Cluster → Connect → Connect Your Application",
    );
    console.error("   to get the correct connection string\n");

    throw error;
  }
};

module.exports = { connectDB };
