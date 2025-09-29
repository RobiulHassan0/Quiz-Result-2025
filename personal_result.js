/* ----- স্টেট ----- */
let quizData = null;

/* ---- স্ট্রিং ক্লিন ---- */
function cleanStringStrict(str) {
  if (typeof str !== "string") return "";
  // Normalization & basic cleaning
  let cleaned = str.normalize ? str.normalize("NFC") : str;
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  cleaned = cleaned.replace(/[\uFEFF\u200B]/g, "");
  // keep inner spacing for tokenizing; trimming done later for tokens
  return cleaned.trim();
}


// Replace old parseUserSelections with this smart version.
// It needs the question's option list to decide whether to split raw by comma/newline or treat as whole.
function parseUserSelections(raw, optionsList) {
    if (raw === undefined || raw === null) return [];
    const s = String(raw).trim();
    if (!s) return [];

    // prepare normalized options for quick lookup
    const normOptions = (Array.isArray(optionsList) ? optionsList : []).map(o => normalizeForCompare(o));

    // if the entire raw matches any option exactly (after normalize) -> return as single selection
    const normRaw = normalizeForCompare(s);
    if (normOptions.includes(normRaw)) return [s];

    // else, try splitting by newline/semicolon/pipe first
    let parts = s.split(/[\n;|]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
        // accept this splitting only if each part matches an option (after normalize)
        const ok = parts.every(p => normOptions.includes(normalizeForCompare(p)));
        if (ok) return parts;
    }

    // next, try comma-splitting but accept only if parts match options
    parts = s.split(/,+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
        const ok = parts.every(p => normOptions.includes(normalizeForCompare(p)));
        if (ok) return parts;
    }

    // fallback: return whole string as single selection (do not force-split)
    return [s];
}


/* ---- সেট সমতা চেক (normalized strings) ---- */
function setsEqual(aArr, bArr) {
  const a = Array.from(new Set(aArr));
  const b = Array.from(new Set(bArr));
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  return b.every((x) => aSet.has(x));
}

function normalizeForCompare(str) {
  if (str === undefined || str === null) return "";
  let s = String(str);

  // Normalize Unicode (NFC)
  if (s.normalize) {
    try {
      s = s.normalize("NFC");
    } catch (e) {}
  }

  // Remove control characters + BOM + zero-width
  s = s.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "");

  // য/য় normalization: য+় → য়
  s = s.replace(/\u09AF\u09BC/g, "য়"); // য+়
  s = s.replace(/\u09DF/g, "য়"); // য়

  // Collapse multiple spaces (including nbsp)
  s = s.replace(/[\s\u00A0]+/g, " ");

  return s.trim();
}

/* ---- কুইজ ডাটা লোড ---- */
fetch("quizData.json")
  .then((r) => {
    if (!r.ok) throw new Error("quizData.json লোড করতে সমস্যা হয়েছে");
    return r.json();
  })
  .then((data) => {
    quizData = data;
    console.log("quizData loaded", quizData);
  })
  .catch((err) => {
    console.error(err);
    document.getElementById(
      "personal-data-container"
    ).innerHTML = `<div class="msg error">কুইজ ডেটা লোড করতে সমস্যা: ${err.message}</div>`;
  });

/* ----- হুক: বাটন ----- */
document
  .getElementById("btnFetch")
  .addEventListener("click", fetchPersonalResult);

/* ====== প্রধান ফাংশন ====== */
/* ফোন নাম্বার normalize করার হেল্পার */
function normalizePhone(str) {
  if (!str) return "";
  // শুধু সংখ্যা রাখবে
  return String(str).replace(/\D/g, "");
}

