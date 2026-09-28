const Note = require("../models/Note");

exports.getAll = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (e) { next(e); }
};

exports.getByReference = async (req, res, next) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      referenceType: req.params.type,
      referenceId: req.params.id,
    });
    res.json({ success: true, notes });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const note = await Note.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, message: "Note added", note });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, req.body, { new: true }
    );
    if (!note) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated", note });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { next(e); }
};