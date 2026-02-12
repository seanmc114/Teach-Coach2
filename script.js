// ==============================
// TURBO COACH — HYBRID AUTHORITY ENGINE (ALL TENSES) + 3-ROUND GAME
// GitHub Pages safe. No imports.
// ==============================

const CONFIG = {
  ROUNDS: 3 // change later for "big game" mode
};

const PROMPT_BANK = [
  "Describe your best friend",
  "Describe someone in your family",
  "Describe your school",
  "Describe your house",
  "Describe your favourite subject",
  "Describe your weekend",
  "Describe your town or area",
  "Describe your hobbies"
];

let round = 0;
let scores = [];
let focusLog = [];
let currentPrompt = "";
let startMs = null;
let timerTick = null;

// ---------------- PROMPTS ----------------

function getRandomPrompt() {
  return PROMPT_BANK[Math.floor(Math.random() * PROMPT_BANK.length)];
}

// ---------------- TIMER ----------------

function startTimerIfNeeded() {
  if (startMs !== null) return;
  startMs = Date.now();
  timerTick = setInterval(updateHUD, 250);
}

function stopTimer() {
  if (timerTick) clearInterval(timerTick);
  timerTick = null;
}

function elapsedSeconds() {
  if (startMs === null) return 0;
  return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
}

// ---------------- VERB DETECTION (MULTI-TENSE) ----------------
// Goal: avoid punishing valid past/future answers. Light heuristic, not perfect morphology.

function buildRegex(parts, flags="i") {
  return new RegExp("\\b(?:" + parts.join("|") + ")\\b", flags);
}

const RX = {
  es: buildRegex([
    // common irregulars + auxiliaries + high-frequency
    "fui","fue","fuimos","fueron","era","eras","eran","estaba","estabas","estaban","estuve","estuvo","estuvimos","estuvieron",
    "soy","eres","es","somos","son","estoy","estás","está","estamos","están",
    "hay","hubo","había","habia",
    "voy","vas","va","vamos","vais","van","iré","ire","irá","ira","iremos","irán","iran",
    "tengo","tienes","tiene","tenemos","tenéis","teneis","tienen",
    "puedo","puedes","puede","podemos","pueden","podría","podria","podré","podre",
    // regular-ish verb endings (keep word length >=3 to reduce false positives)
    "[a-záéíóúñ]{3,}(?:o|as|a|amos|an|é|aste|ó|aron|aba|abas|aban|ía|ías|ía|ían|io|ió|ieron|í)"
  ]),
  fr: buildRegex([
    "suis","es","est","sommes","êtes","etes","sont",
    "ai","as","a","avons","avez","ont",
    "étais","etais","était","etait","étaient","etaient",
    "vais","va","allons","allez","vont","irai","iras","ira","irons","irez","iront",
    // common past participles can appear after avoir/être
    "[a-zàâäçéèêëîïôöùûüÿœ]{3,}(?:é|ée|ées|és|i|ie|ies|is|u|ue|ues|us)",
    // regular present/imparfait/future endings (rough)
    "[a-zàâäçéèêëîïôöùûüÿœ]{3,}(?:e|es|ent|ons|ez|ais|ait|aient|erai|eras|era|erons|erez|eront)"
  ]),
  de: buildRegex([
    "bin","bist","ist","sind","seid",
    "war","warst","waren","wart",
    "habe","hast","hat","haben","habt","hatte","hattest","hatten","hattet",
    "werde","wirst","wird","werden","werdet",
    "gehe","gehst","geht","gehen","ging","gingst","gingen",
    // common verb endings (rough)
    "[a-zäöüß]{3,}(?:e|st|t|en)"
  ]),
  ga: buildRegex([
    "tá","ta","táim","taim","táimid","taimid","tá sé","ta se","tá sí","ta si",
    "bhí","bhi","bhí mé","bhi me","bhíomar","bhiomar","bhí siad","bhi siad",
    "beidh","beidh mé","beidh me","beidh muid","beidh siad",
    "is","ba","bíonn","bionn",
    "chuaigh","chuaigh mé","chuaigh me","chuaigh muid","chuaigh siad",
    "rachaidh","rachaidh mé","rachaidh me","rachaimid","rachaidh siad",
    // rough endings
    "[a-záéíóú]{3,}(?:ann|aim|amar|fidh|faidh|íonn|ionn)"
  ])
};

