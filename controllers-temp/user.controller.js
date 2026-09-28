const User = require("../models/User");

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, academicYear, monthlyAllowance, savingsGoal } = req.body;
    const update = {};
    if (name) update.name = name;
    if (academicYear !== undefined) update.academicYear = academicYear;
    if (monthlyAllowance !== undefined) update.monthlyAllowance = monthlyAllowance;
    if (savingsGoal !== undefined) update.savingsGoal = savingsGoal;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json({ success: true, message: "Profile updated", user });
  } catch (e) { next(e); }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const { darkMode, fontSize } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { "preferences.darkMode": darkMode, "preferences.fontSize": fontSize },
      { new: true }
    ).select("-password");
    res.json({ success: true, message: "Preferences updated", user });
  } catch (e) { next(e); }
};

exports.updateProfileImage = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: req.body.profileImage },
      { new: true }
    ).select("-password");
    res.json({ success: true, message: "Image updated", user });
  } catch (e) { next(e); }
};

exports.deactivateAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.json({ success: true, message: "Account deactivated" });
  } catch (e) { next(e); }
};