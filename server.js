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

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
// Stripe Webhook needs the raw body to verify signatures securely
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Seed Initial Admin and Sample Data Helper
const seedDatabase = async () => {
  try {
    const User = require('./src/models/User');
    const Campaign = require('./src/models/Campaign');

    // Seed Admin User if none exists
    const adminExists = await User.findOne({ role: 'Admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      const admin = await User.create({
        name: 'System Admin',
        email: 'admin@fundorax.com',
        password: hashedPassword,
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'Admin',
        credits: 10000,
      });
      console.log(`[Seed] Created Default Admin User: admin@fundorax.com / admin123`);

      // Seed Default Creator & Supporter
      const creatorPass = await bcrypt.hash('creator123', salt);
      const creator = await User.create({
        name: 'Jane Creator',
        email: 'creator@fundorax.com',
        password: creatorPass,
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        role: 'Creator',
        credits: 20, // Creator initial credits rule
      });

      const supporterPass = await bcrypt.hash('supporter123', salt);
      await User.create({
        name: 'Alex Supporter',
        email: 'supporter@fundorax.com',
        password: supporterPass,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        role: 'Supporter',
        credits: 50, // Supporter initial credits rule
      });

      // Seed Initial Sample Approved Campaigns
      const sampleCampaigns = [
        {
          title: 'EcoPack: 100% Biodegradable Water Bottles',
          story: 'EcoPack is revolutionizing single-use plastics by introducing 100% plant-based compostable water bottles that leave zero footprint.',
          category: 'Technology',
          fundingGoal: 5000,
          minContribution: 10,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          rewardInfo: 'Pledge 50 credits to get a 6-pack of EcoPack bottles upon release.',
          image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800',
          creator: creator._id,
          creatorEmail: creator.email,
          creatorName: creator.name,
          raisedAmount: 3200,
          status: 'approved',
        },
        {
          title: 'SolarFlow: Clean Energy Water Purifier for Villages',
          story: 'SolarFlow provides off-grid, solar-powered clean drinking water filtration systems for rural communities facing water scarcity.',
          category: 'Community',
          fundingGoal: 10000,
          minContribution: 20,
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          rewardInfo: 'Pledge 100 credits for a digital wall of fame honor and live telemetry access.',
          image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
          creator: creator._id,
          creatorEmail: creator.email,
          creatorName: creator.name,
          raisedAmount: 7800,
          status: 'approved',
        },
        {
          title: 'NexusVR: Haptic Gloves for Immersive Learning',
          story: 'Next-gen open-source haptic VR gloves designed for medical students and engineering simulations.',
          category: 'Innovations',
          fundingGoal: 8000,
          minContribution: 15,
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          rewardInfo: 'Pledge 150 credits for early developer access & SDK kit.',
          image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800',
          creator: creator._id,
          creatorEmail: creator.email,
          creatorName: creator.name,
          raisedAmount: 6400,
          status: 'approved',
        },
        {
          title: 'HarvestHub: Direct Farm-to-Table Community App',
          story: 'Empowering local organic farmers to sell directly to households with smart cold-chain logistics.',
          category: 'Agriculture',
          fundingGoal: 4000,
          minContribution: 10,
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          rewardInfo: 'Pledge 30 credits to get a monthly fresh organic produce basket.',
          image: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800',
          creator: creator._id,
          creatorEmail: creator.email,
          creatorName: creator.name,
          raisedAmount: 2100,
          status: 'approved',
        },
      ];

      await Campaign.insertMany(sampleCampaigns);
      console.log(`[Seed] Created ${sampleCampaigns.length} initial sample approved campaigns`);
    } else {
      console.log('[Seed] Database already contains seed data.');
    }
  } catch (err) {
    console.warn('[Seed Error]', err.message);
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
    timestamp: new Date(),
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Async Startup Function: Ensures DB is connected before listening
const startServer = async () => {
  const conn = await connectDB();
  if (conn) {
    await seedDatabase();
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[Server] FundoraX Backend running on port ${PORT}`);
  });
};

startServer();
