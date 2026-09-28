const SavingTip = require("../models/SavingTip");
const { generateTipsForUser } = require("../services/tip.service");

// Get all tips
exports.getAllTips = async (req, res, next) => {
  try {
    let tips = await SavingTip.find({
      user: req.user.id,
      isDismissed: false,
    }).sort({ priority: -1 });

    // Agar tips nahi hain to auto-generate karo
    if (tips.length === 0) {
      await generateTipsForUser(req.user.id);
      tips = await SavingTip.find({
        user: req.user.id,
        isDismissed: false,
      }).sort({ priority: -1 });
    }

    res.json({ success: true, tips });
  } catch (error) {
    next(error);
  }
};

// Top 3 tips
exports.getTopTips = async (req, res, next) => {
  try {
    const tips = await SavingTip.find({
      user: req.user.id,
      isDismissed: false,
    })
      .sort({ priority: -1 })
      .limit(3);

    res.json({ success: true, tips });
  } catch (error) {
    next(error);
  }
};

// Generate (regenerate all tips)
exports.generateTips = async (req, res, next) => {
  try {
    await generateTipsForUser(req.user.id);
    const tips = await SavingTip.find({
      user: req.user.id,
      isDismissed: false,
    }).sort({ priority: -1 });

    res.json({ success: true, message: "Tips generated", tips });
  } catch (error) {
    next(error);
  }
};

// Pin/unpin
exports.togglePin = async (req, res, next) => {
  try {
    const tip = await SavingTip.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!tip) return res.status(404).json({ success: false, message: "Not found" });

    tip.isPinned = !tip.isPinned;
    await tip.save();
    res.json({ success: true, message: "Pin toggled", tip });
  } catch (error) {
    next(error);
  }
};

// Dismiss
exports.dismissTip = async (req, res, next) => {
  try {
    await SavingTip.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isDismissed: true }
    );
    res.json({ success: true, message: "Dismissed" });
  } catch (error) {
    next(error);
  }
};