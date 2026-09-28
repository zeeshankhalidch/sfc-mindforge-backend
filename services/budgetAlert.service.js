const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");

/**
 * Budget alert check karo — jab bhi transaction add/update ho ya budget create ho
 */
async function checkBudgetAlert(userId, categoryId, type) {
  try {
    if (type !== "expense") return;

    const month = new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const budgets = await Budget.find({
      user: userId,
      category: categoryId,
      month,
      isActive: true,
    })
      .populate("category", "name")
      .sort({ limitAmount: 1 });

    if (!budgets || budgets.length === 0) return;

    const budget = budgets[0];
    const categoryName = budget.category?.name || "Category";
    const limit = budget.limitAmount;

    const agg = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          category: categoryId,
          type: "expense",
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const spent = agg[0]?.total || 0;
    const percent = limit ? (spent / limit) * 100 : 0;

    let alertType = null;
    let title = "";
    let message = "";

    if (percent >= 100) {
      alertType = "budget_exceeded";
      title = `🚨 ${categoryName} budget exceeded!`;
      message = `You've spent ₹${spent.toLocaleString()} on ${categoryName} — that's ${Math.round(percent)}% of your ₹${limit.toLocaleString()} budget for ${month}. Try to slow down for the rest of the month.`;
    } else if (percent >= budget.alertPercentage || percent >= 80) {
      alertType = "budget_warning";
      title = `⚠️ ${categoryName} budget nearly used`;
      message = `You've used ${Math.round(percent)}% of your ${categoryName} budget (₹${spent.toLocaleString()} of ₹${limit.toLocaleString()}) for ${month}. Be careful with the remaining ₹${(limit - spent).toLocaleString()}.`;
    }

    if (!alertType) return null;

    const existing = await Notification.findOne({
      user: userId,
      "metadata.categoryId": categoryId.toString(),
      "metadata.month": month,
    });

    if (existing) {
      existing.type = alertType;
      existing.title = title;
      existing.message = message;
      existing.isRead = false;
      existing.metadata = {
        ...existing.metadata,
        percent: Math.round(percent),
        spent,
        limit,
      };
      await existing.save();

      console.log(
        `🔔 Budget alert updated: ${alertType} for ${categoryName} (${Math.round(percent)}%)`
      );
      return existing;
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: alertType,
      isRead: false,
      link: "/budgets",
      metadata: {
        categoryId: categoryId.toString(),
        month,
        percent: Math.round(percent),
        spent,
        limit,
      },
    });

    console.log(
      `🔔 Budget alert sent: ${alertType} for ${categoryName} (${Math.round(percent)}%)`
    );

    return notification;
  } catch (error) {
    console.error("Budget alert error:", error.message);
    return null;
  }
}

module.exports = { checkBudgetAlert };