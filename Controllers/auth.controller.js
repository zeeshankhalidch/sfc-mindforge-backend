const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PasswordResetToken = require("../models/PasswordResetToken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/email");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "secret123", {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, academicYear, monthlyAllowance, savingsGoal } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password required" });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed,
      academicYear: academicYear || "",
      monthlyAllowance: monthlyAllowance || 0,
      savingsGoal: savingsGoal || 0,
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) { next(error); }
};

exports.logout = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Token generate karo
    const token = crypto.randomBytes(32).toString("hex");
    await PasswordResetToken.create({
      user: user._id,
      token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    // Email bhejo
    try {
      await sendPasswordResetEmail(user.email, user.name, token);
      console.log(`📧 Reset email sent to: ${user.email}`);

      return res.json({
        success: true,
        message: `Reset link sent to ${user.email}`,
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError.message);

      // Fallback: email fail ho gayi to token response mein bhej do
      return res.json({
        success: true,
        message: "Email failed. Use the fallback link below.",
        token,
        emailError: emailError.message,
      });
    }
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const record = await PasswordResetToken.findOne({ token, used: false });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(record.user, { password: hashed });
    record.used = true;
    await record.save();
    res.json({ success: true, message: "Password reset successful" });
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Old password wrong" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed" });
  } catch (error) { next(error); }
};