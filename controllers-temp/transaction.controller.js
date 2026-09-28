const Transaction = require("../models/Transaction");
const ActivityLog = require("../models/ActivityLog");
const { checkBudgetAlert } = require("../services/budgetAlert.service");

exports.getAllTransactions = async (req, res, next) => {
  try {
    const { type, category, from, to } = req.query;
    const filter = { user: req.user.id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const txns = await Transaction.find(filter)
      .populate("category", "name type icon")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: txns.length, transactions: txns });
  } catch (e) {
    next(e);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    const t = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
      .populate("category", "name type");
    if (!t) return res.status(404).json({ success: false, message: "Not found" });
    await ActivityLog.create({
      user: req.user.id,
      action: "view_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });
    res.json({ success: true, transaction: t });
  } catch (e) {
    next(e);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const { category, amount, type, description, date, isRecurring } = req.body;

    const t = await Transaction.create({
      user: req.user.id,
      category,
      amount,
      type,
      description: description || "",
      date: date || new Date(),
      isRecurring: isRecurring || false,
    });

    await ActivityLog.create({
      user: req.user.id,
      action: "create_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    // ✅ Budget alert check karo (async — response block nahi karega)
    checkBudgetAlert(req.user._id, category, type).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Transaction added",
      transaction: t,
    });
  } catch (e) {
    next(e);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const t = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!t) return res.status(404).json({ success: false, message: "Not found" });

    await ActivityLog.create({
      user: req.user.id,
      action: "edit_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    // ✅ Budget alert check (agar amount ya category change hui ho)
    checkBudgetAlert(req.user._id, t.category, t.type).catch(() => {});

    res.json({ success: true, message: "Updated", transaction: t });
  } catch (e) {
    next(e);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const t = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!t) return res.status(404).json({ success: false, message: "Not found" });

    await ActivityLog.create({
      user: req.user.id,
      action: "delete_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    // ✅ Delete ke baad bhi check karo — alert hata sakte ho ya downgrade
    checkBudgetAlert(req.user._id, t.category, t.type).catch(() => {});

    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.bulkDelete = async (req, res, next) => {
  try {
    await Transaction.deleteMany({
      _id: { $in: req.body.ids },
      user: req.user.id,
    });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.getMonthlySummary = async (req, res, next) => {
  try {
    const { month } = req.query;
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const result = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const income = result.find((r) => r._id === "income")?.total || 0;
    const expense = result.find((r) => r._id === "expense")?.total || 0;
    res.json({
      success: true,
      month,
      income,
      expense,
      balance: income - expense,
    });
  } catch (e) {
    next(e);
  }
};

exports.getRecentTransactions = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({
      user: req.user.id,
      action: { $in: ["view_transaction", "edit_transaction"] },
    })
      .sort({ createdAt: -1 })
      .limit(10);
    const ids = logs.map((l) => l.referenceId);
    const txns = await Transaction.find({ _id: { $in: ids } }).populate(
      "category",
      "name type"
    );
    res.json({ success: true, transactions: txns });
  } catch (e) {
    next(e);
  }
};