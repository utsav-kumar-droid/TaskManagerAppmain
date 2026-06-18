require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Render provides PORT automatically
const PORT = process.env.PORT || 5000;

// Allow requests from your frontend URL
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Parse JSON request body
app.use(express.json());


// Temporary in-memory database
let tasks = [];


// Get all tasks
app.get("/tasks", (req, res) => {
  res.json(tasks);
});


// Create a task
app.post("/tasks", (req, res) => {
  const task = req.body;

  task.id = Date.now();
  task.done = false;

  tasks.push(task);

  res.status(201).json(task);
});


// Update a task
app.put("/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);
  const updatedTask = req.body;

  const index = tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  tasks[index] = {
    ...tasks[index],
    ...updatedTask,
  };

  res.json(tasks[index]);
});


// Delete a task
app.delete("/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);

  const index = tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  const removedTask = tasks.splice(index, 1);

  res.json(removedTask[0]);
});


// Health check route (useful for Render)
app.get("/", (req, res) => {
  res.send("Task Manager API is running 🚀");
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
