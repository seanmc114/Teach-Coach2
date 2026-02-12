// ==============================
// TURBO COACH — STABLE HYBRID
// JC aligned — Growth Model B
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
  return /\b(es|soy|eres|somos|está|estoy|estuve|fui|era|hay|había|iré|voy|vas|van|fue|eran|tiene|tengo|tienes)\b/i
    .test(answer);
}

// ---------------- STRUCTURAL GATE ----------------
// ONLY blocks communication failures

function structuralGate(answer) {

  const wc = answer.trim().split(/\s+/).length;

  if (wc < 2) {
    return {
      cap: 3,
      focus: "Fragment",
      feedback:
        "That’s not a sentence yet. Make it a full idea. For example: **Mi pueblo es pequeño.**"
    };
  }

  if (!hasVerb(answer)) {
    return {
      cap: 3,
      focus: "Missing verb",
      feedback:
        "Make it a sentence. Add a verb: **es**, **hay**, **fui**, **voy**."
    };
  }

  return null;
}

// ---------------- RENDER ROUND ----------------

function renderRound(result) {

  const progress = Math.round((round / CONFIG.ROUNDS) * 100);

  document.getElementById("out").innerHTML = `
    <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

    <div style="height:12px;background:#ddd;border-radius:20px;margin:8px 0;">
      <div style="height:12px;background:#003366;width:${progress}%;border-radius:20px;"></div>
    </div>

    <div><strong>Score:</strong> ${result.score}/10</div>
    <div><strong>Focus:</strong> ${result.focus}</div>
    <div><strong>Coach:</strong> ${result.feedback}</div>
  `;
}

// ---------------- SUMMARY ----------------

function renderSummary() {

  const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const time = elapsed();

  let verdict = "";

  if (avg <= 4) verdict = "Foundations Phase";
  else if (avg <= 6) verdict = "Building Control";
  else if (avg <= 8) verdict = "Strong Performance";
  else verdict = "Exam Level";

  document.getElementById("out").innerHTML += `
    <hr>
    <h3>${verdict}</h3>

    <div style="font-size:1.2rem;margin:8px 0;">
      Average: ${avg}/10
    </div>

    <div>Time: ${time}s</div>
    <div>Round scores: ${scores.join(" → ")}</div>
  `;
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
    const gate = structuralGate(answer);

    let result;

    if (gate) {
      result = {
        score: gate.cap,
        focus: gate.focus,
        feedback: gate.feedback
      };
    } else {

      // AI layer handles nuance
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
