const Bookmark = require("../models/Bookmark");

// Get all bookmarks for logged-in user
exports.getAll = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookmarks.length, bookmarks });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    next(error);
  }
};

// Create bookmark
exports.create = async (req, res, next) => {
  try {
    const { type, referenceId, title } = req.body;

    if (!type || !referenceId) {
      return res.status(400).json({
        success: false,
        message: "Type and referenceId are required",
      });
    }

    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      user: req.user._id,
      referenceId,
      type,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already bookmarked",
      });
    }

    const bookmark = await Bookmark.create({
      user: req.user._id,
      type,
      referenceId,
      title: title || "",
    });

    res.status(201).json({
      success: true,
      message: "Bookmarked",
      bookmark,
    });
  } catch (error) {
    console.error("Create bookmark error:", error);
    next(error);
  }
};

// Remove bookmark
exports.remove = async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found",
      });
    }

    res.json({ success: true, message: "Bookmark removed" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    next(error);
  }
};