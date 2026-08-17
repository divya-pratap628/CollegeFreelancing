const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    budget: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    otherCategory: String,

    deadline: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["Open", "Assigned", "Completed", "Cancelled"],
        default: "Open"
    },
    assignedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
},

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


const Task = mongoose.model("Task", taskSchema);

module.exports = Task;