/* ===========================
   Student Focus Dashboard
   Vanilla JavaScript
   =========================== */

// ─── Utility: today's date key for localStorage ───
function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ═══════════════════════════════════════════════════
//  1. DARK MODE TOGGLE
// ═══════════════════════════════════════════════════

const themeToggle = document.getElementById("theme-toggle");

function loadTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeToggle.textContent = saved === "dark" ? "☀️" : "🌙";
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
});

loadTheme();

// ═══════════════════════════════════════════════════
//  2. SUBJECT MANAGER
// ═══════════════════════════════════════════════════

const subjectSelect = document.getElementById("subject-select");
const btnAddSubject = document.getElementById("btn-add-subject");
const addSubjectRow = document.getElementById("add-subject-row");
const newSubjectInput = document.getElementById("new-subject-input");
const btnSaveSubject = document.getElementById("btn-save-subject");

// Load / save subjects list
function loadSubjects() {
  const raw = localStorage.getItem("subjects");
  return raw ? JSON.parse(raw) : ["Mathematics", "Science", "English", "History", "Programming"];
}

function saveSubjects(list) {
  localStorage.setItem("subjects", JSON.stringify(list));
}

// Populate the dropdown
function renderSubjectDropdown() {
  const subjects = loadSubjects();
  const currentVal = subjectSelect.value;
  // Keep the first placeholder option, rebuild the rest
  subjectSelect.innerHTML = '<option value="">— Select Subject —</option>';
  subjects.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    subjectSelect.appendChild(opt);
  });
  // Restore selection if still valid
  if (subjects.includes(currentVal)) subjectSelect.value = currentVal;
}

// Toggle "add subject" row
btnAddSubject.addEventListener("click", () => {
  addSubjectRow.classList.toggle("hidden");
  if (!addSubjectRow.classList.contains("hidden")) newSubjectInput.focus();
});

// Save new subject
function saveNewSubject() {
  const name = newSubjectInput.value.trim();
  if (!name) return;
  const subjects = loadSubjects();
  if (!subjects.includes(name)) {
    subjects.push(name);
    saveSubjects(subjects);
  }
  newSubjectInput.value = "";
  addSubjectRow.classList.add("hidden");
  renderSubjectDropdown();
  subjectSelect.value = name; // auto-select the new subject
}

btnSaveSubject.addEventListener("click", saveNewSubject);
newSubjectInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveNewSubject();
});

renderSubjectDropdown();

// ═══════════════════════════════════════════════════
//  3. FOCUS TIMER (Pomodoro) — with subject tracking
// ═══════════════════════════════════════════════════

let focusMinutes = 25;
let breakMinutes = 5;
let timerSeconds = focusMinutes * 60;
let timerInterval = null;
let isRunning = false;
let isBreak = false;

// DOM
const display = document.getElementById("timer-display");
const timerLabel = document.getElementById("timer-label");
const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");
const sessionCountEl = document.getElementById("session-count");

// Presets & custom
const presetBtns = document.querySelectorAll(".preset-btn:not(#btn-custom-preset)");
const btnCustomPreset = document.getElementById("btn-custom-preset");
const customTimeRow = document.getElementById("custom-time-row");
const customFocusInput = document.getElementById("custom-focus");
const customBreakInput = document.getElementById("custom-break");
const btnApplyCustom = document.getElementById("btn-apply-custom");

// Preset buttons
presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    customTimeRow.classList.add("hidden");
    focusMinutes = parseInt(btn.dataset.focus, 10);
    breakMinutes = parseInt(btn.dataset.break, 10);
    resetTimerDisplay();
  });
});

btnCustomPreset.addEventListener("click", () => {
  if (isRunning) return;
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
  btnCustomPreset.classList.add("active");
  customTimeRow.classList.toggle("hidden");
});

btnApplyCustom.addEventListener("click", () => {
  if (isRunning) return;
  const f = parseInt(customFocusInput.value, 10);
  const b = parseInt(customBreakInput.value, 10);
  if (!f || f < 1 || !b || b < 1) return;
  focusMinutes = Math.min(f, 120);
  breakMinutes = Math.min(b, 60);
  customTimeRow.classList.add("hidden");
  resetTimerDisplay();
});

function resetTimerDisplay() {
  isBreak = false;
  timerSeconds = focusMinutes * 60;
  renderTimer();
}

