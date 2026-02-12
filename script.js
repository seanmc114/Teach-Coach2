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

// ---------------- IMPROVED VERB DETECTION ----------------

function hasVerb(answer, lang) {

  const lower = answer.toLowerCase();

  if (lang === "es") {
    return /\b(soy|eres|es|somos|son|estoy|está|están|era|eran|fui|fue|hay|había|voy|vas|van|iré|tengo|tiene|tienen|juego|juegas|juega|jugamos|como|comes|come|salgo|sales|sale|hago|haces|hace|veo|ves|vive|vivo|vives)\b/.test(lower);
  }

  if (lang === "fr") {
    return /\b(suis|es|est|sommes|sont|ai|as|a|vais|va|mange|manges|joue|joues|habite|habites)\b/.test(lower);
  }

  if (lang === "de") {
    return /\b(bin|bist|ist|sind|habe|hast|hat|gehe|geht|spiele|spielst|mache|macht|wohne|wohnst)\b/.test(lower);
  }

  if (lang === "ga") {
    return /\b(tá|bhí|bheidh|táim|táimid)\b/.test(lower);
  }

  return false;
}

// ---------------- SCAFFOLD ----------------

function scaffold(task) {
  const t = task.toLowerCase();
  if (t.includes("town")) return "Mi pueblo es pequeño y tranquilo.";
  if (t.includes("house")) return "Mi casa es pequeña y está en el centro.";
  if (t.includes("subject")) return "Mi asignatura favorita es interesante.";
  if (t.includes("weekend")) return "El fin de semana juego al fútbol con mis amigos.";
  if (t.includes("family")) return "Mi madre es simpática.";
  return "Mi amigo es simpático.";
}

// ---------------- STRUCTURE GATE ----------------

function structuralGate(answer, task, lang) {

  const wc = answer.trim().split(/\s+/).length;

  if (wc < 2) {
    return {
      score: 2,
      feedback: "Start with a full sentence. Example: " + scaffold(task)
    };
  }

  if (!hasVerb(answer, lang)) {
    return {
      score: 3,
      feedback: "You need a clear verb. Example: " + scaffold(task)
    };
  }

  if (wc < 5) {
    return {
      score: 4,
      feedback: "You're communicating. Now add ONE more specific detail."
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
  const langEl = document.getElementById("lang");

  function newPrompt() {
    currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    taskEl.innerText = currentPrompt;
  }

  newPrompt();

  runBtn.onclick = async () => {

    if (!startTime) startTime = Date.now();

    const answer = ans.value.trim();
    if (!answer) return;

    const lang = langEl.value;

    out.classList.remove("hidden");
    out.innerHTML = "Thinking…";

    let result;
    const gate = structuralGate(answer, currentPrompt, lang);

    if (gate) {
      result = gate;
    } else {
      result = await window.classifyAnswer({
        task: currentPrompt,
        answer,
        lang
      });
    }

    scores.push(result.score);
    round++;

    renderFeedback(result);
  };

  function renderFeedback(result) {

    out.innerHTML = `
      <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>
      <div style="font-size:1.3rem;margin:6px 0;"><strong>${result.score}/10</strong></div>

      <div style="margin-top:6px;font-size:1.1rem;">
        ${
          result.score <= 4 ? "We build from here." :
          result.score <= 6 ? "You're getting there." :
          result.score <= 8 ? "Strong answer." :
          "Excellent work."
        }
      </div>

      <div style="margin-top:6px;">
        ${result.feedback}
      </div>

      <div style="margin-top:12px;">
        <button id="nextBtn">Next</button>
      </div>

      <div class="teacherBar" style="margin-top:8px;">
        <button data-v="clear">👍 Clear</button>
        <button data-v="unclear">🔁 Could be clearer</button>
        <button data-v="bad">❌ Not helpful</button>
      </div>
    `;

    // FIXED teacher buttons
    document.querySelectorAll(".teacherBar button").forEach(btn => {
      btn.addEventListener("click", () => {
        console.log("TEACHER_FEEDBACK", {
          score: result.score,
          feedback: result.feedback,
          rating: btn.dataset.v
        });
        btn.disabled = true;
        btn.innerText = "✓";
      });
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
      message = "Focus on verbs and full sentences next round.";
      colour = "#8b0000";
    }
    else if (avg <= 6) {
      title = "Building Momentum";
      message = "Add precision and sharper detail.";
      colour = "#b8860b";
    }
    else if (avg <= 8) {
      title = "Strong Performance";
      message = "Exam-ready writing. Polish small errors.";
      colour = "#1e90ff";
    }
    else {
      title = "Turbo Level";
      message = "Outstanding control. Now beat your time.";
      colour = "#006400";
    }

    out.innerHTML = `
      <hr>
      <h2 style="color:${colour};">${title}</h2>
      <div style="font-size:1.4rem;margin:8px 0;">Average: ${avg}/10</div>
      <div>Time: ${time}s</div>
      <div>Scores: ${scores.join(" → ")}</div>
      <p style="margin-top:10px;">${message}</p>
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
