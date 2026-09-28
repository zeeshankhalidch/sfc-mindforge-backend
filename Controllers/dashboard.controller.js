const Transaction = require("../models/Transaction");
const SavingTip = require("../models/SavingTip");
const Insight = require("../models/Insight");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Full dashboard data
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const month = new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const totals = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const income = totals.find((t) => t._id === "income")?.total || 0;
    const expense = totals.find((t) => t._id === "expense")?.total || 0;

    const topCategory = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: "$cat" },
      { $project: { _id: 0, category: "$cat.name", total: 1 } },
    ]);

    const tips = await SavingTip.find({ user: req.user.id, isDismissed: false })
      .sort({ priority: -1 })
      .limit(3);
    const insight = await Insight.findOne({ user: req.user.id, month });
    const unread = await Notification.countDocuments({ user: req.user.id, isRead: false });

    res.json({
      success: true,
      user: {
        name: user.name,
        monthlyAllowance: user.monthlyAllowance,
        savingsGoal: user.savingsGoal,
      },
      balance: { income, expense, total: income - expense },
      topCategory: topCategory[0] || null,
      tips,
      insight,
      unreadNotifications: unread,
    });
  } catch (error) {
    next(error);
  }
};

// Greeting
exports.getGreeting = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const hour = new Date().getHours();
    let greeting = "Hello";
    if (hour < 12) greeting = "Good Morning";
    else if (hour < 18) greeting = "Good Afternoon";
    else greeting = "Good Evening";
    res.json({ success: true, greeting: `${greeting}, ${user.name}!` });
  } catch (error) {
    next(error);
  }
};

// Top category
exports.getTopCategory = async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: "$cat" },
      { $project: { _id: 0, category: "$cat.name", total: 1 } },
    ]);

    res.json({ success: true, topCategory: data[0] || null });
  } catch (error) {
    next(error);
  }
};

// Budget vs Actual
exports.getBudgetVsActual = async (req, res, next) => {
  try {
    const Budget = require("../models/Budget");
    const month = new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({ user: req.user.id, month, isActive: true })
      .populate("category", "name");

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const result = [];
    for (const b of budgets) {
      const agg = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            category: b.category._id,
            type: "expense",
            date: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const used = agg[0]?.total || 0;
      result.push({
        category: b.category.name,
        limit: b.limitAmount,
        used,
        percentage: b.limitAmount ? Math.round((used / b.limitAmount) * 100) : 0,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Balance
exports.getBalance = async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const totals = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const income = totals.find((t) => t._id === "income")?.total || 0;
    const expense = totals.find((t) => t._id === "expense")?.total || 0;

    res.json({ success: true, income, expense, balance: income - expense, total: income - expense });
  } catch (error) {
    next(error);
  }
};