// Daily data (overall)
function loadDailyData() {
  const raw = localStorage.getItem("daily_" + todayKey());
  return raw ? JSON.parse(raw) : { sessions: 0, focusSeconds: 0 };
}
function saveDailyData(data) {
  localStorage.setItem("daily_" + todayKey(), JSON.stringify(data));
}

// Subject-wise data for today
function loadSubjectData() {
  const raw = localStorage.getItem("subjectData_" + todayKey());
  return raw ? JSON.parse(raw) : {};
}
function saveSubjectData(data) {
  localStorage.setItem("subjectData_" + todayKey(), JSON.stringify(data));
}

function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function renderTimer() {
  display.textContent = formatTime(timerSeconds);
  const subject = subjectSelect.value;
  if (isBreak) {
    timerLabel.textContent = "Break Time 🧘";
  } else if (subject) {
    timerLabel.textContent = `Studying: ${subject} 🎯`;
  } else {
    timerLabel.textContent = "Focus Time 🎯";
  }
  const daily = loadDailyData();
  sessionCountEl.innerHTML = `Sessions today: <strong>${daily.sessions}</strong>`;
}

function tick() {
  if (timerSeconds <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    if (!isBreak) {
      // Record session — overall
      const daily = loadDailyData();
      daily.sessions += 1;
      daily.focusSeconds += focusMinutes * 60;
      saveDailyData(daily);

      // Record session — per subject
      const subject = subjectSelect.value;
      if (subject) {
        const sd = loadSubjectData();
        if (!sd[subject]) sd[subject] = { sessions: 0, seconds: 0 };
        sd[subject].sessions += 1;
        sd[subject].seconds += focusMinutes * 60;
        saveSubjectData(sd);
      }

      isBreak = true;
      timerSeconds = breakMinutes * 60;
      renderTimer();
      renderStats();
      renderSubjectStats();
      showQuote("break");  // rotate to a break quote
      alert("🎉 Focus session complete! Take a break.");
      return;
    } else {
      isBreak = false;
      timerSeconds = focusMinutes * 60;
      renderTimer();
      showQuote("focus");  // rotate to a focus quote
      alert("⏰ Break over! Ready for another session?");
      return;
    }
  }
  timerSeconds--;
  renderTimer();
}

btnStart.addEventListener("click", () => {
  if (isRunning) return;
  isRunning = true;
  showQuote("focus");  // rotate to a new focus quote on session start
  timerInterval = setInterval(tick, 1000);
});

btnPause.addEventListener("click", () => {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
});

btnReset.addEventListener("click", () => {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  resetTimerDisplay();
});

// Update label when subject changes
subjectSelect.addEventListener("change", renderTimer);

renderTimer();

// ═══════════════════════════════════════════════════
//  4. TASK MANAGER
// ═══════════════════════════════════════════════════

const taskInput = document.getElementById("task-input");
const btnAddTask = document.getElementById("btn-add-task");
const taskList = document.getElementById("task-list");

function loadTasks() {
  const raw = localStorage.getItem("tasks");
  return raw ? JSON.parse(raw) : [];
}
function saveTasks(tasks) {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks() {
  const tasks = loadTasks();
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty-msg">No tasks yet — add one above!</li>';
    renderStats();
    return;
  }
  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => toggleTask(index));

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    const delBtn = document.createElement("button");
    delBtn.className = "task-delete";
    delBtn.textContent = "✕";
    delBtn.title = "Delete task";
    delBtn.addEventListener("click", () => deleteTask(index));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });
  renderStats();
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  const tasks = loadTasks();
  tasks.push({ text, done: false, createdAt: todayKey() });
  saveTasks(tasks);
  taskInput.value = "";
  renderTasks();
}

btnAddTask.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });

function toggleTask(index) {
  const tasks = loadTasks();
  tasks[index].done = !tasks[index].done;
  tasks[index].completedAt = tasks[index].done ? todayKey() : null;
  saveTasks(tasks);
  renderTasks();
}

function deleteTask(index) {
  const tasks = loadTasks();
  tasks.splice(index, 1);
  saveTasks(tasks);
  renderTasks();
}

renderTasks();

// ═══════════════════════════════════════════════════
//  5. DAILY STATS
// ═══════════════════════════════════════════════════

const statFocusTime = document.getElementById("stat-focus-time");
const statSessions = document.getElementById("stat-sessions");
const statCompleted = document.getElementById("stat-completed");
const statPending = document.getElementById("stat-pending");

