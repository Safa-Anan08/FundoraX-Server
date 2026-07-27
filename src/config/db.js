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
    console.log(`[Database Connected] Host: ${conn.connection.host} | DB Name: ${conn.connection.name}`);

    // Listen for database connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Disconnected] Lost connection to MongoDB.');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[Database Reconnected] Re-established connection to MongoDB.');
    });
    mongoose.connection.on('error', (err) => {
      console.error('[Database Connection Error]', err.message);
    });

    return conn;
  } catch (error) {
    console.error(`[Database Connection Failure] ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
