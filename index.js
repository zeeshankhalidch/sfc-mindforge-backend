const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoose = require("mongoose");   

dotenv.config();

const ConnectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: false }));

ConnectDB();

// Auto-generate tips for all users on startup
setTimeout(async () => {
  try {
    const User = require("./models/User");
    const { generateTipsForUser } = require("./services/tip.service");
    const users = await User.find({ role: "student", isActive: true });
    for (const u of users) {
      try {
        await generateTipsForUser(u._id);
      } catch (e) {
        // ignore per user
      }
    }
    console.log(`🎁 Tips generated for ${users.length} users`);
  } catch (e) {
    console.error("Startup tip generation failed:", e.message);
  }
}, 3000);

app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;

  const states = {
    0: " Disconnected",
    1: " Connected",
    2: " Connecting",
    3: "  Disconnecting",
  };

  res.json({
    message: "Campus Coin API is running ",
    server: " Running",
    database: {
      status: states[dbState] || " Unknown",
      readyState: dbState,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
    timestamp: new Date().toLocaleString(),
  });
});

app.use("/api", require("./routes/index"));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});