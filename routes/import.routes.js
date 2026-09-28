const express = require("express");
const router = express.Router();
const importController = require("../controllers/import.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/csv", protect, importController.uploadCSV);
router.get("/batches", protect, importController.getBatches);
router.get("/batches/:id", protect, importController.getBatch);
router.post("/batches/:id/apply-ai", protect, importController.applyAI);

module.exports = router;