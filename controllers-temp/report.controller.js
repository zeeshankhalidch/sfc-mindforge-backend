const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { sendReportEmail } = require("../utils/email");

exports.categoryWise = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: "$cat" },
      { $project: { _id: 0, category: "$cat.name", total: 1 } },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.incomeVsExpense = async (req, res, next) => {
  try {
    const six = new Date();
    six.setMonth(six.getMonth() - 5);
    six.setDate(1);
    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: six } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.dailySummary = async (req, res, next) => {
  try {
    const start = new Date();
    start.setDate(1);
    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.weeklySummary = async (req, res, next) => {
  try {
    const start = new Date();
    start.setDate(1);
    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start } } },
      {
        $group: {
          _id: { week: { $isoWeek: "$date" }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.week": 1 } },
    ]);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.filteredReport = async (req, res, next) => {
  try {
    const { from, to, category } = req.query;
    const filter = { user: req.user.id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    const txns = await Transaction.find(filter).populate("category", "name type");
    res.json({ success: true, count: txns.length, transactions: txns });
  } catch (e) {
    next(e);
  }
};

exports.exportPDF = async (req, res) => {
  res.json({ success: true, message: "PDF export — placeholder" });
};

exports.exportImage = async (req, res) => {
  res.json({ success: true, message: "Image export — placeholder" });
};

// ============================================================
// ✅ SHARE REPORT BY EMAIL
// ============================================================
exports.shareByEmail = async (req, res, next) => {
  try {
    const { from, to, category, periodLabel } = req.body;

    // User fetch karo
    const user = await User.findById(req.user.id).select("name email");
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    // Filter banao
    const filter = { user: req.user._id };

    // Default: current month
    const start = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();

    filter.date = { $gte: start, $lte: end };
    if (category && category !== "all") filter.category = category;

    // Transactions fetch karo
    const txns = await Transaction.find(filter)
      .populate("category", "name type")
      .sort({ date: -1 });

    // Summary compute karo
    const income = txns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const catMap = {};
    txns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.category?.name || "Uncategorized";
        if (!catMap[name]) catMap[name] = 0;
        catMap[name] += t.amount;
      });

    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percent: expense ? Math.round((value / expense) * 100) : 0,
      }));

    const period =
      periodLabel ||
      (from && to
        ? `${new Date(from).toLocaleDateString()} — ${new Date(to).toLocaleDateString()}`
        : "This Month");

    // Email bhejo
    await sendReportEmail(user.email, user.name, {
      summary: { income, expense, savings: income - expense },
      categoryBreakdown,
      periodLabel: period,
    });

    console.log(`📧 Report email sent to: ${user.email}`);

    res.json({
      success: true,
      message: `Report sent to ${user.email}`,
      email: user.email,
    });
  } catch (error) {
    console.error("Share by email error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    });
  }
};