function hasVerb(answer, lang) {
  const text = (answer || "").toLowerCase();
  const rx = RX[lang];
  if (!rx) return false;
  // special case: Gaelic patterns with spaces handled poorly by \b; quick fallback
  if (lang === "ga") {
    if (/tá\s+(sé|si)\b/i.test(text)) return true;
    if (/bhí\s+\w+/i.test(text)) return true;
  }
  return rx.test(text);
}

// ---------------- RULE LAYER (AUTHORITATIVE SCAFFOLD) ----------------

function ruleCheck(answer, lang) {
  const trimmed = (answer || "").trim();
  const wc = trimmed ? trimmed.split(/\s+/).length : 0;

  if (wc < 2) {
    return { score: 2, focus: "Start", feedback: "Start with a full sentence: subject + verb + one detail." };
  }

  if (!hasVerb(trimmed, lang)) {
    const ex = {
      es: "Try: **Mi amigo es…** / **Fui…** / **Voy…**",
      fr: "Try: **Mon ami est…** / **Je suis allé…** / **Je vais…**",
      de: "Try: **Mein Freund ist…** / **Ich war…** / **Ich gehe…**",
      ga: "Try: **Tá sé…** / **Bhí mé…** / **Beidh mé…**"
    };
    return { score: 3, focus: "Missing verb", feedback: "Add a verb to make a real sentence. " + ex[lang] };
  }

  // very short but has a verb -> push one extra detail
  if (wc <= 4) {
    const ex = {
      es: "Example: **Mi amigo es alto y simpático.**",
      fr: "Example: **Mon ami est grand et sympa.**",
      de: "Example: **Mein Freund ist groß und nett.**",
      ga: "Example: **Tá sé ard agus cineálta.**"
    };
    return { score: 5, focus: "Development", feedback: "Good start. Add ONE more clear detail. " + ex[lang] };
  }

  return null; // allow AI
}

// ---------------- AI LAYER ----------------
// Expects window.classifyAnswer to return {score, focus, feedback}.
// If AI is off/unavailable, we fall back safely.

async function aiRefine(task, answer, lang) {
  if (!window.classifyAnswer) return null;
  try {
    return await window.classifyAnswer({ task, answer, lang });
  } catch (e) {
    console.warn("AI failed, using rules/fallback", e);
    return null;
  }
}

function fallbackCoach(answer) {
  const wc = (answer || "").trim().split(/\s+/).filter(Boolean).length;
  if (wc < 2) return { score: 2, focus: "Start", feedback: "Write a full sentence." };
  if (wc <= 4) return { score: 5, focus: "Development", feedback: "Add one more detail." };
  return { score: 7, focus: "Development", feedback: "Add a reason (because / because…) or one extra detail." };
}

// ---------------- UI HELPERS ----------------

function byId(id) { return document.getElementById(id); }

function updateHUD() {
  const rHud = byId("roundHud");
  const tHud = byId("timerHud");
  if (rHud) rHud.textContent = `Round ${round}/${CONFIG.ROUNDS}`;
  if (tHud) tHud.textContent = `Time: ${elapsedSeconds()}s`;
}

function setPrompt(text) {
  currentPrompt = text;
  const taskBox = byId("taskBox");
  if (taskBox) taskBox.innerText = "Task: " + currentPrompt;
}

function renderProgressBar(percent) {
  return `
    <div style="height:12px;background:rgba(0,0,0,0.12);border-radius:999px;overflow:hidden;margin:12px 0 18px;">
      <div style="height:12px;background:#003366;width:${percent}%;"></div>
    </div>
  `;
}

function renderTeacherBar(answer, result) {
  return `
    <div class="teacherBar" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
      <button data-v="clear">👍 Clear</button>
      <button data-v="unclear">🔁 Could be clearer</button>
      <button data-v="bad">❌ Not helpful</button>
    </div>
  `;
}

function attachTeacherHandlers(container, answer, result) {
  container.querySelectorAll(".teacherBar button").forEach(btn => {
    btn.onclick = () => {
      console.log("TEACHER FEEDBACK", { prompt: currentPrompt, answer, result, rating: btn.dataset.v });
      btn.innerText = "✓";
      btn.disabled = true;
    };
  });
}

