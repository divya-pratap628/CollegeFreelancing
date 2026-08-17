const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const User = require("./models/user");
const Task = require("./models/task");
const Chat = require("./models/chat");
const Submission = require("./models/submission");
const multer = require("multer");
const Application = require("./models/application");
const Notification = require("./models/notification");
const session = require("express-session");
const app = express();

require("dotenv").config();

app.use(session({
    secret: "collageP",
    resave: false,
    saveUninitialized: false,
}));

// MongoDB Connection
main()
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
}

// Express Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(methodOverride("_method"));



// register Route
app.get("/register", (req,res) => {
    res.render("users/register");
});

//login page
app.get("/login", (req,res) => {
    res.render("users/login");
});

//logout 
app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
           return res.send("There is some internal issue")
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");

    });

});

// dashboard page
app.get("/dashboard", async (req, res) => {
    if(!req.session.userId) {
        res.redirect("/login");
    }
    const tasks = await Task.find();
    const user = await User.findById(req.session.userId)
    res.render("dashboard/index", {
        tasks,
        user
    });

});

// postTask page
app.get("/postTask", (req,res) =>{
    res.render("tasks/postTask");
});

app.post("/register", async (req, res) => {
    const {name, email, password, collage , role} = req.body;

    if(role == "Admin") {
        return res.render("users/adminDenied");
    }
    
    const user = new User ({
        name,
        email,
        password,
        collage, 
        role
    });
    await user.save();
    res.redirect("/login");

});

app.post("/login", async(req,res)=>{

    const {email,password}=req.body;

    const user=await User.findOne({email});

    if(!user){
        return res.send("User not found");
    }

    if(user.password!==password){
        return res.send("Incorrect Password");
    }

    req.session.userId=user._id;
    req.session.userName=user.name;

    req.session.save((err)=>{

        if(err){
            return res.send("Session Error");
        }

        res.redirect("/dashboard");

    });

});

app.post("/postTask", async (req, res) => {

    console.log("Session User:", req.session.userId);

    const task = new Task({
        ...req.body,
        createdBy: req.session.userId
    });

    console.log(task);

    await task.save();

    res.redirect("/dashboard");
});
app.post("/login", async(req,res) => {
    const user = new User (req.session.UserId != req.session.email)
    res.render("users/login")
})

// show task by id
app.get("/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const task = await Task.findById(id);
    res.render("tasks/show", { task });
});

// apply for task
app.get("/tasks/:id/apply", async (req,res) => {
    const {id} = req.params;
    const task = await Task.findById(id);
    res.render("tasks/apply", { task });
});


// upload task 
app.post("/tasks/:id/apply", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

    // Save application
    const application = new Application({
        worker: req.session.userId,
        task: id,
        message: req.body.message,
        bidAmount: req.body.bidAmount,
        completionTime: req.body.completionTime,
    });

    await application.save();

   const worker = await User.findById(req.session.userId);

const notification = new Notification({
    user: task.createdBy,
    task: task._id,
    message: `${worker.name} has submitted the work for "${task.title}".`
});

    await notification.save();

    res.redirect(`/tasks/${id}`);
});

// my task
app.get("/myTasks", async (req, res) => {

    const tasks = await Task.find({
        createdBy: req.session.userId
    });

    res.render("tasks/myTasks", { tasks });

});

//my application
app.get("/myApplications", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const applications = await Application.find({
        worker: req.session.userId
    }).populate("task");

    res.render("application/myApplications", {
        applications
    });

});

// view application
app.get("/tasks/:id/application", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const { id } = req.params;

    const task = await Task.findById(id);

    if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }

    const application = await Application.find({ task: id });

    res.render("tasks/application", {
        task,
        application,
        userId: req.session.userId
    });

});

//accpet
app.put("/application/:id/accept", async (req, res) => {

    const { id } = req.params;

    const application = await Application.findById(id);

    const task = await Task.findById(application.task);

    if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }

    application.status = "Accepted";
    await application.save();

    task.status = "Assigned";
    task.assignedWorker = application.worker;
    await task.save();

    res.redirect(`/tasks/${task._id}/application`);
});

//reject
app.put("/application/:id/reject", async (req, res) => {
    const { id } = req.params;

    const application = await Application.findById(
        id);

    const task = await Task.findById(application.task);

if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }
application.status = "Rejected";
 await application.save();

    res.redirect(`/tasks/${task._id}/application`);

});

// file uplode
const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "public/uploads");
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + "-" + file.originalname);
    }

});

const upload = multer({ storage });

app.post("/tasks/:id/submit",upload.single("workFile"),async(req,res)=>{

    const task=await Task.findById(req.params.id);

    if (task.assignedWorker.toString() !== req.session.userId.toString()) {
    return res.send("Only the assigned worker can upload the work!");
}
console.log("Task:", task);
console.log("Assigned Worker:", task.assignedWorker);
console.log("Session User:", req.session.userId);
    const submission=new Submission({

        task:task._id,

        worker:req.session.userId,

        file:req.file.filename,

        message:req.body.message

    });

    await submission.save();

    const worker=await User.findById(req.session.userId);

    const notification=new Notification({

        user:task.createdBy,

        task:task._id,

        message:`${worker.name} submitted the work for "${task.title}".`

    });

    await notification.save();

    res.redirect("/myApplications");

});

