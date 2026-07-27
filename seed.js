const dns = require('dns');
// Set robust DNS resolvers to resolve MongoDB Atlas SRV records reliably
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// 1. Load Environment Variables FIRST
dotenv.config();

// 2. Load Database Connection & Models
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Campaign = require('./src/models/Campaign');

const runSeed = async () => {
  try {
    const isForce = process.argv.includes('--force');

    await connectDB();
    console.log('✓ Connected to MongoDB');

    // 1. Find or create Creator user
    let creator = await User.findOne({ role: 'Creator' });

    if (!creator) {
      console.log('✓ Creator user not found. Seeding default system users (Admin, Creator, Supporter)...');
      const salt = await bcrypt.genSalt(10);

      const adminPass = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'System Admin',
        email: 'admin@fundorax.com',
        password: adminPass,
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'Admin',
        credits: 10000,
      });

      const creatorPass = await bcrypt.hash('creator123', salt);
      creator = await User.create({
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

      console.log(`✓ Created default system users. Creator: ${creator.email}`);
    } else {
      console.log(`✓ Creator found: ${creator.email} (ID: ${creator._id})`);
    }

    // 2. Inspect existing campaign collection
    const existingCount = await Campaign.countDocuments();
    console.log(`✓ Campaign collection contains ${existingCount} documents`);

    // 3. Handle --force or duplicate prevention logic
    if (isForce) {
      console.log('✓ Deleting campaigns...');
      await Campaign.deleteMany({});
      console.log('✓ Cleared all existing campaigns.');
    } else if (existingCount > 0) {
      console.log('✓ Campaign collection is not empty. Skipping insert to prevent duplicate data.');
      console.log('  (Tip: Run "npm run seed:force" to delete and recreate all campaigns from scratch.)');
      console.log('✓ Seed completed.');
      process.exit(0);
    }

    // 4. Sample Campaigns Array (14 Objects)
    const sampleCampaigns = [
      {
        title: 'EcoPack: 100% Biodegradable Water Bottles',
        story: 'EcoPack is revolutionizing single-use plastics by introducing 100% plant-based compostable water bottles that leave zero footprint.',
        category: 'Technology',
        fundingGoal: 5000,
        minContribution: 10,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      {
        title: 'AeroGrid: Autonomous Drone Delivery Network for Rural Areas',
        story: 'AeroGrid provides automated logistics for urgent medical and essential supplies across remote regions using long-range solar drones. Our mission is to bridge critical infrastructure gaps and connect isolated communities with vital resources.',
        category: 'Technology',
        fundingGoal: 12000,
        minContribution: 25,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 50 credits to get beta access to our live telemetry tracking dashboard and early updates.',
        image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 8500,
        status: 'approved',
      },
      {
        title: 'QuantumShield: Hardware Security Module for Smart Homes',
        story: 'QuantumShield delivers quantum-resistant encryption in a plug-and-play micro-device for home network protection. It safeguards connected smart devices against unauthorized intrusion and modern cyber threats.',
        category: 'Technology',
        fundingGoal: 9000,
        minContribution: 20,
        deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 40 credits for an early bird QuantumShield hardware node upon mass production.',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 5400,
        status: 'approved',
      },
      {
        title: 'UrbanOasis: Vertical Micro-Parks for Dense Cities',
        story: 'UrbanOasis transforms neglected urban alleyways and rooftops into vibrant, biodiverse vertical gardens. We aim to reduce urban heat island effects while creating accessible green community spaces.',
        category: 'Community',
        fundingGoal: 6500,
        minContribution: 15,
        deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 30 credits to dedicate a planter box with an engraved donor plaque in your city.',
        image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 4100,
        status: 'approved',
      },
      {
        title: 'CleanCoast: Ocean Plastic Removal Barges',
        story: 'CleanCoast builds autonomous solar-powered river and coastal barriers that intercept marine plastic before reaching the ocean. Together we are safeguarding marine ecosystems and coastal livelihoods.',
        category: 'Community',
        fundingGoal: 15000,
        minContribution: 30,
        deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 60 credits for a recycled ocean-plastic milestone badge and sponsor acknowledgment.',
        image: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 11200,
        status: 'approved',
      },
      {
        title: 'BioMesh: Breathable 3D-Printed Prosthetic Limbs',
        story: 'BioMesh utilizes ultra-lightweight bio-compatible polymers to 3D-print customizable limb prosthetics for amputees. Our parametric designs dramatically lower costs while enhancing mobility and comfort.',
        category: 'Innovations',
        fundingGoal: 11000,
        minContribution: 20,
        deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 80 credits to fund a full custom fitting session for a recipient in need.',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 7900,
        status: 'approved',
      },
      {
        title: 'HyperLight: Ultra-Efficient Solid-State Solar Windows',
        story: 'HyperLight develops transparent solar glass panels that generate clean electricity directly from architectural windows. Our technology turns commercial skyscrapers into self-sustaining green power generators.',
        category: 'Innovations',
        fundingGoal: 14000,
        minContribution: 50,
        deadline: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 100 credits for VIP admission to our live technology demonstration and investor kit.',
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 9800,
        status: 'approved',
      },
      {
        title: 'AquaSense: Smart Soil Moisture Sensor Array',
        story: 'AquaSense combines wireless underground IoT sensors with AI weather forecasting to reduce agricultural water waste by 40%. Farmers receive real-time irrigation insights directly on their smartphones.',
        category: 'Agriculture',
        fundingGoal: 5500,
        minContribution: 10,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 25 credits to receive a starter sensor pack for home garden monitoring.',
        image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 3600,
        status: 'approved',
      },
      {
        title: 'MycoGrow: Mushroom-Based Organic Soil Restorer',
        story: 'MycoGrow formulates specialized mycorrhizal fungi cultures that restore depleted farmlands without chemical fertilizers. Our natural soil inoculants increase crop yields and boost carbon sequestration.',
        category: 'Agriculture',
        fundingGoal: 7000,
        minContribution: 15,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 35 credits for a 5kg farm sample pack of MycoGrow organic restorer.',
        image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 4900,
        status: 'approved',
      },
      {
        title: 'PulseVital: Low-Cost Portable ECG for Rural Clinics',
        story: 'PulseVital is a pocket-sized 12-lead electrocardiogram device engineered for rural healthcare providers. It delivers rapid cloud-based cardiac diagnosis to prevent cardiovascular fatalities in underserved communities.',
        category: 'Health',
        fundingGoal: 10000,
        minContribution: 20,
        deadline: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 50 credits to sponsor a device donation to a rural health clinic.',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 7200,
        status: 'approved',
      },
      {
        title: 'CodeSprout: STEM Robotics Kit for School Classrooms',
        story: 'CodeSprout provides affordable modular robotics kits designed to teach computer science and engineering to young students. Our hands-on curriculum empowers the next generation of innovators in developing regions.',
        category: 'Education',
        fundingGoal: 8000,
        minContribution: 15,
        deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        rewardInfo: 'Pledge 30 credits to sponsor a robotics kit for a classroom in need.',
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
        creator: creator._id,
        creatorEmail: creator.email,
        creatorName: creator.name,
        raisedAmount: 5800,
        status: 'approved',
      },
    ];

    console.log(`✓ Inserting ${sampleCampaigns.length} campaigns...`);
    const inserted = await Campaign.insertMany(sampleCampaigns);
    console.log(`✓ Successfully inserted ${inserted.length} campaigns.`);
    console.log('✓ Seed completed.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error.message);
    if (error.errors) {
      console.error('Validation Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
};

runSeed();
