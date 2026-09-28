const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { checkBudgetAlert } = require("../services/budgetAlert.service");

exports.getAllBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user.id, isActive: true })
      .populate("category", "name type icon");
    res.json({ success: true, budgets });
  } catch (e) {
    next(e);
  }
};

exports.getBudgetsByMonth = async (req, res, next) => {
  try {
    const budgets = await Budget.find({
      user: req.user.id,
      month: req.params.month,
    }).populate("category", "name type");
    res.json({ success: true, budgets });
  } catch (e) {
    next(e);
  }
};

exports.createBudget = async (req, res, next) => {
  try {
    const { category, month, limitAmount, alertPercentage } = req.body;

    const budget = await Budget.create({
      user: req.user.id,
      category,
      month,
      limitAmount,
      alertPercentage: alertPercentage || 80,
    });

    // ✅ Budget banate hi existing transactions check karo
    checkBudgetAlert(req.user._id, category, "expense").catch(() => {});

    res.status(201).json({
      success: true,
      message: "Budget created",
      budget,
    });
  } catch (e) {
    next(e);
  }
};

exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!budget) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // ✅ Update ke baad check karo
    checkBudgetAlert(req.user._id, budget.category, "expense").catch(() => {});

    res.json({ success: true, message: "Updated", budget });
  } catch (e) {
    next(e);
  }
};

exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!budget) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.getBudgetStatus = async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({
      user: req.user.id,
      month,
      isActive: true,
    }).populate("category", "name");

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const status = [];
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
      const pct = b.limitAmount ? (used / b.limitAmount) * 100 : 0;
      status.push({
        budget: b,
        used,
        remaining: b.limitAmount - used,
        percentage: Math.round(pct),
        status: pct >= 100 ? "exceeded" : pct >= b.alertPercentage ? "warning" : "ok",
      });
    }
    res.json({ success: true, month, status });
  } catch (e) {
    next(e);
  }
};