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
  return /\b(es|soy|eres|somos|son|está|estoy|fui|era|eran|hay|había|voy|vas|van|iré|tiene|tengo|tienes)\b/i
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
      focus: "Start stronger",
      feedback: "Give me a full sentence. Try: " + scaffold(task)
    };
  }

  if (!hasVerb(answer)) {
    return {
      score: 3,
      focus: "Verb missing",
      feedback: "You need a verb to make this work. Example: " + scaffold(task)
    };
  }

  if (wc < 5) {
    return {
      score: 4,
      focus: "Too short",
      feedback: "You're communicating — now expand it with one clear detail."
    };
  }

  return null;
}

// ---------------- GAME ----------------

document.addEventListener("DOMContentLoaded", () => {

  const runBtn = document.getElementById("runBtn");
  const ans = document.getElementById("answer");
  const out = document.getElementById("out");
  const taskEl = document.getElementById("task");

  function newPrompt() {
    currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    taskEl.innerText = currentPrompt;
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
        lang: document.getElementById("lang").value
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

      <div style="font-size:1.2rem;"><strong>${result.score}/10</strong></div>

      <div style="margin-top:6px;font-size:1.05rem;">
        ${
          result.score <= 4 ? "We build from here." :
          result.score <= 6 ? "You're communicating. Now sharpen it." :
          result.score <= 8 ? "Strong answer. Push it higher." :
          "That’s excellent control."
        }
      </div>

      <div style="margin-top:6px;">${result.feedback}</div>

      <div style="margin-top:12px;">
        <button id="nextBtn">Next</button>
      </div>

      <div class="teacherBar">
        <button data-v="clear">👍 Clear</button>
        <button data-v="unclear">🔁 Could be clearer</button>
        <button data-v="bad">❌ Not helpful</button>
      </div>
    `;

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

    let title = "";
    let message = "";
    let colour = "#003366";

    if (avg <= 4) {
      title = "Foundations Mode";
      message = "You're building structure. Focus on verbs and full sentences.";
      colour = "#8b0000";
    }
    else if (avg <= 6) {
      title = "Solid Communicator";
      message = "Add sharper detail and precision.";
      colour = "#b8860b";
    }
    else if (avg <= 8) {
      title = "Strong Performance";
      message = "Exam-level writing. Polish accuracy.";
      colour = "#1e90ff";
    }
    else {
      title = "Turbo Level";
      message = "Excellent control. Compete on time now.";
      colour = "#006400";
    }

    out.innerHTML = `
      <hr>
      <h2 style="color:${colour};">${title}</h2>
      <div style="font-size:1.3rem;margin:10px 0;">
        Average: ${avg}/10
      </div>
      <div>Time: ${time}s</div>
      <div style="margin-top:8px;">Scores: ${scores.join(" → ")}</div>
      <p style="margin-top:12px;">${message}</p>
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
