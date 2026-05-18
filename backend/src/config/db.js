const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let attempts = 0;

  const tryConnect = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      attempts++;
      console.error(`MongoDB connection error (attempt ${attempts}/${maxRetries}): ${error.message}`);
      if (attempts < maxRetries) {
        console.log(`Retrying in 5 seconds...`);
        setTimeout(tryConnect, 5000);
      } else {
        console.error('Max retries reached. Could not connect to MongoDB.');
      }
    }
  };

  await tryConnect();
};

module.exports = connectDB;
