const Report = require('../models/Report');
const Campaign = require('../models/Campaign');
const User = require('../models/User');

exports.createReport = async (req, res) => {
  try {
    const { campaignId, reason } = req.body;
    if (!campaignId || !reason) {
      return res.status(400).json({ success: false, message: 'Campaign ID and reason are required' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const reporter = await User.findById(req.user.id);

    const report = await Report.create({
      reporter: reporter._id,
      reporterName: reporter.name,
      campaign: campaign._id,
      campaignTitle: campaign.title,
      reason,
    });

    res.status(201).json({ success: true, message: 'Report submitted to Admin for review', report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.suspendCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    campaign.status = 'suspended';
    await campaign.save();

    res.json({ success: true, message: `Campaign "${campaign.title}" suspended`, campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
