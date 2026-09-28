const mongoose = require("mongoose");
const Category = require("../models/Category");

async function ConnectDB() {
    try {
        await mongoose.connect(process.env.DBURI);
        console.log("✅ MongoDB Connected Successfully!");
        console.log(`📦 Database: ${mongoose.connection.name}`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);

        // ✅ Auto-seed default categories
        await seedCategories();
    } catch (error) {
        console.error("❌ MongoDB Connection Failed!");
        console.error("Error:", error.message);
        process.exit(1);
    }
}

async function seedCategories() {
    try {
        const count = await Category.countDocuments({ isDefault: true });

        if (count > 0) {
            console.log(`✅ ${count} default categories already exist`);
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
        console.log(`🎉 ${defaults.length} default categories seeded!`);
    } catch (error) {
        console.error("⚠️  Seed error:", error.message);
    }
}

module.exports = ConnectDB;