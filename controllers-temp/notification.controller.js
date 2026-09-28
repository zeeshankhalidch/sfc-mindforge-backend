const Notification = require("../models/Notification");
const Budget = require("../models/Budget");
const { checkBudgetAlert } = require("../services/budgetAlert.service");

exports.getAll = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, notifications });
  } catch (e) {
    next(e);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });
    res.json({ success: true, count });
  } catch (e) {
    next(e);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true }
    );
    res.json({ success: true, message: "Marked read" });
  } catch (e) {
    next(e);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: "All marked read" });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

// ✅ Refresh budget alerts for all active budgets
exports.refreshBudgetAlerts = async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);

    const budgets = await Budget.find({
      user: req.user.id,
      month,
      isActive: true,
    });

    console.log(`🔍 Refreshing budget alerts for ${budgets.length} budgets`);

    for (const b of budgets) {
      await checkBudgetAlert(req.user._id, b.category, "expense");
    }

    res.json({
      success: true,
      message: `Checked ${budgets.length} budgets`,
      count: budgets.length,
    });
  } catch (e) {
    next(e);
  }
};