const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/categorize", protect, aiController.categorize);
router.post("/categorize/feedback", protect, aiController.saveFeedback);
router.get("/classification-history", protect, aiController.getHistory);
router.post("/chatbot", protect, aiController.chatbot);

module.exports = router;