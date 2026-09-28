const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    summaryText: {
      type: String,
      required: true,
    },

    tipText: {
      type: String,
      default: "",
    },

    flaggedCategories: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },

        growthPercentage: {
          type: Number,
          default: 0,
        },

        message: {
          type: String,
          default: "",
        },
      },
    ],

    generatedBy: {
      type: String,
      enum: ["ai", "system"],
      default: "ai",
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Insight", insightSchema);