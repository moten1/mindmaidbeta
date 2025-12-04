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

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI or DATABASE_URL not defined");
  }

  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    };

    await mongoose.connect(MONGODB_URI, options);

    isConnected = true;
    logger.info("MongoDB connected successfully");

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
    logger.error("MongoDB connection failed:", error);
    throw error;
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