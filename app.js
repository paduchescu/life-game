"use strict";

const STORAGE_KEY = "life-game-v1";
const POINTS = { 1: 10, 2: 25, 3: 50 };
const LABELS = { 1: "Small", 2: "Medium", 3: "Hard" };
const POINTS_PER_LEVEL = 100;

// Rank names for each level (the last one repeats after that).
const RANKS = ["Base Camp", "Trail Walker", "Hill Climber", "Ridge Runner", "Peak Seeker", "Summit Master"];

// Icons you can pick for a goal; each has its own color.
const ICONS = {
  "🗣️": { name: "Language", color: "#3f7ea6" },
  "🌬️": { name: "Career", color: "#5b7f4a" },
  "📚": { name: "Learning", color: "#8a5fa8" },
  "💼": { name: "Work", color: "#6f685d" },
  "🏃": { name: "Fitness", color: "#c8693c" },
  "🥾": { name: "Adventure", color: "#3b8b85" },
  "💰": { name: "Money", color: "#d9a441" },
  "🎯": { name: "Other", color: "#b0503f" },
};
const DEFAULT_ICON = "🎯";

// ---------- data ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function starterData() {
  return {
    goals: [
      {
        id: uid(),
        icon: "🗣️",
        title: "Improve my English (B2 to C1)",
        tasks: [
          { id: uid(), title: "Write a short English text about my last hike", difficulty: 1 },
          { id: uid(), title: "Learn 20 technical words about wind energy", difficulty: 2 },
          { id: uid(), title: "Record a 2-minute talk about why I want to change careers", difficulty: 3 },
        ],
      },
      {
        id: uid(),
        icon: "🌬️",
        title: "Become a wind turbine technician",
        tasks: [
          { id: uid(), title: "Find 3 training programs in my region", difficulty: 1 },
          { id: uid(), title: "Check the safety certificates employers ask for", difficulty: 2 },
          { id: uid(), title: "Apply to one program or trainee job", difficulty: 3 },
        ],
      },
    ],
  };
}

function isValid(data) {
  return (
    data && Array.isArray(data.goals) &&
    data.goals.every(g =>
      typeof g.id === "string" && typeof g.title === "string" && Array.isArray(g.tasks) &&
      g.tasks.every(t => typeof t.id === "string" && typeof t.title === "string" && t.difficulty in POINTS)
    )
  );
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (isValid(data)) return data;
    }
  } catch (e) {
    console.error("Could not read saved data", e);
  }
  return starterData();
}

let state = load();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- logic ----------

function totalPoints() {
  let sum = 0;
  for (const g of state.goals) {
    for (const t of g.tasks) if (t.done) sum += POINTS[t.difficulty];
  }
  return sum;
}

function iconOf(goal) {
  return goal.icon in ICONS ? goal.icon : DEFAULT_ICON;
}

// ---------- rendering ----------

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  }
  for (const c of [].concat(children)) {
    node.append(c);
  }
  return node;
}

function renderStats() {
  const pts = totalPoints();
  const level = Math.floor(pts / POINTS_PER_LEVEL) + 1;
  const into = pts % POINTS_PER_LEVEL;
  const rank = RANKS[Math.min(level - 1, RANKS.length - 1)];

  document.getElementById("stats").replaceChildren(
    el("div", { class: "level-badge" }, [el("div", {}, [el("small", {}, "LEVEL"), el("b", {}, String(level))])]),
    el("div", { class: "stats-body" }, [
      el("div", { class: "rank" }, rank),
      el("div", { class: "xp-bar" }, [el("div", { style: `width:${into}%` })]),
      el("div", { class: "xp-text" }, `${into} / ${POINTS_PER_LEVEL} pts to level ${level + 1} · ${pts} pts total`),
    ])
  );
}

function renderTask(goal, task) {
  const checkbox = el("input", {
    type: "checkbox",
    class: "check",
    checked: !!task.done,
    ariaLabel: "Done",
    onchange: () => toggleTask(goal.id, task.id),
  });

  const body = el("div", { class: "task-body" }, [el("div", { class: "task-title" }, task.title)]);
  if (task.done && task.reflection) {
    body.append(el("div", { class: "reflection" }, `“${task.reflection}”`));
  }

  const chip = el("span", { class: `chip d${task.difficulty}` }, `${LABELS[task.difficulty]} · ${POINTS[task.difficulty]}`);
  const remove = el("button", {
    class: "ghost",
    title: "Delete task",
    onclick: () => deleteTask(goal.id, task.id),
  }, "✕");

  return el("li", { class: "task" + (task.done ? " done" : ""), dataset: { task: task.id } }, [checkbox, body, chip, remove]);
}

