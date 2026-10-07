const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB connected successfully.");
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    throw error;
  }
};

module.exports = connectDatabase;
