const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

// ============ USERS ============
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

exports.disableUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User disabled", user });
  } catch (error) {
    next(error);
  }
};

exports.enableUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User enabled", user });
  } catch (error) {
    next(error);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Ye demo hai — actual mein email bhejni chahiye
    res.json({
      success: true,
      message: `Password reset link sent to ${user.email}`,
    });
  } catch (error) {
    next(error);
  }
};

// ============ STATS ============
exports.getStatsOverview = async (req, res, next) => {
  try {
    const activeUsers = await User.countDocuments({ role: "student", isActive: true });
    const totalTransactions = await Transaction.countDocuments();

    // Top category (most used)
    const top = await Transaction.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: "$cat" },
    ]);

    res.json({
      activeUsers,
      totalTransactions,
      topCategory: top[0]?.cat?.name || "—",
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsageStats = async (req, res, next) => {
  try {
    // Last 6 months
    const six = new Date();
    six.setMonth(six.getMonth() - 5);
    six.setDate(1);

    const data = await Transaction.aggregate([
      { $match: { date: { $gte: six } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const usage = data.map((d) => {
      const [year, month] = d._id.split("-");
      return {
        month: monthNames[parseInt(month) - 1],
        transactions: d.transactions,
      };
    });

    res.json({ success: true, usage });
  } catch (error) {
    next(error);
  }
};