function renderStats() {
  const daily = loadDailyData();
  statFocusTime.textContent = Math.floor(daily.focusSeconds / 60) + " min";
  statSessions.textContent = daily.sessions;

  const tasks = loadTasks();
  const today = todayKey();
  statCompleted.textContent = tasks.filter((t) => t.done && t.completedAt === today).length;
  statPending.textContent = tasks.filter((t) => !t.done).length;
}

renderStats();

// ═══════════════════════════════════════════════════
//  6. MOTIVATIONAL QUOTE ROTATOR
//     – Focus quotes shown when a session STARTS
//     – Break quotes shown when a session COMPLETES
//     – Smooth CSS fade-in / fade-out transition
// ═══════════════════════════════════════════════════

// Quotes shown when a focus session starts
const focusQuotes = [
  "The secret of getting ahead is getting started.",
  "Start where you are. Use what you have.",
  "Action creates clarity.",
  "Focus on the next step, not the whole staircase.",
];

// Quotes shown when a focus session completes (break time)
const breakQuotes = [
  "Good work. Take the break you earned.",
  "Progress looks like showing up again.",
  "Consistency is the real win.",
  "You moved forward today.",
];

// DOM references
const quoteContainer = document.getElementById("quote-container");
const quoteTextEl   = document.getElementById("quote-text");
const quoteAuthorEl = document.getElementById("quote-author");
const quoteModeEl   = document.getElementById("quote-mode");

// Pick a random item from an array, avoiding the previous pick
let lastQuote = "";
function pickRandom(arr) {
  let q;
  do { q = arr[Math.floor(Math.random() * arr.length)]; } while (q === lastQuote && arr.length > 1);
  lastQuote = q;
  return q;
}

/**
 * Show a quote with a fade-out → swap text → fade-in transition.
 * @param {"focus"|"break"} mode – which pool to pick from
 */
function showQuote(mode) {
  const pool  = mode === "focus" ? focusQuotes : breakQuotes;
  const label = mode === "focus" ? "🎯 Focus Mode" : "🧘 Break Mode";
  const tag   = mode === "focus" ? "Focus Quote" : "Break Quote";

  // 1. Fade out
  quoteContainer.classList.add("fade-out");

  // 2. After fade-out completes (500ms), swap text and fade in
  setTimeout(() => {
    quoteTextEl.textContent  = `"${pickRandom(pool)}"`;
    quoteAuthorEl.textContent = `— ${tag}`;
    quoteModeEl.textContent   = label;
    quoteContainer.classList.remove("fade-out");
  }, 500);
}

// Show an initial focus quote on page load (no fade needed)
quoteTextEl.textContent  = `"${pickRandom(focusQuotes)}"`;
quoteAuthorEl.textContent = "— Focus Quote";
quoteModeEl.textContent   = "🎯 Focus Mode";

// ═══════════════════════════════════════════════════
//  7. SUBJECT-WISE STATS
// ═══════════════════════════════════════════════════

const subjectStatsList = document.getElementById("subject-stats-list");

function renderSubjectStats() {
  const sd = loadSubjectData();
  const subjects = Object.keys(sd);

  if (subjects.length === 0) {
    subjectStatsList.innerHTML = '<p class="subject-empty-msg">No subject data yet — select a subject and complete a focus session.</p>';
    return;
  }

  // Find the max seconds for proportional bars
  const maxSec = Math.max(...subjects.map((s) => sd[s].seconds));

  subjectStatsList.innerHTML = "";

  subjects.forEach((name) => {
    const { sessions, seconds } = sd[name];
    const mins = Math.floor(seconds / 60);
    const pct = maxSec > 0 ? (seconds / maxSec) * 100 : 0;

    const row = document.createElement("div");
    row.className = "subject-stat-row";

    row.innerHTML = `
      <span class="subject-stat-name">${name}</span>
      <div class="subject-stat-bar-wrap">
        <div class="subject-stat-bar" style="width: ${pct}%"></div>
      </div>
      <span class="subject-stat-time">${mins} min · ${sessions}s</span>
      <button class="subject-stat-delete" title="Remove subject" data-subject="${name}">✕</button>
    `;

    // Delete subject button
    row.querySelector(".subject-stat-delete").addEventListener("click", () => {
      // Remove from today's data
      const data = loadSubjectData();
      delete data[name];
      saveSubjectData(data);
      // Remove from subject list
      const list = loadSubjects().filter((s) => s !== name);
      saveSubjects(list);
      renderSubjectDropdown();
      renderSubjectStats();
    });

    subjectStatsList.appendChild(row);
  });
}

renderSubjectStats();
