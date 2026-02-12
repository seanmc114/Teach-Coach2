// ==============================
// TURBO COACH — FINAL STABLE BUILD
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
let focuses = [];
let startTime = null;
let currentPrompt = "";

// ---------------- TIMER ----------------

function elapsed() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// ---------------- VERB CHECK ----------------

function hasVerb(answer) {
  return /\b(es|soy|eres|somos|son|está|estoy|estuve|fui|era|eran|hay|había|iré|voy|vas|van|fue|tiene|tengo|tienes)\b/i
    .test(answer);
}

// ---------------- TASK SCAFFOLD ----------------

function scaffoldExample(task) {

  const t = task.toLowerCase();

  if (t.includes("town"))
    return "Mi pueblo es pequeño y tranquilo.";
  if (t.includes("house"))
    return "Mi casa es pequeña y está en el centro.";
  if (t.includes("subject"))
    return "Mi asignatura favorita es matemática porque es interesante.";
  if (t.includes("weekend"))
    return "El fin de semana fui al cine con mis amigos.";
  if (t.includes("family"))
    return "Mi madre es simpática y trabaja en un hospital.";
  if (t.includes("friend"))
    return "Mi amigo es alto y simpático.";

  return "Es una frase completa y clara.";
}

// ---------------- STRUCTURAL GATE ----------------
// ONLY blocks communication failure

function structuralGate(answer, task) {

  const wc = answer.trim().split(/\s+/).length;

  if (wc < 2) {
    return {
      score: 2,
      focus: "Fragment",
      feedback: "That’s not a sentence yet. Try something like: **" + scaffoldExample(task) + "**"
    };
  }

  if (!hasVerb(answer)) {
    return {
      score: 3,
      focus: "Missing verb",
      feedback: "Make it a full sentence. For example: **" + scaffoldExample(task) + "**"
    };
  }

  return null;
}

// ---------------- RENDER ROUND ----------------

function renderRound(result) {

  const progress = Math.round((round / CONFIG.ROUNDS) * 100);

  const out = document.getElementById("out");

  out.innerHTML = `
    <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

    <div style="height:12px;background:#ddd;border-radius:20px;margin:8px 0;">
      <div style="height:12px;background:#003366;width:${progress}%;border-radius:20px;"></div>
    </div>

    <div><strong>Score:</strong> ${result.score}/10</div>
    <div><strong>Focus:</strong> ${result.focus}</div>
    <div><strong>Coach:</strong> ${result.feedback}</div>

    <div class="teacherBar" style="margin-top:10px;">
      <button data-v="clear">👍 Clear</button>
      <button data-v="unclear">🔁 Could be clearer</button>
      <button data-v="bad">❌ Not helpful</button>
    </div>
  `;

  // Teacher logging
  out.querySelectorAll(".teacherBar button").forEach(btn => {
    btn.onclick = () => {
      console.log("TEACHER_FEEDBACK", {
        answer: document.getElementById("answer").value,
        result,
        rating: btn.dataset.v
      });
      btn.disabled = true;
    };
  });
}

// ---------------- SUMMARY ----------------

function renderSummary() {

  const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const time = elapsed();

  let verdict = "";
  let colour = "#444";

  if (avg <= 4) {
    verdict = "Foundations Phase";
    colour = "#8b0000";
  } else if (avg <= 6) {
    verdict = "Building Control";
    colour = "#b8860b";
  } else if (avg <= 8) {
    verdict = "Strong Performance";
    colour = "#1e90ff";
  } else {
    verdict = "Exam Level";
    colour = "#006400";
  }

  const out = document.getElementById("out");

  out.innerHTML += `
    <hr>
    <h3 style="color:${colour};">${verdict}</h3>

    <div style="font-size:1.2rem;margin:8px 0;">
      Average: ${avg}/10
    </div>

    <div>Time: ${time}s</div>
    <div>Round scores: ${scores.join(" → ")}</div>

    <button id="playAgain" style="margin-top:12px;">Play Again</button>
  `;

  document.getElementById("playAgain").onclick = () => {
    round = 0;
    scores = [];
    focuses = [];
    startTime = null;
    currentPrompt = PROMPTS[Math.floor(Math.random()*PROMPTS.length)];
    document.getElementById("taskBox").innerText = "Task: " + currentPrompt;
    document.getElementById("answer").value = "";
    document.getElementById("out").classList.add("hidden");
    document.getElementById("answer").focus();
  };
}

// ---------------- MAIN ----------------

document.addEventListener("DOMContentLoaded", () => {

  const runBtn = document.getElementById("runBtn");
  const ans = document.getElementById("answer");
  const out = document.getElementById("out");
  const taskBox = document.getElementById("taskBox");

  currentPrompt = PROMPTS[Math.floor(Math.random()*PROMPTS.length)];
  taskBox.innerText = "Task: " + currentPrompt;

  runBtn.onclick = async () => {

    if (!startTime) startTime = Date.now();

    const answer = ans.value.trim();
    if (!answer) return;

    out.classList.remove("hidden");
    out.innerHTML = "Thinking…";

    // STRUCTURAL GATE FIRST
    const gate = structuralGate(answer, currentPrompt);

    let result;

    if (gate) {
      result = gate;
    } else {
      const ai = await window.classifyAnswer({
        task: currentPrompt,
        answer: answer,
        lang: "es"
      });
      result = ai;
    }

    scores.push(result.score);
    focuses.push(result.focus);
    round++;

    renderRound(result);

    ans.value = "";
    ans.focus();

    if (round === CONFIG.ROUNDS) {
      renderSummary();
    }
  };

});
