const ImportBatch = require("../models/ImportBatch");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

exports.uploadCSV = async (req, res, next) => {
  try {
    const { fileName, rows } = req.body;
    const batch = await ImportBatch.create({
      user: req.user.id,
      fileName: fileName || "import.csv",
      totalRows: rows?.length || 0,
      status: "processing",
    });

    let success = 0,
      failed = 0;
    const errors = [];

    for (let i = 0; i < (rows?.length || 0); i++) {
      const row = rows[i];
      try {
        let cat = await Category.findOne({ name: row.category, isDefault: true });
        if (!cat) cat = await Category.findOne({ name: row.category, createdBy: req.user.id });
        if (!cat) throw new Error(`Category not found: ${row.category}`);

        await Transaction.create({
          user: req.user.id,
          category: cat._id,
          amount: row.amount,
          type: row.type || "expense",
          description: row.description || "",
          date: row.date ? new Date(row.date) : new Date(),
          source: "csv",
        });
        success++;
      } catch (err) {
        failed++;
        errors.push({ row: i + 1, message: err.message });
      }
    }

    batch.successfulRows = success;
    batch.failedRows = failed;
    batch.status = "completed";
    batch.errors = errors;
    await batch.save();

    res.status(201).json({ success: true, message: `Imported ${success}, failed ${failed}`, batch });
  } catch (error) {
    next(error);
  }
};

exports.getBatches = async (req, res, next) => {
  try {
    const batches = await ImportBatch.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, batches });
  } catch (error) {
    next(error);
  }
};

exports.getBatch = async (req, res, next) => {
  try {
    const batch = await ImportBatch.findOne({ _id: req.params.id, user: req.user.id });
    if (!batch) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, batch });
  } catch (error) {
    next(error);
  }
};

exports.applyAI = async (req, res) => {
  res.json({ success: true, message: "Batch AI placeholder" });
};