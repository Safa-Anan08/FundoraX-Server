const Campaign = require('../models/Campaign');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create New Campaign (Creator)
exports.createCampaign = async (req, res) => {
  try {
    const { title, story, category, fundingGoal, minContribution, deadline, rewardInfo, image } = req.body;

    const creatorUser = await User.findById(req.user.id);
    if (!creatorUser) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    const campaign = await Campaign.create({
      title,
      story,
      category,
      fundingGoal: Number(fundingGoal),
      minContribution: Number(minContribution || 1),
      deadline: new Date(deadline),
      rewardInfo: rewardInfo || '',
      image,
      creator: creatorUser._id,
      creatorEmail: creatorUser.email,
      creatorName: creatorUser.name,
      status: 'pending', // Pending admin approval
    });

    res.status(201).json({
      success: true,
      message: 'Campaign submitted successfully. Pending Admin approval.',
      campaign,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Approved Active Campaigns (Supporter / Explore)
exports.getApprovedCampaigns = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {
      status: 'approved',
      deadline: { $gte: new Date() },
    };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Top 6 Funded Campaigns (Homepage)
exports.getTopFundedCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'approved' })
      .sort({ raisedAmount: -1 })
      .limit(6);
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Unique Campaign Categories (Homepage & Filters)
exports.getCategories = async (req, res) => {
  try {
    const rawCategories = await Campaign.distinct('category');
    // Filter out null, undefined, or empty whitespace strings
    const categories = rawCategories.filter(
      (c) => c && typeof c === 'string' && c.trim().length > 0
    );

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Campaign Details
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get My Campaigns (Creator) - Descending Deadline Order
exports.getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator: req.user.id }).sort({ deadline: -1 });
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Campaign (Creator: Title, Story, Reward Info)
exports.updateCampaign = async (req, res) => {
  try {
    const { title, story, rewardInfo } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this campaign' });
    }

    if (title) campaign.title = title;
    if (story) campaign.story = story;
    if (rewardInfo !== undefined) campaign.rewardInfo = rewardInfo;

    await campaign.save();
    res.json({ success: true, message: 'Campaign updated successfully', campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Campaign (Creator / Admin) - Refunds approved supporters if creator deletes
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this campaign' });
    }

    // Refund all approved supporters for this campaign
    const approvedContributions = await Contribution.find({
      campaign: campaign._id,
      status: 'approved',
    });

    for (const contrib of approvedContributions) {
      await User.findOneAndUpdate(
        { email: contrib.supporterEmail },
        { $inc: { credits: contrib.contributionAmount } }
      );

      await Notification.create({
        toEmail: contrib.supporterEmail,
        message: `Campaign "${campaign.title}" was deleted. Refunded ${contrib.contributionAmount} credits to your account.`,
        actionRoute: '/dashboard/supporter-home',
      });

      contrib.status = 'rejected';
      await contrib.save();
    }

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Campaign deleted and supporters refunded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get All Campaigns
exports.getAllCampaignsAdmin = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Approve Campaign
exports.approveCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    campaign.status = 'approved';
    await campaign.save();

    await Notification.create({
      toEmail: campaign.creatorEmail,
      message: `Your campaign "${campaign.title}" has been APPROVED by the Admin!`,
      actionRoute: '/dashboard/my-campaigns',
    });

    res.json({ success: true, message: 'Campaign approved successfully', campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Reject Campaign
exports.rejectCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    campaign.status = 'rejected';
    await campaign.save();

    await Notification.create({
      toEmail: campaign.creatorEmail,
      message: `Your campaign "${campaign.title}" was REJECTED by the Admin.`,
      actionRoute: '/dashboard/my-campaigns',
    });

    res.json({ success: true, message: 'Campaign rejected', campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
