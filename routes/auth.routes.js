const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect, studentOnly } = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", protect, authController.logout);
router.get("/me", protect, authController.getMe);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.put("/change-password", protect, authController.changePassword);

module.exports = router;