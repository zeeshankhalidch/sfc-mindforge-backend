const ActivityLog = require("../models/ActivityLog");
const Transaction = require("../models/Transaction");

exports.recentViews = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ user: req.user.id, action: "view_transaction" })
      .sort({ createdAt: -1 }).limit(10);
    const ids = logs.map(l => l.referenceId);
    const txns = await Transaction.find({ _id: { $in: ids } }).populate("category", "name type");
    res.json({ success: true, transactions: txns });
  } catch (e) { next(e); }
};

exports.recentEdits = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ user: req.user.id, action: "edit_transaction" })
      .sort({ createdAt: -1 }).limit(10);
    const ids = logs.map(l => l.referenceId);
    const txns = await Transaction.find({ _id: { $in: ids } }).populate("category", "name type");
    res.json({ success: true, transactions: txns });
  } catch (e) { next(e); }
};

exports.duplicates = async (req, res, next) => {
  try {
    const dupes = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { amount: "$amount", date: "$date", category: "$category" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);
    res.json({ success: true, duplicates: dupes });
  } catch (e) { next(e); }
};

exports.unusual = async (req, res, next) => {
  try {
    const all = await Transaction.find({ user: req.user.id, type: "expense" });
    if (all.length === 0) return res.json({ success: true, unusual: [] });
    const amounts = all.map(t => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const threshold = avg * 3;
    const unusual = all.filter(t => t.amount > threshold);
    res.json({ success: true, average: avg, threshold, unusual });
  } catch (e) { next(e); }
};

exports.forecast = async (req, res, next) => {
  try {
    const six = new Date();
    six.setMonth(six.getMonth() - 6);
    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: six } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ]);
    const expenses = data.filter(d => d._id.type === "expense").map(d => d.total);
    const avg = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
    res.json({ success: true, forecast: Math.round(avg), basedOnMonths: expenses.length });
  } catch (e) { next(e); }
};