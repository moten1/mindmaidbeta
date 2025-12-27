// ============================================
// 🗄️ Database Configuration (MongoDB)
// ============================================

import mongoose from "mongoose";
import logger from "./logger.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    logger.info("Using existing database connection");
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const SKIP_DB = process.env.SKIP_DB === "true" || process.env.NODE_ENV === "test";

  if (!MONGODB_URI) {
    if (SKIP_DB) {
      logger.warn("⚠️  Database disabled (SKIP_DB=true or NODE_ENV=test)");
      isConnected = false;
      return;
    }
    logger.warn("⚠️  MONGODB_URI not defined — attempting local MongoDB");
    // Fallback to local MongoDB if available
  }

  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    };

    const uri = MONGODB_URI || "mongodb://localhost:27017/mindmaid";
    await mongoose.connect(uri, options);

    isConnected = true;
    logger.info("✅ MongoDB connected successfully");

    // Connection event handlers
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      isConnected = true;
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
      process.exit(0);
    });
  } catch (error) {
    if (SKIP_DB) {
      logger.warn("⚠️  Database connection skipped (SKIP_DB enabled)");
      isConnected = false;
      return;
    }
    logger.warn("⚠️  MongoDB connection failed — running without database");
    logger.debug("Error details:", error.message);
    isConnected = false;
    // Don't throw — allow app to run without database
  }
};

export const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("Error disconnecting MongoDB:", error);
    throw error;
  }
};

export default { connectDB, disconnectDB };