/* ====== প্রধান ফাংশন: নাম, ইমেইল, ফোন দিয়ে সার্চ ====== */
function fetchPersonalResult() {
  const container = document.getElementById("personal-data-container");
  const participantId = document.getElementById("participantId").value.trim();

  if (!participantId) {
    container.innerHTML = `<div class="msg error">অনুগ্রহ করে আপনার নাম, ইমেইল বা ফোন নাম্বার লিখে সার্চ করুন।</div>`;
    return;
  }

  if (!quizData) {
    container.innerHTML = `<div class="msg warning">কুইজ ডেটা এখনও লোড হয়নি — কয়েক সেকেন্ড পরে চেষ্টা করুন।</div>`;
    return;
  }

  if (
    typeof SHEET_ID === "undefined" ||
    typeof API_KEY === "undefined" ||
    typeof SHEET_NAME === "undefined" ||
    typeof API_RANGE === "undefined"
  ) {
    container.innerHTML = `<div class="msg error">
            API configuration (SHEET_ID, API_KEY, SHEET_NAME, API_RANGE) ঠিকভাবে লোড হয়নি। 
            আপনার config.js চেক করুন।
        </div>`;
    return;
  }

  container.innerHTML = `<div class="msg ok">ফলাফল খোঁজা হচ্ছে — অনুগ্রহ করে অপেক্ষা করুন...</div>`;

  const encodedRange = encodeURIComponent(SHEET_NAME) + "!" + API_RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;

  fetch(url)
    .then((resp) => {
      if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`);
      return resp.json();
    })
    .then((data) => {
      const rows = data.values;
      if (!rows || rows.length <= 1) {
        container.innerHTML = `<div class="msg warning">শিটে কোনো ডেটা পাওয়া যায়নি।</div>`;
        return;
      }

      const cleanInput = cleanStringStrict(participantId);
      const inputPhone = normalizePhone(participantId);

      // participantRow খোঁজা: নাম, ইমেইল বা ফোন দিয়ে
      const participantRow = rows.slice(1).find((row) => {
        const email = row[1] ? cleanStringStrict(row[1]) : "";
        const name = row[3] ? cleanStringStrict(row[3]) : "";
        const phone = row[5] ? normalizePhone(row[5]) : "";

        return (
          cleanInput === email ||
          cleanInput === name ||
          inputPhone === phone
        );
      });

      if (!participantRow) {
        container.innerHTML = `<div class="msg warning"><strong>${participantId}</strong> দিয়ে কোনো ফলাফল পাওয়া যায়নি।</div>`;
        return;
      }

    // ব্যক্তিগত ইনফো (আপনার সরবরাহকৃত Half-Ring ডিজাইন অনুযায়ী)
const infoKeys = [
    // আইকনের জন্য কালার কোড যোগ করা হলো
    { index: 3, label: "নাম", icon: "👤", color: "#4CAF50" }, // সবুজ
    { index: 4, label: "শিক্ষা প্রতিষ্ঠান", icon: "🏫", color: "#9C27B0" }, // পার্পল
    { index: 5, label: "ফোন নাম্বার", icon: "📱", color: "#FF5722" }, // কমলা
    { index: 1, label: "ইমেইল", icon: "📧", color: "#2196F3" }, // নীল
];

let infoHTML = "";
infoKeys.forEach((it) => {
    // হুবহু আপনার দেওয়া HTML টেমপ্লেট ব্যবহার করা হলো
    infoHTML += `
        <div class="card half-ring-card" style="--ring-color: ${it.color}; ">
            <div class="half-ring-wrapper">
                <div class="half-ring">
                    <div class="center-circle">${it.icon}</div>
                </div>
            </div>
            <div class="card-content">
                <h2>${it.label}</h2>
                <p>${participantRow[it.index] || "প্রদান করা হয়নি"}</p>
            </div>
        </div>
    `;
});


      // প্রতিটি প্রশ্ন যাচাই
      let questionsHTML = "";
      participantRow.forEach((cellValue, colIndex) => {
        if (colIndex < 6) return; // প্রশ্নগুলো 6 নম্বর কলাম থেকে শুরু
        const qIndex = colIndex - 6;
        const q = quizData.questions[qIndex];
        if (!q) return;

        const rawUserAnswer = (cellValue === undefined || cellValue === null) ? '' : String(cellValue);

        const userSelectionsRaw = parseUserSelections(rawUserAnswer, q.options);
        const userSelectionsClean = userSelectionsRaw.map(s => normalizeForCompare(s));

        const correctArray = Array.isArray(q.correctAnswer) ? q.correctAnswer.slice() : [q.correctAnswer];
        const correctClean = correctArray.map(a => normalizeForCompare(a));

        const isMultiCorrect = correctClean.length > 1;
        let isUserCorrect = false;

        if (isMultiCorrect) {
          isUserCorrect = setsEqual(userSelectionsClean, correctClean);
        } else {
          if (userSelectionsClean.length === 1) {
            isUserCorrect = (userSelectionsClean[0] === correctClean[0]);
          }
        }

        // Options list
        let optionsListHTML = '';
        q.options.forEach(opt => {
          const optClean = normalizeForCompare(opt);
          const isCorrectOpt = correctClean.includes(optClean);
          const isUserSelected = userSelectionsClean.includes(optClean);

          let cls = 'option-item';
          if (isCorrectOpt) cls += ' correct';
          if (isUserSelected) cls += ' selected';

          let badge = '';
          if (isUserSelected) {
            badge = isUserCorrect ? `<span class="option-badge badge-correct"> ✓</span>` : `<span class="option-badge badge-wrong"> ✕</span>`;
          } else if (isCorrectOpt) {
            badge = `<span class="option-badge badge-correct"> ✓</span>`;
          }

          optionsListHTML += `<li class="${cls}"><span class="option-text">${escapeHtml(opt)}</span>${badge}</li>`;
        });

        // User answer card
        let userCardHTML = "";
        if (isUserCorrect) {
          userCardHTML = `<div class="user-answer-card correct-answer-card">
                            <p><strong>আপনার উত্তর:</strong> ${rawUserAnswer ? escapeHtml(rawUserAnswer) : "উত্তর দেননি"} ✅</p>
                          </div>`;
        } else {
          let specialRule = "";
          if (isMultiCorrect) {
            specialRule = `<div class="special-note">
                             <strong>নোট:</strong> এই প্রশ্নে একাধিক সঠিক উত্তর আছে — কুইজের নিয়ম অনুযায়ী <em>সবগুলো</em> সঠিক অপশন একত্রে সিলেক্ট করতে হবে। শুধুমাত্র একটি/কিছু সিলেক্ট করলে সেটিকে ভুল ধরা হবে।
                           </div>`;
          }
          userCardHTML = `<div class="user-answer-card incorrect-answer-card">
                            <p><strong>আপনার উত্তর:</strong> ${rawUserAnswer ? escapeHtml(rawUserAnswer) : "<em>উত্তর দেননি</em>"} ❌</p>
                            <p><strong>সঠিক উত্তর:</strong> <span class="correct-response-highlight">${correctArray.join(" + ")}</span></p>
                            ${specialRule}
                          </div>`;
        }

        // Final question card
        questionsHTML += `<div class="question-card">
                            <div class="question-number">প্রশ্ন ${q.questionNumber}</div>
                            <div class="question-text"><strong>${escapeHtml(q.questionText)}</strong></div>
                            <ul class="options-list">${optionsListHTML}</ul>
                            ${userCardHTML}
                          </div>`;
      });

      // Final page HTML
      // Final page HTML (আপনার সরবরাহকৃত Half-Ring ডিজাইন সহ)
const finalHTML = `
    <div class="info-card-container">
        <h3 class="main-card-title">👤 আপনার ব্যক্তিগত তথ্য</h3>
        
        <div class="card-parent-box">
            <div class="personal-details-grid half-ring-grid">
                ${infoHTML}
            </div>
        </div>

        <div class="card-parent-box">
            <div class="score-summary-area" style="">
                <div class="card score-card-ring" style="--ring-color: #FFC107;">
                    <div class="half-ring-wrapper">
                        <div class="half-ring">
                            <div class="center-circle">⭐</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <h2>প্রাপ্ত স্কোর</h2>
                        <p>${participantRow[2] || "০ / ০"}</p>
                    </div>
                </div>
                <div class="card score-card-ring" style="--ring-color: #00BCD4;">
                    <div class="half-ring-wrapper">
                        <div class="half-ring">
                            <div class="center-circle">❓</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <h2>মোট প্রশ্ন</h2>
                        <p>${quizData.questions.length}টি</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="section-title-container">
        <h3 class="section-title">———— আপনার উত্তরপত্র ————</h3>
    </div>
    
    <div class="quiz-container">
        ${questionsHTML}
    </div>
`;

      container.innerHTML = finalHTML;
    })

    .catch((err) => {
      console.error(err);
      container.innerHTML = `<div class="msg error">ফলাফল লোড করতে সমস্যা হয়েছে: ${err.message}</div>`;
    });
}


/* ছোট হেল্প: HTML-এ নিরাপদ ভাবে টেক্সট দেখানোর জন্য */
function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}
