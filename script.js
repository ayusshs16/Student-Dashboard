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

// Load saved theme preference (default: light)
function loadTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeToggle.textContent = saved === "dark" ? "☀️" : "🌙";
}

// Toggle between light and dark
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
});

loadTheme();

// ═══════════════════════════════════════════════════
//  2. FOCUS TIMER (Pomodoro) — with custom durations
// ═══════════════════════════════════════════════════

// Default durations (minutes) — can be changed by presets / custom input
let focusMinutes = 25;
let breakMinutes = 5;

// Timer state
let timerSeconds = focusMinutes * 60;
let timerInterval = null;
let isRunning = false;
let isBreak = false;

// DOM references — timer
const display = document.getElementById("timer-display");
const timerLabel = document.getElementById("timer-label");
const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");
const sessionCountEl = document.getElementById("session-count");

// DOM references — presets & custom input
const presetBtns = document.querySelectorAll(".preset-btn:not(#btn-custom-preset)");
const btnCustomPreset = document.getElementById("btn-custom-preset");
const customTimeRow = document.getElementById("custom-time-row");
const customFocusInput = document.getElementById("custom-focus");
const customBreakInput = document.getElementById("custom-break");
const btnApplyCustom = document.getElementById("btn-apply-custom");

// ── Preset buttons ──
presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return; // don't change while running
    // Update active class
    document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    customTimeRow.classList.add("hidden");

    // Read data attributes
    focusMinutes = parseInt(btn.dataset.focus, 10);
    breakMinutes = parseInt(btn.dataset.break, 10);
    resetTimerDisplay();
  });
});

// ── Custom preset toggle ──
btnCustomPreset.addEventListener("click", () => {
  if (isRunning) return;
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
  btnCustomPreset.classList.add("active");
  customTimeRow.classList.toggle("hidden");
});

// ── Apply custom time ──
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

// Helper: reset display to current focusMinutes
function resetTimerDisplay() {
  isBreak = false;
  timerSeconds = focusMinutes * 60;
  renderTimer();
}

// ── Load today's session data from localStorage ──
function loadDailyData() {
  const raw = localStorage.getItem("daily_" + todayKey());
  if (raw) return JSON.parse(raw);
  return { sessions: 0, focusSeconds: 0 };
}

function saveDailyData(data) {
  localStorage.setItem("daily_" + todayKey(), JSON.stringify(data));
}

// ── Format seconds → MM:SS ──
function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Render timer display ──
function renderTimer() {
  display.textContent = formatTime(timerSeconds);
  timerLabel.textContent = isBreak ? "Break Time 🧘" : "Focus Time 🎯";
  const daily = loadDailyData();
  sessionCountEl.innerHTML = `Sessions today: <strong>${daily.sessions}</strong>`;
}

// ── Tick: called every second ──
function tick() {
  if (timerSeconds <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    if (!isBreak) {
      // Focus period finished → record session
      const daily = loadDailyData();
      daily.sessions += 1;
      daily.focusSeconds += focusMinutes * 60;
      saveDailyData(daily);

      // Switch to break
      isBreak = true;
      timerSeconds = breakMinutes * 60;
      renderTimer();
      renderStats();
      alert("🎉 Focus session complete! Take a break.");
      return;
    } else {
      // Break finished → back to focus
      isBreak = false;
      timerSeconds = focusMinutes * 60;
      renderTimer();
      alert("⏰ Break over! Ready for another session?");
      return;
    }
  }

  timerSeconds--;
  renderTimer();
}

// ── Start button ──
btnStart.addEventListener("click", () => {
  if (isRunning) return;
  isRunning = true;
  timerInterval = setInterval(tick, 1000);
});

// ── Pause button ──
btnPause.addEventListener("click", () => {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
});

// ── Reset button ──
btnReset.addEventListener("click", () => {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  resetTimerDisplay();
});

// Initial render
renderTimer();

// ═══════════════════════════════════════════════════
//  3. TASK MANAGER (with localStorage)
// ═══════════════════════════════════════════════════

const taskInput = document.getElementById("task-input");
const btnAddTask = document.getElementById("btn-add-task");
const taskList = document.getElementById("task-list");

function loadTasks() {
  const raw = localStorage.getItem("tasks");
  if (raw) return JSON.parse(raw);
  return [];
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
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

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
//  4. DAILY DASHBOARD STATS
// ═══════════════════════════════════════════════════

const statFocusTime = document.getElementById("stat-focus-time");
const statSessions = document.getElementById("stat-sessions");
const statCompleted = document.getElementById("stat-completed");
const statPending = document.getElementById("stat-pending");

function renderStats() {
  const daily = loadDailyData();
  const totalMin = Math.floor(daily.focusSeconds / 60);
  statFocusTime.textContent = totalMin + " min";
  statSessions.textContent = daily.sessions;

  const tasks = loadTasks();
  const today = todayKey();
  const completedToday = tasks.filter(
    (t) => t.done && t.completedAt === today
  ).length;
  const pending = tasks.filter((t) => !t.done).length;

  statCompleted.textContent = completedToday;
  statPending.textContent = pending;
}

renderStats();

// ═══════════════════════════════════════════════════
//  5. MOTIVATIONAL QUOTES
// ═══════════════════════════════════════════════════

const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Dream bigger. Do bigger.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Study hard, for the well is deep, and our brains are shallow.", author: "Richard Baxter" },
];

