const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({

    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    to: {
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
        trim: true,
    },

    isRead: {
        type: Boolean,
        default: false,
    },

    sentAt: {
        type: Date,
        default: Date.now,
    }

});

module.exports = mongoose.model("Chat", chatSchema);