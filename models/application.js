const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({

    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    bidAmount: {
        type: Number,
        required: true,
    },

    completionTime: {
        type: String,
        required: true,
    },

    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected"],
        default: "Pending",
    },

    appliedAt: {
        type: Date,
        default: Date.now,
    },

});

module.exports = mongoose.model("Application", applicationSchema);