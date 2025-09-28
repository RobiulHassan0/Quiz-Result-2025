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

/* ---- ইউজারের সিলেকশন স্ট্রিংকে আরে-তে রূপান্তর (split safely) ----
   স্বাভাবিকভাবে Google Forms checkbox answers শিটে "a, b" বা নতুন লাইনে আসতে পারে।
*/
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
function fetchPersonalResult() {
  const container = document.getElementById("personal-data-container");
  const participantId = document.getElementById("participantId").value.trim();

  if (!participantId) {
    container.innerHTML = `<div class="msg error">অনুগ্রহ করে আপনার আইডি (ইমেইল/ফোন নম্বর) প্রবেশ করুন।</div>`;
    return;
  }

  if (!quizData) {
    container.innerHTML = `<div class="msg warning">কুইজ ডেটা এখনও লোড হয়নি — কয়েক সেকেন্ড পরে চেষ্টা করুন।</div>`;
    return;
  }

  // API কনফিগ উইন্ডোতে সেট করা আছে কি না চেক করুন।
  if (
    typeof SHEET_ID === "undefined" ||
    typeof API_KEY === "undefined" ||
    typeof SHEET_NAME === "undefined" ||
    typeof API_RANGE === "undefined"
  ) {
    // যদি API কনফিগ না থাকে, we stop and show guidance.
    container.innerHTML = `<div class="msg error">
            API configuration (SHEET_ID, API_KEY, SHEET_NAME, API_RANGE) ঠিক মতো লোড হয়নি। 
            আপনার config.js চেক করুন।
        </div>`;
    return;
  }

  container.innerHTML = `<div class="msg ok">ফলাফল খোঁজা হচ্ছে — অনুগ্রহ করে অপেক্ষা করুন...</div>`;

  // Google Sheets API থেকে রো লোড
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

      const cleanId = cleanStringStrict(participantId);
      // আপনার শিট ফর্ম্যাট অনুযায়ী ঠিক ইনডেক্স সেট করুন। এখানে ধরে নেওয়া হলো:
      // row[1] = ইমেইল, row[3] = ফোন/আইডি (আপনার পূর্বের personal_result.js অনুযায়ী)
      const participantRow = rows.slice(1).find((row) => {
        const email = row[1] ? cleanStringStrict(row[1]) : "";
        const phone = row[3] ? cleanStringStrict(row[3]) : "";
        return email === cleanId || phone === cleanId;
      });

      if (!participantRow) {
        container.innerHTML = `<div class="msg warning">এই আইডি (<strong>${participantId}</strong>) দিয়ে কোনো ফলাফল পাওয়া যায়নি।</div>`;
        return;
      }

      // ব্যক্তিগত ইনফো বানানো
      const infoKeys = [
        { index: 1, label: "ইমেইল" },
        { index: 3, label: "নাম" },
        { index: 4, label: "শিক্ষা প্রতিষ্ঠান" },
        { index: 5, label: "ফোন নম্বর" },
        { index: 2, label: "প্রাপ্ত স্কোর" },
      ];
      let infoHTML = "";
      infoKeys.forEach((it) => {
        infoHTML += `<li><strong>${it.label}:</strong> ${
          participantRow[it.index] || "নেই"
        }</li>`;
      });

      // প্রতিটি প্রশ্ন যাচাই
      let questionsHTML = "";
      participantRow.forEach((cellValue, colIndex) => {
        if (colIndex < 6) return; // প্রশ্নগুলো 6 নম্বর কলাম থেকে শুরু (0-based)
        const qIndex = colIndex - 6;
        const q = quizData.questions[qIndex];
        if (!q) return;

        const rawUserAnswer = (cellValue === undefined || cellValue === null) ? '' : String(cellValue);

        // parse with options (smart)
const userSelectionsRaw = parseUserSelections(rawUserAnswer, q.options);
const userSelectionsClean = userSelectionsRaw.map(s => normalizeForCompare(s));

// correct answers normalized
const correctArray = Array.isArray(q.correctAnswer) ? q.correctAnswer.slice() : [q.correctAnswer];
const correctClean = correctArray.map(a => normalizeForCompare(a));

const isMultiCorrect = correctClean.length > 1;
let isUserCorrect = false;

if (isMultiCorrect) {
    // sets: both are arrays of normalized strings
    isUserCorrect = setsEqual(userSelectionsClean, correctClean);
} else {
    if (userSelectionsClean.length === 1) {
        isUserCorrect = (userSelectionsClean[0] === correctClean[0]);
    } else {
        isUserCorrect = false;
    }
}

        // Build options list (always highlight the correct options)
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
                if (isUserCorrect) badge = `<span class="option-badge badge-correct"> ✓</span>`;
                else badge = `<span class="option-badge badge-wrong"> ✕</span>`;
            } else {
                if (isCorrectOpt) badge = `<span class="option-badge badge-correct"> ✓</span>`;
            }

            optionsListHTML += `<li class="${cls}"><span class="option-text">${escapeHtml(opt)}</span>${badge}</li>`;
        });

        // Build user answer card with rule note when multi-answer
        let userCardHTML = "";
        if (isUserCorrect) {
          userCardHTML = `
                        <div class="user-answer-card correct-answer-card">
                            <p><strong>আপনার উত্তর:</strong> ${
                              rawUserAnswer
                                ? escapeHtml(rawUserAnswer)
                                : "উত্তর দেননি"
                            } ✅</p>
                        </div>
                    `;
        } else {
          // Wrong: if multi-correct -> add special rule note
          let specialRule = "";
          if (isMultiCorrect) {
            specialRule = `
                            <div class="special-note">
                                <strong>নোট:</strong> এই প্রশ্নে একাধিক সঠিক উত্তর আছে — কুইজের নিয়ম অনুযায়ী <em>সবগুলো</em> সঠিক অপশন একত্রে সিলেক্ট করতে হবে। শুধুমাত্র একটি/কিছু সিলেক্ট করলে সেটিকে ভুল ধরা হবে।
                            </div>
                        `;
          }
          // Show what user selected and the actual correct answers
          userCardHTML = `
                        <div class="user-answer-card incorrect-answer-card">
                            <p><strong>আপনার উত্তর:</strong> ${
                              rawUserAnswer
                                ? escapeHtml(rawUserAnswer)
                                : "<em>উত্তর দেননি</em>"
                            } ❌</p>
                            <p><strong>সঠিক উত্তর:</strong> <span class="correct-response-highlight">${correctArray.join(
                              " / "
                            )}</span></p>
                            ${specialRule}
                        </div>
                    `;
        }

        // Final question card
        questionsHTML += `
                    <div class="question-card">
                        <div class="question-number">প্রশ্ন ${
                          q.questionNumber
                        }</div>
                        <div class="question-text"><strong>${escapeHtml(
                          q.questionText
                        )}</strong></div>

                        <ul class="options-list">
                            ${optionsListHTML}
                        </ul>

                        ${userCardHTML}
                    </div>
                `;
      });

      // Final page HTML
      const finalHTML = `
                <div class="info-card">
                    <h3>👤 আপনার ব্যক্তিগত তথ্য ও মূল সারসংক্ষেপ</h3>
                    <ul class="personal-details-list">
                        ${infoHTML}
                    </ul>
                </div>

                <h3>✅ আপনার উত্তরপত্র</h3>
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