app.get("/tasks/:id/submit", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.send("Task not found");
    }

    if (!task.assignedWorker) {
        return res.send("No worker has been assigned to this task.");
    }

    if (
        task.assignedWorker.toString() !==
        req.session.userId.toString()
    ) {
        return res.send("Only the assigned worker can submit work.");
    }

    res.render("submission/submit", {
        task
    });

});

// view task
app.get("/tasks/:id/submissions", async(req,res)=>{

    const submissions = await Submission.find({

        task:req.params.id

    }).populate("worker");

    const task = await Task.findById(req.params.id);

    res.render("submission/show",{

        task,

        submissions

    });

});

// approve submission
app.put("/submission/:id/approve", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
        return res.send("Submission not found");
    }

    const task = await Task.findById(submission.task);

    if (!task) {
        return res.send("Task not found");
    }

    // Only task owner/client can approve
    if (
        task.createdBy.toString() !==
        req.session.userId.toString()
    ) {
        return res.send("Access Denied");
    }

    submission.status = "Approved";

    await submission.save();

    task.status = "Completed";

    await task.save();

    res.redirect(`/tasks/${task._id}/submissions`);
});

// changes
app.put("/submission/:id/changes", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
        return res.send("Submission not found");
    }

    const task = await Task.findById(submission.task);

    if (!task) {
        return res.send("Task not found");
    }

    // Only task owner/client can request changes
    if (
        task.createdBy.toString() !==
        req.session.userId.toString()
    ) {
        return res.send("Access Denied");
    }

    submission.status = "Changes Requested";

    await submission.save();

    res.redirect(`/tasks/${task._id}/submissions`);
});

// mark complete
app.put("/tasks/:id/complete", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

if (!req.session.userId) {
    return res.redirect("/login");
}

if (!task) {
    return res.send("Task not found");
}

if (!task.createdBy) {
    return res.send("Task owner not found");
}

if (task.createdBy.toString() !== req.session.userId.toString()) {
    return res.send("Access Denied");
}

    task.status = "Completed";

    await task.save();

    res.redirect(`/tasks/${id}`);
});

// edit route
app.get("/tasks/:id/edit", async (req, res) => {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }

    res.render("tasks/edit", { task });
});

//update task
app.put("/tasks/:id", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

    if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }

    await Task.findByIdAndUpdate(id, req.body);

    res.redirect(`/tasks/${id}`);
});

//delete taks
app.delete("/tasks/:id", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

    if (task.createdBy.toString() !== req.session.userId.toString()) {
        return res.send("Access Denied");
    }

    await Task.findByIdAndDelete(id);

    res.redirect("/dashboard");
});

// Open Chat Page
app.get("/tasks/:id/chat", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

    const chats = await Chat.find({
        task: id
    })
    .populate("from")
    .populate("to");

    res.render("chat/index", {
        task,
        chats
    });

});

// Send Message
app.post("/tasks/:id/chat", async (req, res) => {

    const { id } = req.params;

    const task = await Task.findById(id);

    // Debugging
    console.log("Session User:", req.session.userId);
    console.log("Task:", task);
    console.log("Task Owner:", task.createdBy);

    const chat = new Chat({

        from: req.session.userId,

        to: task.createdBy,

        task: id,

        message: req.body.message

    });

    await chat.save();

    res.redirect(`/tasks/${id}/chat`);

});

// view profile
app.get("/profile", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const user = await User.findById(req.session.userId);

    res.render("users/profile", { user });

});

//editProfile
app.get("/profile/edit", async (req,res) => {
    const user = await User.findById(req.session.userId);
    res.render("users/editProfile", {user});
});

//updateProfile
app.put("/profile", async (req, res) => {

    await User.findByIdAndUpdate(
        req.session.userId,
        req.body
    );

    res.redirect("/profile");

});

// notification
app.get("/notifications", async (req, res) => {

    const notifications = await Notification.find({
        user: req.session.userId
    });

    res.render("notification/index", {
        notifications
    });

});


// Admin Dashboard
app.get("/admin/dashboard", async (req, res) => {

    const totalUsers = await User.countDocuments();

    const totalWorker = await User.countDocuments({
        role: "Worker"
    });

    const totalClient = await User.countDocuments({
        role: "Client"
    });

    const totalTasks = await Task.countDocuments();

    const totalApplication = await Application.countDocuments();

    const totalNotifaction = await Notification.countDocuments();

    res.render("admin/dashboard", {
        totalUsers,
        totalWorker,
        totalClient,
        totalTasks,
        totalApplication,
        totalNotifaction
    });
});


// Server
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});



