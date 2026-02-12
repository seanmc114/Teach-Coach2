// ==============================
// TURBO COACH — GAME BUILD v2
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

  // ---------------- ROUND FEEDBACK ----------------

  function renderFeedback(result) {

    const progressWidth = (round / CONFIG.ROUNDS) * 100;

    let tone;

    if (result.score <= 3)
      tone = "We build from here.";
    else if (result.score <= 5)
      tone = "You're communicating. Now tighten it.";
    else if (result.score <= 7)
      tone = "Solid work. Sharpen one thing.";
    else if (result.score <= 9)
      tone = "Strong answer. Nearly top band.";
    else
      tone = "Outstanding control.";

    out.innerHTML = `
      <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

      <div style="height:10px;background:#ddd;border-radius:20px;margin:6px 0;">
        <div style="height:10px;background:#003366;width:${progressWidth}%;border-radius:20px;"></div>
      </div>

      <div style="font-size:2rem;margin:10px 0;font-weight:bold;">
        ${result.score}/10
      </div>

      <div style="font-size:1.05rem;margin-bottom:10px;">
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

    // Teacher logging
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

  // ---------------- FINAL SUMMARY ----------------

  function renderSummary() {

    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const time = elapsed();

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const improving = scores[2] > scores[0];

    let emoji, title, message, colour;

    if (avg <= 4) {
      emoji = "🟥";
      colour = "#8b0000";
      title = "Foundations Mode";
      message = improving
        ? "You improved this round. Lock in verbs next."
        : "Structure blocked you. Fix verbs first.";
    }
    else if (avg <= 6) {
      emoji = "🟨";
      colour = "#b8860b";
      title = "Building Momentum";
      message = max >= 7
        ? "You reached strong moments. Make it consistent."
        : "Add sharper detail and precision.";
    }
    else if (avg <= 8) {
      emoji = "🟦";
      colour = "#1e90ff";
      title = "Strong Performance";
      message = "Small accuracy upgrades push you higher.";
    }
    else {
      emoji = "🟩";
      colour = "#006400";
      title = "Turbo Level";
      message = "Serious control. Beat your time next.";
    }

    const bar1 = "█".repeat(scores[0]);
    const bar2 = "█".repeat(scores[1]);
    const bar3 = "█".repeat(scores[2]);

    const trend = improving ? "⬆ Improving" :
                  scores[2] === scores[0] ? "➡ Stable" :
                  "⬇ Dropped";

    out.innerHTML = `
      <hr>

      <h2 style="color:${colour};font-size:1.9rem;">
        ${emoji} ${title}
      </h2>

      <div style="font-size:2.3rem;font-weight:bold;margin:8px 0;">
        ${avg}/10
      </div>

      <div>Time: ${time}s</div>
      <div style="margin-top:6px;font-weight:600;">${trend}</div>

      <div style="margin-top:10px;text-align:left;">
        Round 1: ${bar1} (${scores[0]})<br>
        Round 2: ${bar2} (${scores[1]})<br>
        Round 3: ${bar3} (${scores[2]})
      </div>

      <p style="margin-top:14px;font-size:1.1rem;font-weight:500;">
        ${message}
      </p>

      <button id="playAgain" style="margin-top:12px;">
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
