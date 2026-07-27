const dns = require('dns');
// Set robust DNS resolvers to resolve MongoDB Atlas SRV records reliably
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// 1. Load Environment Variables FIRST
dotenv.config();

// 2. Load DB Config after env variables are initialized
const connectDB = require('./src/config/db');

const app = express();

// CORS configuration supporting both local development and Vercel production frontend
const allowedOrigins = [
  'http://localhost:3000',
  'https://fundorax-iota.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow requests dynamically
      }
    },
    credentials: true,
  })
);

// 3. Configure Stripe Webhook raw body parser BEFORE express.json()
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Seed Default System Accounts (Admin, Creator, Supporter) if missing
const seedDefaultUsers = async () => {
  try {
    const User = require('./src/models/User');
    const adminExists = await User.findOne({ role: 'Admin' });

    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'System Admin',
        email: 'admin@fundorax.com',
        password: hashedPassword,
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'Admin',
        credits: 10000,
      });

      const creatorPass = await bcrypt.hash('creator123', salt);
      await User.create({
        name: 'Jane Creator',
        email: 'creator@fundorax.com',
        password: creatorPass,
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        role: 'Creator',
        credits: 20,
      });

      const supporterPass = await bcrypt.hash('supporter123', salt);
      await User.create({
        name: 'Alex Supporter',
        email: 'supporter@fundorax.com',
        password: supporterPass,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        role: 'Supporter',
        credits: 50,
      });
      console.log('[Init] Default system accounts initialized in MongoDB.');
    }
  } catch (err) {
    console.warn('[Init Warning] Error ensuring default users:', err.message);
  }
};

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/campaigns', require('./src/routes/campaignRoutes'));
app.use('/api/contributions', require('./src/routes/contributionRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/withdrawals', require('./src/routes/withdrawalRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FundoraX API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FundoraX API Server is running',
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error Handler]', err.stack || err.message || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and Start Server
connectDB()
  .then(async () => {
    await seedDefaultUsers();
    app.listen(PORT, () => {
      console.log(`[Server] FundoraX Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Server Failure] Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
