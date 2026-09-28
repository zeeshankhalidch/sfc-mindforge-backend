const express = require("express");
const router = express.Router();

// ============ STUDENT ROUTES ============
router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/categories", require("./category.routes"));
router.use("/transactions", require("./transaction.routes"));
router.use("/budgets", require("./budget.routes"));
router.use("/recurring", require("./recurring.routes"));
router.use("/saving-tips", require("./savingTip.routes"));
router.use("/insights", require("./insight.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/bookmarks", require("./bookmark.routes"));
router.use("/notes", require("./note.routes"));
router.use("/reports", require("./report.routes"));
router.use("/dashboard", require("./dashboard.routes"));
router.use("/import", require("./import.routes"));
router.use("/ai", require("./ai.routes"));
router.use("/activity", require("./activity.routes"));

// ============ ADMIN ROUTES ============
router.use("/admin", require("./admin.routes"));

module.exports = router;