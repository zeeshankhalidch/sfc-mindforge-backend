const AIClassification = require("../models/AIClassification");
const Category = require("../models/Category");

exports.categorize = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: "Description required" });
    }

    const keywords = {
      food: ["cafe", "food", "lunch", "dinner", "breakfast", "restaurant", "pizza", "burger", "canteen"],
      transport: ["bus", "taxi", "uber", "rickshaw", "petrol", "fuel", "train"],
      academics: ["book", "tuition", "fee", "course", "stationery", "pen", "notebook"],
      entertainment: ["movie", "game", "netflix", "party", "outing"],
      subscriptions: ["spotify", "subscription", "app"],
    };

    const lower = description.toLowerCase();
    let suggestedName = "Miscellaneous";
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some((w) => lower.includes(w))) {
        suggestedName = cat.charAt(0).toUpperCase() + cat.slice(1);
        break;
      }
    }

    const category = await Category.findOne({ name: suggestedName, isDefault: true });

    res.json({
      success: true,
      suggestedCategory: category ? { id: category._id, name: category.name } : null,
      confidence: 0.7,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveFeedback = async (req, res, next) => {
  try {
    const { description, userSelectedCategory } = req.body;
    const record = await AIClassification.findOne({ user: req.user.id, description }).sort({ createdAt: -1 });
    if (record) {
      record.userSelectedCategory = userSelectedCategory;
      record.wasCorrected = true;
      await record.save();
    }
    res.json({ success: true, message: "Feedback saved" });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await AIClassification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

exports.chatbot = async (req, res) => {
  res.json({ success: true, message: "Chatbot placeholder" });
};
