const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    aiSuggestedCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    aiSuggestionAccepted: {
      type: Boolean,
      default: false,
    },

    source: {
      type: String,
      enum: ["manual", "csv", "ai"],
      default: "manual",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);