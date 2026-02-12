// ==============================
// TURBO COACH — FULL STABLE BUILD
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

// ---------------- INIT ----------------

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

    try {
      result = await window.classifyAnswer({
        task: currentPrompt,
        answer,
        lang
      });
    } catch (e) {
      result = {
        score: 3,
        feedback: "Something went wrong — try again."
      };
    }

    scores.push(result.score);
    round++;

    renderFeedback(result);
  };

  // ---------------- FEEDBACK ----------------

  function renderFeedback(result) {

    let tone;

    if (result.score <= 3)
      tone = "We build from here.";
    else if (result.score <= 5)
      tone = "You're communicating — now tighten it.";
    else if (result.score <= 7)
      tone = "Solid work. Let’s sharpen it.";
    else if (result.score <= 9)
      tone = "Strong answer. Very close to top band.";
    else
      tone = "Outstanding. That’s exam control.";

    out.innerHTML = `
      <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

      <div style="font-size:1.8rem;margin:8px 0;">
        ${result.score}/10
      </div>

      <div style="font-size:1.1rem;margin-bottom:8px;">
        ${tone}
      </div>

      <div style="margin-bottom:14px;">
        ${result.feedback}
      </div>

      <button id="nextBtn">Next</button>

      <div class="teacherBar" style="margin-top:12px;">
        <button data-v="clear">👍 Clear</button>
        <button data-v="unclear">🔁 Could be clearer</button>
        <button data-v="bad">❌ Not helpful</button>
      </div>
    `;

    // Teacher feedback logging
    document.querySelectorAll(".teacherBar button").forEach(btn => {
      btn.onclick = () => {
        console.log("TEACHER_FEEDBACK", {
          score: result.score,
          feedback: result.feedback,
          rating: btn.dataset.v
        });
        btn.disabled = true;
        btn.innerText = "✓";
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

  // ---------------- SUMMARY ----------------

  function renderSummary() {

    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const time = elapsed();

    let title, message, emoji, colour;

    if (avg <= 4) {
      emoji = "🟥";
      title = "Foundations Mode";
      message = "Structure first. Clear verbs. Clear sentences.";
      colour = "#8b0000";
    }
    else if (avg <= 6) {
      emoji = "🟨";
      title = "Momentum Building";
      message = "You’re communicating. Now refine accuracy.";
      colour = "#b8860b";
    }
    else if (avg <= 8) {
      emoji = "🟦";
      title = "Strong Performance";
      message = "Exam-level writing. Polish the edges.";
      colour = "#1e90ff";
    }
    else {
      emoji = "🟩";
      title = "Turbo Level";
      message = "That’s serious control. Beat your time next round.";
      colour = "#006400";
    }

    out.innerHTML = `
      <hr>
      <h2 style="color:${colour};">
        ${emoji} ${title}
      </h2>

      <div style="font-size:1.6rem;margin:10px 0;">
        ${avg}/10 Average
      </div>

      <div>Time: ${time}s</div>

      <div style="margin-top:8px;">
        Scores: ${scores.join(" → ")}
      </div>

      <p style="margin-top:14px;font-size:1.05rem;">
        ${message}
      </p>

      <button id="playAgain" style="margin-top:10px;">
        Play Again
      </button>
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
