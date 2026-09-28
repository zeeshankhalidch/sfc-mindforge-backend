const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoose = require("mongoose");

dotenv.config();

const ConnectDB = require("../config/db");
const errorHandler = require("../middleware/error.middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: false }));

ConnectDB().catch((err) => console.error("DB connect failed:", err.message));

app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };

  res.json({
    message: "Campus Coin API is running",
    server: "Running",
    database: {
      status: states[dbState] || "Unknown",
      readyState: dbState,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
    timestamp: new Date().toLocaleString(),
  });
});

app.use("/api/auth", require("../routes/auth.routes"));
app.use("/api/users", require("../routes/user.routes"));
app.use("/api/categories", require("../routes/category.routes"));
app.use("/api/transactions", require("../routes/transaction.routes"));
app.use("/api/budgets", require("../routes/budget.routes"));
app.use("/api/recurring", require("../routes/recurring.routes"));
app.use("/api/saving-tips", require("../routes/savingTip.routes"));
app.use("/api/insights", require("../routes/insight.routes"));
app.use("/api/notifications", require("../routes/notification.routes"));
app.use("/api/bookmarks", require("../routes/bookmark.routes"));
app.use("/api/notes", require("../routes/note.routes"));
app.use("/api/reports", require("../routes/report.routes"));
app.use("/api/dashboard", require("../routes/dashboard.routes"));
app.use("/api/import", require("../routes/import.routes"));
app.use("/api/ai", require("../routes/ai.routes"));
app.use("/api/activity", require("../routes/activity.routes"));
app.use("/api/admin", require("../routes/admin.routes"));

app.use(errorHandler);

module.exports = app;