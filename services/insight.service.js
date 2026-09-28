const Transaction = require("../models/Transaction");
const Insight = require("../models/Insight");

/**
 * Generate AI-style monthly insight for a user
 */
async function generateInsightForUser(userId) {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    const start = new Date(`${currentMonth}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    // Previous month
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(start);

    // Current month transactions
    const current = await Transaction.find({
      user: userId,
      date: { $gte: start, $lt: end },
    }).populate("category", "name type");

    // Previous month transactions
    const previous = await Transaction.find({
      user: userId,
      date: { $gte: prevStart, $lt: prevEnd },
    }).populate("category", "name type");

    if (current.length === 0) {
      // Delete old insight for this month and skip
      await Insight.findOneAndDelete({ user: userId, month: currentMonth });
      return null;
    }

    // Calculate totals
    const totalIncome = current
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = current
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    // Group by category
    const currentByCat = {};
    current
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.category?.name || "Uncategorized";
        if (!currentByCat[name]) currentByCat[name] = 0;
        currentByCat[name] += t.amount;
      });

    const prevByCat = {};
    previous
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.category?.name || "Uncategorized";
        if (!prevByCat[name]) prevByCat[name] = 0;
        prevByCat[name] += t.amount;
      });

    // Top categories
    const sortedCats = Object.entries(currentByCat).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0];

    // Build summary text
    const monthName = new Date(start).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    let summaryParts = [];
    summaryParts.push(
      `In ${monthName}, you spent ₹${totalExpense.toLocaleString()} and earned ₹${totalIncome.toLocaleString()}.`
    );

    if (topCat) {
      const pct = totalExpense
        ? Math.round((topCat[1] / totalExpense) * 100)
        : 0;
      summaryParts.push(
        `${topCat[0]} was your biggest expense at ₹${topCat[1].toLocaleString()} (${pct}% of total).`
      );
    }

    // Flagged categories — growth vs previous month
    const flaggedCategories = [];
    Object.entries(currentByCat).forEach(([cat, amt]) => {
      const prevAmt = prevByCat[cat] || 0;
      if (prevAmt > 0) {
        const growth = ((amt - prevAmt) / prevAmt) * 100;
        if (growth >= 20) {
          flaggedCategories.push({
            categoryName: cat,
            growthPercentage: Math.round(growth),
            message: `${cat} spending rose ${Math.round(growth)}% compared to last month.`,
          });
        }
      } else if (amt > 1000) {
        // New category with high spending
        flaggedCategories.push({
          categoryName: cat,
          growthPercentage: 100,
          message: `You started spending on ${cat} this month (₹${amt.toLocaleString()}).`,
        });
      }
    });

    // Build tip
    let tipText = "";
    if (flaggedCategories.length > 0) {
      const top = flaggedCategories[0];
      tipText = `Try setting a weekly limit for ${top.categoryName} to slow down the increase.`;
    } else if (topCat) {
      tipText = `You're spending consistently. Consider increasing your savings goal by ₹500 this month.`;
    } else {
      tipText = "Keep tracking your expenses regularly to spot patterns early.";
    }

    // Total summary
    const summaryText = summaryParts.join(" ");

    // Upsert insight
    const insight = await Insight.findOneAndUpdate(
      { user: userId, month: currentMonth },
      {
        user: userId,
        month: currentMonth,
        summaryText,
        tipText,
        flaggedCategories: flaggedCategories.map((f) => ({
          message: f.message,
          growthPercentage: f.growthPercentage,
        })),
        generatedBy: "system",
        generatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    return insight;
  } catch (error) {
    console.error("Generate insight error:", error);
    throw error;
  }
}

module.exports = { generateInsightForUser };