const quoteTextEl = document.getElementById("quote-text");
const quoteAuthorEl = document.getElementById("quote-author");
const btnNewQuote = document.getElementById("btn-new-quote");

function showRandomQuote() {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  quoteTextEl.textContent = `"${q.text}"`;
  quoteAuthorEl.textContent = `— ${q.author}`;
}

btnNewQuote.addEventListener("click", showRandomQuote);

// Show a random quote on load
showRandomQuote();

// ═══════════════════════════════════════════════════
//  6. BREATHING EXERCISE
// ═══════════════════════════════════════════════════

const breatheCircle = document.getElementById("breathe-circle");
const breatheText = document.getElementById("breathe-text");
const btnBreathe = document.getElementById("btn-breathe");

let breatheTimer = null;      // interval id
let breatheRunning = false;

// Cycle: inhale 4s → hold 4s → exhale 4s (total 12s per cycle)
function startBreathingCycle() {
  let phase = 0; // 0 = inhale, 1 = hold, 2 = exhale

  function setPhase() {
    if (phase === 0) {
      breatheCircle.className = "breathe-circle inhale";
      breatheText.textContent = "Breathe In";
    } else if (phase === 1) {
      breatheText.textContent = "Hold";
    } else {
      breatheCircle.className = "breathe-circle exhale";
      breatheText.textContent = "Breathe Out";
    }
    phase = (phase + 1) % 3;
  }

  setPhase(); // start immediately
  breatheTimer = setInterval(setPhase, 4000);
}

btnBreathe.addEventListener("click", () => {
  if (breatheRunning) {
    // Stop
    clearInterval(breatheTimer);
    breatheTimer = null;
    breatheRunning = false;
    breatheCircle.className = "breathe-circle";
    breatheText.textContent = "Start";
    btnBreathe.textContent = "Start Breathing";
  } else {
    // Start
    breatheRunning = true;
    btnBreathe.textContent = "Stop";
    startBreathingCycle();
  }
});

// ═══════════════════════════════════════════════════
//  7. MEMORY FOCUS GAME
// ═══════════════════════════════════════════════════

const memoryBoard = document.getElementById("memory-board");
const gameMovesEl = document.getElementById("game-moves");
const gamePairsEl = document.getElementById("game-pairs");
const btnGameRestart = document.getElementById("btn-game-restart");

// Emoji pairs for the game (6 pairs = 12 cards)
const emojiPool = ["📖", "✏️", "🎓", "🧪", "🔬", "🌍", "🎨", "🎵", "💻", "🧮"];

let gameCards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalMoves = 0;
let gameLocked = false; // prevent clicking during animation

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Initialize / restart game
function initGame() {
  // Pick 6 random emojis, duplicate them for pairs
  const picked = shuffle([...emojiPool]).slice(0, 6);
  gameCards = shuffle([...picked, ...picked]);

  flippedCards = [];
  matchedPairs = 0;
  totalMoves = 0;
  gameLocked = false;
  gameMovesEl.textContent = "0";
  gamePairsEl.textContent = "0";

  memoryBoard.innerHTML = "";

  gameCards.forEach((emoji, index) => {
    const card = document.createElement("div");
    card.className = "mem-card";
    card.dataset.index = index;
    card.dataset.emoji = emoji;

    // Front face (hidden content — shows "?")
    const front = document.createElement("div");
    front.className = "mem-front";
    front.textContent = "?";

    // Back face (emoji)
    const back = document.createElement("div");
    back.className = "mem-back";
    back.textContent = emoji;

    card.appendChild(front);
    card.appendChild(back);

    card.addEventListener("click", () => flipCard(card));
    memoryBoard.appendChild(card);
  });
}

function flipCard(card) {
  // Ignore invalid clicks
  if (gameLocked) return;
  if (card.classList.contains("flipped")) return;
  if (card.classList.contains("matched")) return;

  card.classList.add("flipped");
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    totalMoves++;
    gameMovesEl.textContent = totalMoves;
    gameLocked = true;

    const [c1, c2] = flippedCards;

    if (c1.dataset.emoji === c2.dataset.emoji) {
      // Match found
      c1.classList.add("matched");
      c2.classList.add("matched");
      matchedPairs++;
      gamePairsEl.textContent = matchedPairs;
      flippedCards = [];
      gameLocked = false;

      if (matchedPairs === 6) {
        setTimeout(() => {
          alert(`🎉 You matched all pairs in ${totalMoves} moves!`);
        }, 300);
      }
    } else {
      // No match — flip back after a short delay
      setTimeout(() => {
        c1.classList.remove("flipped");
        c2.classList.remove("flipped");
        flippedCards = [];
        gameLocked = false;
      }, 800);
    }
  }
}

btnGameRestart.addEventListener("click", initGame);

// Start the game on page load
initGame();
