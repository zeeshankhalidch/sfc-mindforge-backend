const Category = require("../models/Category");

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [{ isDefault: true }, { createdBy: req.user.id }],
      isActive: true,
    });
    res.json({ success: true, count: categories.length, categories });
  } catch (e) { next(e); }
};

exports.getCategoriesByType = async (req, res, next) => {
  try {
    const categories = await Category.find({
      type: req.params.type,
      $or: [{ isDefault: true }, { createdBy: req.user.id }],
      isActive: true,
    });
    res.json({ success: true, count: categories.length, categories });
  } catch (e) { next(e); }
};

exports.getCategory = async (req, res, next) => {
  try {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, category: c });
  } catch (e) { next(e); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;
    const c = await Category.create({
      name, type, icon: icon || "", isDefault: false, createdBy: req.user.id,
    });
    res.status(201).json({ success: true, message: "Category created", category: c });
  } catch (e) { next(e); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: "Not found" });
    if (c.isDefault) return res.status(403).json({ success: false, message: "Cannot edit default" });
    if (c.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not allowed" });
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: "Updated", category: updated });
  } catch (e) { next(e); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: "Not found" });
    if (c.isDefault) return res.status(403).json({ success: false, message: "Cannot delete default" });
    if (c.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not allowed" });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { next(e); }
};