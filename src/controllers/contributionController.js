const Contribution = require('../models/Contribution');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Submit Contribution (Supporter)
exports.createContribution = async (req, res) => {
  try {
    const { campaignId, contributionAmount } = req.body;
    const amount = Number(contributionAmount);

    if (!campaignId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid campaign ID and contribution amount are required' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot contribute to unapproved campaign' });
    }

    if (new Date(campaign.deadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'Campaign deadline has passed' });
    }

    if (amount < campaign.minContribution) {
      return res.status(400).json({
        success: false,
        message: `Minimum contribution for this campaign is ${campaign.minContribution} credits`,
      });
    }

    const supporter = await User.findById(req.user.id);
    if (!supporter) {
      return res.status(404).json({ success: false, message: 'Supporter user not found' });
    }

    if (supporter.credits < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credits. You have ${supporter.credits} credits available, but need ${amount}. Please purchase credits.`,
      });
    }

    // Deduct credits from supporter
    supporter.credits -= amount;
    await supporter.save();

    const contribution = await Contribution.create({
      campaign: campaign._id,
      campaignTitle: campaign.title,
      contributionAmount: amount,
      supporter: supporter._id,
      supporterEmail: supporter.email,
      supporterName: supporter.name,
      creatorEmail: campaign.creatorEmail,
      creatorName: campaign.creatorName,
      status: 'pending',
    });

    // Notify Creator
    await Notification.create({
      toEmail: campaign.creatorEmail,
      message: `New contribution of ${amount} credits received for "${campaign.title}" from ${supporter.name}`,
      actionRoute: '/dashboard/contributions-review',
    });

    res.status(201).json({
      success: true,
      message: 'Contribution submitted successfully. Pending Creator approval.',
      contribution,
      remainingCredits: supporter.credits,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Supporter Contributions (Paginated)
exports.getSupporterContributions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { supporterEmail: req.user.email };

    const total = await Contribution.countDocuments(query);
    const contributions = await Contribution.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Also get supporter stats
    const allContribs = await Contribution.find(query);
    const totalContributionsCount = allContribs.length;
    const pendingContributionsCount = allContribs.filter((c) => c.status === 'pending').length;
    const totalAmountContributed = allContribs
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.contributionAmount, 0);

    res.json({
      success: true,
      contributions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalContributionsCount,
        pendingContributionsCount,
        totalAmountContributed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Creator Pending Contributions to Review
exports.getCreatorPendingContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find({
      creatorEmail: req.user.email,
      status: 'pending',
    }).sort({ date: -1 });

    res.json({ success: true, count: contributions.length, contributions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve Contribution (Creator)
exports.approveContribution = async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    if (contribution.creatorEmail !== req.user.email && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (contribution.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Contribution is already ${contribution.status}` });
    }

    // Add contribution to campaign raised amount
    await Campaign.findByIdAndUpdate(contribution.campaign, {
      $inc: { raisedAmount: contribution.contributionAmount },
    });

    contribution.status = 'approved';
    await contribution.save();

    // Notify Supporter
    await Notification.create({
      toEmail: contribution.supporterEmail,
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was APPROVED by ${contribution.creatorName}`,
      actionRoute: '/dashboard/my-contributions',
    });

    res.json({ success: true, message: 'Contribution approved successfully', contribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject Contribution (Creator)
exports.rejectContribution = async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    if (contribution.creatorEmail !== req.user.email && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (contribution.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Contribution is already ${contribution.status}` });
    }

    contribution.status = 'rejected';
    await contribution.save();

    // Refund credits to supporter
    await User.findOneAndUpdate(
      { email: contribution.supporterEmail },
      { $inc: { credits: contribution.contributionAmount } }
    );

    // Notify Supporter
    await Notification.create({
      toEmail: contribution.supporterEmail,
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was REJECTED. ${contribution.contributionAmount} credits have been refunded to your account.`,
      actionRoute: '/dashboard/my-contributions',
    });

    res.json({ success: true, message: 'Contribution rejected and credits refunded to supporter', contribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
