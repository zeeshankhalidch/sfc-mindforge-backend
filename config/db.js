const mongoose = require("mongoose");
const Category = require("../models/Category");

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null, seeded: false };

async function ConnectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.DBURI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    }).then((m) => {
      console.log("MongoDB Connected Successfully");
      console.log("Database:", mongoose.connection.name);
      console.log("Host:", mongoose.connection.host);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }

  if (!cached.seeded) {
    cached.seeded = true;
    seedCategories().catch((e) => console.error("Seed error:", e.message));
  }

  return cached.conn;
}

async function seedCategories() {
  try {
    const count = await Category.countDocuments({ isDefault: true });

    if (count > 0) {
      console.log(`${count} default categories already exist`);
      return;
    }

    const defaults = [
      { name: "Allowance", type: "income", icon: "💰", isDefault: true },
      { name: "Part-time Job", type: "income", icon: "💼", isDefault: true },
      { name: "Scholarship", type: "income", icon: "🎓", isDefault: true },
      { name: "Gift", type: "income", icon: "🎁", isDefault: true },
      { name: "Other Income", type: "income", icon: "💵", isDefault: true },
      { name: "Food", type: "expense", icon: "🍔", isDefault: true },
      { name: "Transport", type: "expense", icon: "🚌", isDefault: true },
      { name: "Hostel/Rent", type: "expense", icon: "🏠", isDefault: true },
      { name: "Academics", type: "expense", icon: "📚", isDefault: true },
      { name: "Subscriptions", type: "expense", icon: "📺", isDefault: true },
      { name: "Entertainment", type: "expense", icon: "🎬", isDefault: true },
      { name: "Miscellaneous", type: "expense", icon: "📦", isDefault: true },
    ];

    await Category.insertMany(defaults);
    console.log(`${defaults.length} default categories seeded`);
  } catch (error) {
    console.error("Seed error:", error.message);
  }
}

module.exports = ConnectDB;