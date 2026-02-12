// ==============================
// TURBO COACH — FINAL CLEAN FLOW
// ==============================

const CONFIG = { ROUNDS: 3 };

const PROMPTS = [
  "Describe your best friend",
  "Describe someone in your family",
  "Describe your house",
  "Describe your town",
  "Describe your favourite subject",
  "Describe your weekend"
];

let round = 0;
let scores = [];
let startTime = null;
let currentPrompt = "";

// ---------------- TIMER ----------------

function elapsed() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// ---------------- VERB CHECK ----------------

function hasVerb(answer) {
  return /\b(es|soy|eres|somos|son|está|estoy|fui|era|eran|hay|había|voy|vas|van|iré|fue|tiene|tengo|tienes)\b/i
    .test(answer);
}

// ---------------- SCAFFOLD ----------------

function scaffold(task) {
  const t = task.toLowerCase();
  if (t.includes("town")) return "Mi pueblo es pequeño y tranquilo.";
  if (t.includes("house")) return "Mi casa es pequeña y está en el centro.";
  if (t.includes("subject")) return "Mi asignatura favorita es interesante.";
  if (t.includes("weekend")) return "El fin de semana fui al cine con mis amigos.";
  if (t.includes("family")) return "Mi madre es simpática.";
  return "Mi amigo es simpático.";
}

// ---------------- STRUCTURE GATE ----------------

function structuralGate(answer, task) {
  const wc = answer.trim().split(/\s+/).length;

  if (wc < 2) {
    return {
      score: 2,
      focus: "Fragment",
      feedback: "Make it a full sentence. Example: " + scaffold(task)
    };
  }

  if (!hasVerb(answer)) {
    return {
      score: 3,
      focus: "Missing verb",
      feedback: "Add a verb. Example: " + scaffold(task)
    };
  }

  return null;
}

// ---------------- START GAME ----------------

document.addEventListener("DOMContentLoaded", () => {

  const runBtn = document.getElementById("runBtn");
  const ans = document.getElementById("answer");
  const out = document.getElementById("out");
  const taskBox = document.getElementById("taskBox");

  function newPrompt() {
    currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    taskBox.innerText = "Task: " + currentPrompt;
  }

  newPrompt();

  runBtn.onclick = async () => {

    if (!startTime) startTime = Date.now();

    const answer = ans.value.trim();
    if (!answer) return;

    out.classList.remove("hidden");
    out.innerHTML = "Thinking…";

    let result;

    const gate = structuralGate(answer, currentPrompt);

    if (gate) {
      result = gate;
    } else {
      result = await window.classifyAnswer({
        task: currentPrompt,
        answer,
        lang: "es"
      });
    }

    scores.push(result.score);
    round++;

    renderFeedback(result);
  };

  function renderFeedback(result) {

    const progress = Math.round((round / CONFIG.ROUNDS) * 100);

    out.innerHTML = `
      <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

      <div style="height:10px;background:#ddd;border-radius:20px;margin:6px 0;">
        <div style="height:10px;background:#003366;width:${progress}%;border-radius:20px;"></div>
      </div>

      <div><strong>Score:</strong> ${result.score}/10</div>
      <div><strong>Focus:</strong> ${result.focus}</div>
      <div><strong>Coach:</strong> ${result.feedback}</div>

      <div style="margin-top:10px;">
        <button id="nextBtn">Next</button>
      </div>

      <div class="teacherBar" style="margin-top:8px;">
        <button data-v="clear">👍 Clear</button>
        <button data-v="unclear">🔁 Could be clearer</button>
        <button data-v="bad">❌ Not helpful</button>
      </div>
    `;

    // Teacher buttons
    out.querySelectorAll(".teacherBar button").forEach(btn => {
      btn.onclick = () => {
        console.log("TEACHER_FEEDBACK", { result, rating: btn.dataset.v });
        btn.disabled = true;
      };
    });

    document.getElementById("nextBtn").onclick = () => {
      if (round < CONFIG.ROUNDS) {
        ans.value = "";
        ans.focus();
        newPrompt();
        out.classList.add("hidden");
      } else {
        renderSummary();
      }
    };
  }

  function renderSummary() {

    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const time = elapsed();

    let verdict = "";
    let colour = "#444";

    if (avg <= 4) { verdict = "Foundations Phase"; colour = "#8b0000"; }
    else if (avg <= 6) { verdict = "Building Control"; colour = "#b8860b"; }
    else if (avg <= 8) { verdict = "Strong Performance"; colour = "#1e90ff"; }
    else { verdict = "Exam Level"; colour = "#006400"; }

    out.innerHTML = `
      <hr>
      <h3 style="color:${colour};">${verdict}</h3>
      <div style="font-size:1.2rem;margin:8px 0;">
        Average: ${avg}/10
      </div>
      <div>Time: ${time}s</div>
      <div>Scores: ${scores.join(" → ")}</div>
      <button id="playAgain">Play Again</button>
    `;

    document.getElementById("playAgain").onclick = () => {
      round = 0;
      scores = [];
      startTime = null;
      ans.value = "";
      ans.focus();
      newPrompt();
      out.classList.add("hidden");
    };
  }

});