// ---------------- END SUMMARY (GRAPHIC) ----------------

function summarizeFocus() {
  const counts = {};
  focusLog.forEach(f => counts[f] = (counts[f] || 0) + 1);
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return sorted.length ? sorted[0][0] : "—";
}

function barsForScores() {
  return scores.map((s, i) => {
    const blocks = "█".repeat(Math.max(1, Math.round(s)));
    return `Round ${i+1}: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;">${blocks}</span> (${s}/10)`;
  }).join("<br>");
}

// ---------------- MAIN ----------------

document.addEventListener("DOMContentLoaded", () => {

  const runBtn = byId("runBtn");
  const ans = byId("answer");
  const out = byId("out");
  const langSelect = byId("lang");

  // init
  round = 0;
  scores = [];
  focusLog = [];
  setPrompt(getRandomPrompt());
  updateHUD();

  runBtn.onclick = async () => {
    const answer = (ans.value || "").trim();
    const lang = langSelect.value;

    if (!answer) return;

    startTimerIfNeeded();

    // lock input until next step (prevents copy/paste gaming)
    ans.disabled = true;
    runBtn.disabled = true;

    out.classList.remove("hidden");
    out.innerHTML = "Thinking…";

    // 1) Rules first
    let result = ruleCheck(answer, lang);

    // 2) AI second
    if (!result) result = await aiRefine(currentPrompt, answer, lang);

    // 3) Fallback
    if (!result) result = fallbackCoach(answer);

    // record
    round += 1;
    scores.push(Number(result.score) || 0);
    focusLog.push(result.focus || "—");

    updateHUD();

    const pct = Math.round((round / CONFIG.ROUNDS) * 100);

    // round screen
    out.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><strong>Round:</strong> ${round}/${CONFIG.ROUNDS}</div>
        <div><strong>Time:</strong> ${elapsedSeconds()}s</div>
      </div>
      ${renderProgressBar(pct)}
      <div style="font-size:1.2rem; margin:6px 0 10px;"><strong>Score:</strong> ${result.score}/10</div>
      <div><strong>Focus:</strong> ${result.focus}</div>
      <div style="margin-top:10px;"><strong>Coach says:</strong> ${result.feedback}</div>
      ${renderTeacherBar(answer, result)}
      <div style="margin-top:18px;">
        <button id="nextBtn">${round < CONFIG.ROUNDS ? "Next" : "Finish"}</button>
      </div>
    `;

    attachTeacherHandlers(out, answer, result);

    byId("nextBtn").onclick = () => {
      if (round < CONFIG.ROUNDS) {
        // next round
        setPrompt(getRandomPrompt());
        ans.value = "";
        ans.disabled = false;
        runBtn.disabled = false;
        ans.focus();
        out.classList.add("hidden");
      } else {
        // finish
        stopTimer();
        const avg = (scores.reduce((a,b)=>a+b,0) / scores.length);
        const mainFocus = summarizeFocus();
        const time = elapsedSeconds();
        out.innerHTML = `
          <h3 style="margin-top:0;">Game Complete</h3>
          <div style="font-size:1.2rem;"><strong>Average:</strong> ${avg.toFixed(1)}/10</div>
          <div style="margin-top:6px;"><strong>Time:</strong> ${time}s</div>
          <div style="margin-top:10px;"><strong>Round scores:</strong> ${scores.join(" → ")}</div>
          <div style="margin-top:12px; line-height:1.5;">${barsForScores()}</div>
          <div style="margin-top:12px;"><strong>Main focus:</strong> ${mainFocus}</div>
          <div style="margin-top:12px;"><strong>Coach says:</strong> Aim to improve <b>${mainFocus}</b> and try to beat your time.</div>
          <div style="margin-top:18px;">
            <button id="playAgain">Play again</button>
          </div>
        `;
        byId("playAgain").onclick = () => {
          round = 0;
          scores = [];
          focusLog = [];
          startMs = null;
          stopTimer();
          updateHUD();
          setPrompt(getRandomPrompt());
          ans.value = "";
          ans.disabled = false;
          runBtn.disabled = false;
          ans.focus();
          out.classList.add("hidden");
        };
      }
      updateHUD();
    };
  };
});
