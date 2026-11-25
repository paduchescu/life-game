"use strict";

const STORAGE_KEY = "life-game-v1";
const POINTS = { 1: 10, 2: 25, 3: 50 };
const LABELS = { 1: "Small", 2: "Medium", 3: "Hard" };
const POINTS_PER_LEVEL = 100;

// ---------- data ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function starterData() {
  return {
    goals: [
      {
        id: uid(),
        title: "Improve my English (B2 to C1)",
        tasks: [
          { id: uid(), title: "Write a short English text about my last hike", difficulty: 1 },
          { id: uid(), title: "Learn 20 technical words about wind energy", difficulty: 2 },
          { id: uid(), title: "Record a 2-minute talk about why I want to change careers", difficulty: 3 },
        ],
      },
      {
        id: uid(),
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

// ---------- rendering ----------

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
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
  const toNext = POINTS_PER_LEVEL - (pts % POINTS_PER_LEVEL);
  const stats = document.getElementById("stats");
  stats.replaceChildren(
    el("strong", {}, `Level ${level}`),
    ` · ${pts} pts · ${toNext} to next level`
  );
}

function renderTask(goal, task) {
  const checkbox = el("input", {
    type: "checkbox",
    checked: !!task.done,
    onchange: () => toggleTask(goal.id, task.id),
  });

  const body = el("div", { class: "task-body" }, [
    el("div", { class: "task-title" }, task.title),
  ]);
  if (task.done && task.reflection) {
    body.append(el("div", { class: "reflection" }, task.reflection));
  }

  const pts = el("span", { class: "pts" }, `${LABELS[task.difficulty]} · ${POINTS[task.difficulty]}`);
  const remove = el("button", {
    class: "ghost",
    title: "Delete task",
    onclick: () => deleteTask(goal.id, task.id),
  }, "✕");

  return el("li", { class: "task" + (task.done ? " done" : "") }, [checkbox, body, pts, remove]);
}

function renderGoal(goal) {
  const done = goal.tasks.filter(t => t.done).length;
  const total = goal.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const head = el("div", { class: "goal-head" }, [
    el("h2", {}, goal.title),
    el("button", { class: "ghost", onclick: () => deleteGoal(goal.id) }, "Delete"),
  ]);

  const bar = el("div", { class: "bar" }, [el("div", { style: `width:${pct}%` })]);

  const list = el("ul", { class: "tasks" }, goal.tasks.map(t => renderTask(goal, t)));

  const titleInput = el("input", { type: "text", placeholder: "New task", required: true });
  const diffSelect = el("select", {}, [1, 2, 3].map(d =>
    el("option", { value: String(d), selected: d === 2 }, `${LABELS[d]} (${POINTS[d]})`)
  ));
  const form = el("form", {
    class: "task-form",
    onsubmit: e => {
      e.preventDefault();
      addTask(goal.id, titleInput.value.trim(), Number(diffSelect.value));
    },
  }, [titleInput, diffSelect, el("button", { type: "submit" }, "Add")]);

  return el("section", { class: "goal" }, [
    head,
    el("div", { class: "progress-text" }, `${done} of ${total} tasks done · ${pct}%`),
    bar,
    list,
    form,
  ]);
}

function render() {
  renderStats();
  document.getElementById("goals").replaceChildren(...state.goals.map(renderGoal));
}

// ---------- actions ----------

function findGoal(id) {
  return state.goals.find(g => g.id === id);
}

function addGoal(title) {
  state.goals.push({ id: uid(), title, tasks: [] });
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
  } else {
    task.done = true;
    task.doneAt = new Date().toISOString();
    // One line about what you learned turns a checkbox into thinking.
    const note = prompt("Done! One sentence: what did you learn or notice? (optional, English practice)");
    if (note && note.trim()) task.reflection = note.trim();
  }
  save();
  render();
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

document.getElementById("goal-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("goal-title");
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  addGoal(title);
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
