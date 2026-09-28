const Recurring = require("../models/RecurringTransaction");

exports.getAll = async (req, res, next) => {
  try {
    const items = await Recurring.find({ user: req.user.id }).populate("category", "name type");
    res.json({ success: true, items });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const item = await Recurring.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, message: "Recurring created", item });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const item = await Recurring.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, req.body, { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated", item });
  } catch (e) { next(e); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const item = await Recurring.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    item.isActive = !item.isActive;
    await item.save();
    res.json({ success: true, message: "Toggled", item });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Recurring.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { next(e); }
};