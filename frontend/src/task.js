// index.js or main render file
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

const API_BASE = process.env.API_BASE || "https://taskappmanager.onrender.com";
console.log("API_BASE:", API_BASE);

// Downloaded local audio file inside your public folder 
const ALARM_SOUND_SRC = "./alarm.mp3"; 

function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("home");
  const [editTask, setEditTask] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [alarmedTasks, setAlarmedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize with your downloaded audio file path
const alarmRef = useRef(null);

  // 1. Initial Fetch
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${API_BASE}/tasks`);
        if (Array.isArray(res.data)) {
          setTasks(res.data);
        } else {
          console.error("Invalid tasks response:", res.data);
          setTasks([]);
        }
      } catch (error) {
        console.error("Cannot connect to backend:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // 2. Configure looping so it plays continuously until user clicks "OK"
  useEffect(() => {
    if (alarmRef.current) {
      alarmRef.current.loop = true;
    }
  }, []);

  // 3. Audio Unlocker for Fallback Click Interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (alarmRef.current) {
        alarmRef.current.play()
          .then(() => {
            alarmRef.current.pause();
            alarmRef.current.currentTime = 0;
            console.log("✅ Background Audio pipeline unlocked dynamically!");
          })
          .catch(err => console.log("Audio unlock deferred:", err));
      }
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);

  // 4. Pure, Stable Background Timer Loop with Thread-Safe Side Effects
 useEffect(() => {
  const timer = setInterval(() => {
    const now = new Date();

    tasks.forEach((task) => {
      if (
        !task.date ||
        !task.endTime ||
        task.done ||
        alarmedTasks.includes(task.id)
      ) {
        return;
      }

      const target = new Date(
        `${task.date}T${
          task.endTime.length === 5
            ? task.endTime + ":00"
            : task.endTime
        }`
      );

      if (isNaN(target)) return;

      if (now >= target) {
        setAlarmedTasks((prev) => [...prev, task.id]);

        if (alarmRef.current) {
          alarmRef.current.currentTime = 0;

          alarmRef.current
            .play()
            .then(() => console.log("Alarm started"))
            .catch((err) =>
              console.error("Audio blocked:", err)
            );
        }

        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("⏰ Task Finished", {
            body: task.title,
          });
        }

        // React modal preferred
        setTimeout(() => {
          const stop = window.confirm(
            `⏰ ${task.title} completed.\n\nPress OK to stop alarm.`
          );

          if (stop && alarmRef.current) {
            alarmRef.current.pause();
            alarmRef.current.currentTime = 0;
          }
        }, 100);
      }
    });
  }, 1000);

  return () => clearInterval(timer);
}, [tasks, alarmedTasks]);

  const saveTask = (task) => {
    if (editTask) {
      axios.put(`${API_BASE}/tasks/${task.id}`, task).then((res) => {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
        setEditTask(null);
        setView("home");
      });
    } else {
      axios.post(`${API_BASE}/tasks`, task).then((res) => {
        setTasks((prev) => [...prev, res.data]);
        setView("home");
      });
    }
  };

  const deleteTask = (id) => {
    axios.delete(`${API_BASE}/tasks/${id}`).then(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });
  };

  const toggleDone = (id) => {
    const task = tasks.find((t) => t.id === id);
    axios.put(`${API_BASE}/tasks/${id}`, { ...task, done: !task.done }).then((res) => {
      setTasks(tasks.map((t) => (t.id === id ? res.data : t)));
    });
  };

  const filteredTasks = filterCategory ? tasks.filter((t) => t.category === filterCategory) : tasks;
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") return a.priority.localeCompare(b.priority);
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return new Date(a.date) - new Date(b.date);
  });

 return (
  <>
    <audio
      ref={alarmRef}
      src="./alarm.mp3"
      preload="auto"
      loop
    />

    {view === "home" ? (
      <Home
        tasks={sortedTasks}
        allTasks={tasks}
        filterCategory={filterCategory}
        setFilterCategory={(c) =>
          setFilterCategory(c === filterCategory ? null : c)
        }
        goAdd={() => setView("add")}
        goDetail={() => setView("detail")}
        alarmRef={alarmRef}
      />
    ) : view === "add" ? (
      <CreateTask
        onSave={saveTask}
        taskToEdit={editTask}
        goBack={() => {
          setEditTask(null);
          setView("home");
        }}
      />
    ) : (
      <Detail
        tasks={tasks}
        toggleDone={toggleDone}
        deleteTask={deleteTask}
        onEdit={(t) => {
          setEditTask(t);
          setView("add");
        }}
        goBack={() => setView("home")}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    )}
  </>
);
}

function CreateTask({ onSave, taskToEdit, goBack }) {
  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [category, setCategory] = useState(taskToEdit?.category || "");
  const [date, setDate] = useState(taskToEdit?.date || "");
  const [startTime, setStartTime] = useState(taskToEdit?.startTime || "");
  const [endTime, setEndTime] = useState(taskToEdit?.endTime || "");
  const [priority, setPriority] = useState(taskToEdit?.priority || "Medium");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert("End time must be after start time");
      return;
    }
    const newTask = { title, category, date, startTime, endTime, priority };
    if (taskToEdit) { newTask.id = taskToEdit.id; }
    onSave(newTask);
  };

  return (
    <div className="container1">
      <div className="arrow-heading" style={{ display: "flex", alignItems: "center", color: "#5e5bb9", marginBottom: "20px", cursor: "pointer" }} onClick={goBack}>
        <img src="https://cdn-icons-png.flaticon.com/512/93/93634.png" alt="Back" style={{ height: "24px", width: "24px", marginRight: "10px" }} />
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Create Task</h2>
      </div>

      <form className="task-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label>Task Title:</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Category:</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="">Select Category</option>
          <option value="Work">Work</option>
          <option value="Study">Study</option>
          <option value="Personal">Personal</option>
          <option value="Health">Health</option>
          <option value="Exercise">Exercise</option>
          <option value="Creative">Creative</option>
        </select>

        <label>Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <label>Start Time:</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>End Time:</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <label>Priority:</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} required>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

function Detail({ tasks, toggleDone, deleteTask, onEdit, goBack, sortBy, setSortBy }) {
  return (
    <div className="container2">
      <button onClick={goBack}>← Back</button>
      <h2>All Tasks</h2>
      <div style={{ marginBottom: "10px" }}>
        <label>Sort by: </label>
        <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
          <option value="date">Date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
      </div>
      <ul className="detail-tasks">
        {tasks.map((t) => (
          <li key={t.id} style={{ color: "#5e5bb9", marginBottom: "8px" }}>
            <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} />
            <strong>{t.title}</strong> – {t.category} • {t.date} {t.startTime}-{t.endTime} • Priority: {t.priority}
            <div className="task-buttons">
              <button onClick={() => onEdit(t)}>Edit</button>
              <button onClick={() => deleteTask(t.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home({ tasks, allTasks, filterCategory, setFilterCategory, goAdd, goDetail, alarmRef }) {
  const [time, setTime] = useState(new Date());
  const [notiPermission, setNotiPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
 

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotiPermission(permission);

    // Warm up and unlock the media pipeline path inside direct click event thread context
    if (alarmRef.current) {
      alarmRef.current.play()
        .then(() => {
          alarmRef.current.pause();
          alarmRef.current.currentTime = 0;
          console.log("Audio pipeline fully primed!");
        })
        .catch(err => console.log("Audio configuration bypassed:", err));
    }

    if (permission === "granted") {
      new Notification("🔔 System Connected!", {
        body: "Alarms and notifications are now active.",
      });
    }
  };
   <button
  onClick={() => {
    alarmRef.current.play();
  }}
>
  Test Alarm
</button>
  
  const completedCount = allTasks.filter((task) => task.done).length;
  const categories = ["Work", "Study", "Personal", "Health", "Exercise", "Creative"];
  const counts = categories.map((cat) => allTasks.filter((t) => t.category === cat).length);

  return (
    <div className="container">
      <div className="clock" style={{ textAlign: "center", padding: "10px" }}>
        <h2>{time.toLocaleTimeString()}</h2>
        <p>
          {time.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          })}
        </p>

        {/* Dynamic Notification Action Block */}
        <div style={{ marginTop: "10px" }}>
          {notiPermission !== "granted" ? (
            <button onClick={handleEnableNotifications}>
              🔔 Turn On Notifications & Sound
            </button>
          ) : (
            <span>✓ Notifications & Audio Active</span>
          )}
        </div>
      </div>

      <p className="para1">Let's check out your today's task</p>
      <div className="repobox">
        <div className="autoslider">
          <p className="para2">
            {allTasks.length === 0 ? "No tasks yet" : `${Math.round((completedCount / allTasks.length) * 100)}% completed`}
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={allTasks.length === 0 ? 0 : Math.round((completedCount / allTasks.length) * 100)}
            readOnly
            style={{ background: `linear-gradient(to right, #cfcef6 0%, #cfcef6 ${allTasks.length === 0 ? 0 : (completedCount / allTasks.length) * 100}%, #a6a7e4 ${allTasks.length === 0 ? 0 : (completedCount / allTasks.length) * 100}%)` }}
          />
        </div>

        <div className="task-header">
          <h3>You have {allTasks.length - completedCount} more <br /> task(s) to do</h3>
          <div className="logo-circle">
            <img src="https://static.vecteezy.com/system/resources/thumbnails/014/966/437/small_2x/books-and-gears-illustration-in-minimal-style-png.png" alt="book" />
          </div>
        </div>

        <button onClick={goDetail}>Details</button>
      </div>

      <div className="dotted-box">
        <span className="category">Task Category</span>
        <div className="category-grid">
          {categories.map((cat, i) => (
            <div
              key={cat}
              className={`cate ${filterCategory === cat ? "selected" : ""}`}
              onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
            >
              {cat} ({counts[i]})
            </div>
          ))}
        </div>
      </div>

      <div className="footer-icons">
        <div className="icon home">
          <img src="https://static.vecteezy.com/system/resources/previews/010/157/862/original/house-and-home-icon-symbol-sign-free-png.png" alt="Home" />
        </div>
        <div className="icon createnew" onClick={goAdd}>
          <img src="https://cdn1.iconfinder.com/data/icons/media-communication-flat-1/32/36-Add-512.png" alt="Create New" />
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);