function renderGoal(goal) {
  const icon = iconOf(goal);
  const done = goal.tasks.filter(t => t.done).length;
  const total = goal.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const head = el("div", { class: "goal-head" }, [
    el("div", { class: "goal-icon" }, icon),
    el("div", { class: "goal-title" }, [
      el("h2", {}, goal.title),
      el("div", { class: "progress-text" }, `${done} of ${total} tasks · ${pct}%`),
    ]),
    el("button", { class: "ghost", title: "Delete goal", onclick: () => deleteGoal(goal.id) }, "Delete"),
  ]);

  const trail = el("div", { class: "trail" }, [
    el("div", { class: "trail-line" }, [el("div", { style: `width:${pct}%` })]),
    el("span", { class: "trail-flag" }, "🚩"),
  ]);

  const list = el("ul", { class: "tasks" }, goal.tasks.map(t => renderTask(goal, t)));

  const titleInput = el("input", { type: "text", placeholder: "New task", required: true });
  const diffSelect = el("select", { ariaLabel: "Difficulty" }, [1, 2, 3].map(d =>
    el("option", { value: String(d), selected: d === 2 }, `${LABELS[d]} (${POINTS[d]})`)
  ));
  const form = el("form", {
    class: "task-form",
    onsubmit: e => {
      e.preventDefault();
      addTask(goal.id, titleInput.value.trim(), Number(diffSelect.value));
    },
  }, [titleInput, diffSelect, el("button", { type: "submit" }, "Add")]);

  const card = el("section", {
    class: "goal",
    style: `--c:${ICONS[icon].color}`,
    dataset: { goal: goal.id },
  }, [head, trail]);
  if (total > 0 && done === total) card.append(el("div", { class: "summit" }, "🏔️ Summit reached! Add a new task or a new goal."));
  card.append(list, form);
  return card;
}

function render() {
  renderStats();
  document.getElementById("goals").replaceChildren(...state.goals.map(renderGoal));
}

// ---------- celebration ----------

function celebrate(taskId, points) {
  const row = document.querySelector(`[data-task="${taskId}"]`);
  if (!row) return;
  const box = row.querySelector(".check").getBoundingClientRect();
  const burst = el("div", { class: "burst", style: `left:${box.left + box.width / 2}px;top:${box.top + box.height / 2}px` });
  burst.append(el("span", { class: "plus" }, `+${points}`));
  const bits = ["🍃", "✨", "🌿", "⭐", "🍂"];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const dist = 50 + Math.random() * 40;
    burst.append(el("span", {
      class: "bit",
      style: `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--r:${Math.random() * 360}deg`,
    }, bits[i % bits.length]));
  }
  document.body.append(burst);
  row.closest(".goal").classList.add("pop");
  setTimeout(() => burst.remove(), 1200);
}

// ---------- actions ----------

function findGoal(id) {
  return state.goals.find(g => g.id === id);
}

function addGoal(title, icon) {
  state.goals.push({ id: uid(), icon, title, tasks: [] });
  save();
  render();
}

function deleteGoal(id) {
  const goal = findGoal(id);
  if (!goal || !confirm(`Delete goal "${goal.title}" and all its tasks?`)) return;
  state.goals = state.goals.filter(g => g.id !== id);
  save();
  render();
}

function addTask(goalId, title, difficulty) {
  if (!title) return;
  findGoal(goalId).tasks.push({ id: uid(), title, difficulty });
  save();
  render();
}

function deleteTask(goalId, taskId) {
  const goal = findGoal(goalId);
  goal.tasks = goal.tasks.filter(t => t.id !== taskId);
  save();
  render();
}

function toggleTask(goalId, taskId) {
  const task = findGoal(goalId).tasks.find(t => t.id === taskId);
  if (task.done) {
    task.done = false;
    delete task.doneAt;
    delete task.reflection;
    save();
    render();
    return;
  }
  task.done = true;
  task.doneAt = new Date().toISOString();
  // One line about what you learned turns a checkbox into thinking.
  const note = prompt("Done! One sentence: what did you learn or notice? (optional, English practice)");
  if (note && note.trim()) task.reflection = note.trim();
  save();
  render();
  celebrate(taskId, POINTS[task.difficulty]);
}

// ---------- backup ----------

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "life-game-backup.json" });
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!isValid(data)) throw new Error("Wrong file format");
    if (!confirm("Replace all current data with this file?")) return;
    state = data;
    save();
    render();
  } catch (e) {
    alert("Could not import: " + e.message);
  }
}

// ---------- wiring ----------

const iconSelect = document.getElementById("goal-icon");
iconSelect.append(...Object.entries(ICONS).map(([icon, info]) =>
  el("option", { value: icon, selected: icon === DEFAULT_ICON }, `${icon} ${info.name}`)
));

document.getElementById("goal-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("goal-title");
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  addGoal(title, iconSelect.value);
});

document.getElementById("export").addEventListener("click", exportData);
document.getElementById("import").addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) importData(file);
  e.target.value = "";
});

render();

// ---------- app install / offline ----------

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(e => console.warn("Offline mode unavailable:", e.message));
}
