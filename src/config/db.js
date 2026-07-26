const mongoose = require('mongoose');
const dns = require('dns');

// Set robust DNS resolvers to resolve MongoDB Atlas SRV records reliably across Windows networks
try {
  dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Fallback if dns.setServers is restricted
}

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      throw new Error('MONGODB_URI environment variable is missing in server/.env');
    }
    console.log('[Database] Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(connStr);
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    throw error; // Throw error so callers know connection failed instead of silently failing
  }
};

module.exports = connectDB;
