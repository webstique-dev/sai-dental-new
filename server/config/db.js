const mongoose = require('mongoose');

async function connectDB(retries = 5, delay = 5000) {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MONGO_URI environment variable is not defined. Please set it in your .env or server environment.');
    return;
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
  };

  if (process.env.MONGO_DB_NAME) {
    options.dbName = process.env.MONGO_DB_NAME;
  }

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(uri, options);
      console.log(`MongoDB connected successfully: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error('All MongoDB connection attempts failed. Server will remain running to serve health checks.');
      }
    }
  }
}

module.exports = connectDB;
