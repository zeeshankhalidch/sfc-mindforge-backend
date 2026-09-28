const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const SavingTip = require("../models/SavingTip");

/**
 * Generate saving tips for a user based on their transactions
 */
async function generateTipsForUser(userId) {
  try {
    // Purani dismissed nahi wali tips delete karo (fresh generate)
    await SavingTip.deleteMany({ user: userId, isDismissed: false });

    const tips = [];

    // ====== Last 30 days transactions ======
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    }).populate("category", "name type");

    if (transactions.length === 0) {
      // Koi transaction nahi — generic tip
      tips.push({
        user: userId,
        title: "Start tracking your spending",
        message:
          "Add your first few transactions to get personalized saving tips.",
        potentialSavings: 0,
        priority: 1,
        source: "system",
      });
      await SavingTip.insertMany(tips);
      return tips;
    }

    // ====== Total expense ======
    const expenses = transactions.filter((t) => t.type === "expense");
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    // ====== Group by category ======
    const byCategory = {};
    expenses.forEach((t) => {
      const name = t.category?.name || "Uncategorized";
      if (!byCategory[name]) byCategory[name] = 0;
      byCategory[name] += t.amount;
    });

    // Sort categories by spending (highest first)
    const sortedCats = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // top 3

    // ====== Rule 1: Top spending category ======
    if (sortedCats.length > 0) {
      const [topCat, topAmt] = sortedCats[0];
      const percent = totalExpense
        ? Math.round((topAmt / totalExpense) * 100)
        : 0;

      if (percent > 30) {
        tips.push({
          user: userId,
          title: `Reduce your ${topCat} spending`,
          message: `${topCat} is ${percent}% of your total spending this month (₹${topAmt.toLocaleString()}). Try setting a weekly limit to save more.`,
          potentialSavings: Math.round(topAmt * 0.2),
          priority: 10,
          source: "system",
        });
      }
    }

    // ====== Rule 2: Check budgets vs actual ======
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({
      user: userId,
      month: currentMonth,
      isActive: true,
    }).populate("category", "name");

    for (const b of budgets) {
      const catName = b.category?.name;
      const spent = byCategory[catName] || 0;
      const percent = b.limitAmount ? (spent / b.limitAmount) * 100 : 0;

      if (percent >= 100) {
        tips.push({
          user: userId,
          title: `${catName} budget exceeded`,
          message: `You've spent ₹${spent.toLocaleString()} on ${catName} — that's over your ₹${b.limitAmount.toLocaleString()} budget. Slow down on ${catName} for the rest of the month.`,
          potentialSavings: Math.round(spent - b.limitAmount),
          priority: 15,
          source: "system",
        });
      } else if (percent >= 80) {
        tips.push({
          user: userId,
          title: `${catName} budget nearly used`,
          message: `You've used ${Math.round(percent)}% of your ${catName} budget (₹${spent.toLocaleString()} of ₹${b.limitAmount.toLocaleString()}). Be careful with the rest.`,
          potentialSavings: Math.round(b.limitAmount - spent),
          priority: 12,
          source: "system",
        });
      }
    }

    // ====== Rule 3: Small frequent transactions (food/subscriptions) ======
    const smallTxns = expenses.filter((t) => t.amount < 500);
    if (smallTxns.length >= 10) {
      const smallTotal = smallTxns.reduce((s, t) => s + t.amount, 0);
      tips.push({
        user: userId,
        title: "Watch out for small frequent purchases",
        message: `You made ${smallTxns.length} small purchases under ₹500 this month, totaling ₹${smallTotal.toLocaleString()}. These add up quickly — try consolidating.`,
        potentialSavings: Math.round(smallTotal * 0.15),
        priority: 8,
        source: "system",
      });
    }

    // ====== Rule 4: Subscription detection ======
    const subCat = byCategory["Subscriptions"] || 0;
    if (subCat > 0) {
      tips.push({
        user: userId,
        title: "Review your subscriptions",
        message: `You spent ₹${subCat.toLocaleString()} on subscriptions this month. Check which ones you actually use and cancel the rest.`,
        potentialSavings: Math.round(subCat * 0.3),
        priority: 9,
        source: "system",
      });
    }

    // ====== Rule 5: Income vs Expense ======
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    if (income > 0 && totalExpense > income * 0.9) {
      tips.push({
        user: userId,
        title: "You're spending most of your income",
        message: `You've spent ₹${totalExpense.toLocaleString()} out of ₹${income.toLocaleString()} income this month. Try to keep expenses below 70% of income.`,
        potentialSavings: Math.round(totalExpense - income * 0.7),
        priority: 12,
        source: "system",
      });
    }

    // ====== Rule 6: Transport tip (always useful) ======
    if (byCategory["Transport"] > 1000) {
      tips.push({
        user: userId,
        title: "Plan your transport ahead",
        message: `You spent ₹${byCategory["Transport"].toLocaleString()} on transport. Using shared rides or planning trips in advance could help.`,
        potentialSavings: Math.round(byCategory["Transport"] * 0.15),
        priority: 6,
        source: "system",
      });
    }

    // ====== Rule 7: Generic saving tip (always present) ======
    tips.push({
      user: userId,
      title: "Aim for the 50-30-20 rule",
      message:
        "Try the 50-30-20 rule: 50% for needs, 30% for wants, 20% for savings. Even small adjustments make a difference over time.",
      potentialSavings: Math.round(income * 0.05) || 500,
      priority: 3,
      source: "system",
    });

    // ====== Save all tips ======
    if (tips.length > 0) {
      await SavingTip.insertMany(tips);
    }

    return tips;
  } catch (error) {
    console.error("Tip generation error:", error);
    throw error;
  }
}

module.exports = { generateTipsForUser };