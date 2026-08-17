const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({

    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true
    },

    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    file: {
        type: String,
        required: true
    },

    message: {
        type: String
    },

    status: {
        type: String,
        enum: ["Pending Review", "Approved", "Changes Requested"],
        default: "Pending Review"
    },

    submittedAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Submission", submissionSchema);