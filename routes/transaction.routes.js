const express = require("express");
const router = express.Router();
const txnController = require("../controllers/transaction.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, txnController.getAllTransactions);
router.get("/recent", protect, txnController.getRecentTransactions);
router.get("/summary/monthly", protect, txnController.getMonthlySummary);
router.get("/:id", protect, txnController.getTransaction);
router.post("/", protect, txnController.createTransaction);
router.put("/:id", protect, txnController.updateTransaction);
router.delete("/:id", protect, txnController.deleteTransaction);
router.post("/bulk-delete", protect, txnController.bulkDelete);

module.exports = router;