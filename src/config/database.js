const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection events
    mongoose.connection.on("error", (err) => {
      logger.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("🔄 MongoDB reconnected");
    });
  } catch (error) {
    logger.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
