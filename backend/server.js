
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());


let tasks = [];


app.get("/tasks", (req, res) => {
  res.json(tasks);
});


app.post("/tasks", (req, res) => {
  const task = req.body;
  task.id = Date.now(); 
  task.done = false;
  tasks.push(task);
  res.status(201).json(task);
});


app.put("/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);
  const updatedTask = req.body;

  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  tasks[index] = { ...tasks[index], ...updatedTask };
  res.json(tasks[index]);
});

app.delete("/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  const removedTask = tasks.splice(index, 1);
  res.json(removedTask[0]);
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
