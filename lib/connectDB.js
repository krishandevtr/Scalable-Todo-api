const mongoose = require("mongoose");
require('dotenv').config();

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/todo";

// MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error(" MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log(" MongoDB disconnected");
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log(' MongoDB connection closed due to application termination');
  process.exit(0);
});

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(URI, options);
    
    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }
    
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    
    // Retry connection after 5 seconds in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
