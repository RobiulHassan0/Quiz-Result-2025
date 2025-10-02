function loadLeaderboard() {
  const overallContainer = document.getElementById('overall-data-container');
  const top3Container = document.getElementById('top-3-container');

  if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined' || typeof SHEET_NAME === 'undefined') {
    overallContainer.innerHTML = '<p style="color:red;">Error: config.js সঠিকভাবে লোড হয়নি।</p>';
    return;
  }

  overallContainer.innerHTML = '<p>ফলাফল লোড হচ্ছে...</p>';
  top3Container.innerHTML = ''; // top-3 cards intentionally removed

  const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;

  // score parsing helper: "24 / 30" থেকে 24 বের করবে
  function parseScore(scoreStr) {
    if (!scoreStr && scoreStr !== 0) return 0;
    const s = String(scoreStr).trim();
    const m = s.match(/(-?\d+)\s*(?=\/|$)/);
    if (m) return parseInt(m[1], 10);
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  // normalize name for stable matching (lowercase, trim, remove punctuation, collapse spaces)
  function normalizeNameForKey(name) {
    if (!name) return '';
    let s = String(name).toLowerCase().trim();
    // replace multiple spaces/newlines with single space
    s = s.replace(/[\s\u00A0]+/g, ' ');
    // remove punctuation except Bengali letters and ascii letters/numbers and spaces
    s = s.replace(/[^\u0980-\u09FFa-z0-9\s]/g, '');
    return s;
  }

  // Manual list of names to mark as disqualified (exact variants you provided).
  // Add more variants here if you want to mark them too.
const manualDisqualifiedNames = [
  'আলাউদ্দীন আলী',
  'আলাউদ্দীন',
  'tausif mahdin',
  'tausif',
  'mahmudul hasan rakib'
].map(n => normalizeNameForKey(n));


  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`Sheets API responded ${r.status}`);
      return r.json();
    })
    .then(data => {
      const rows = data.values;
      if (!rows || rows.length <= 1) {
        overallContainer.innerHTML = "<p>শিটে কোনো ডেটা নেই।</p>";
        return;
      }

      // build participants array including timestamp and original row index
      const participants = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        participants.push({
          originalIndex: i,               // preserve sheet order reference
          timestamp: row[0] || '',
          email: row[1] || '',
          scoreRaw: row[2] || '',
          score: parseScore(row[2]),
          name: row[3] || 'নাম নেই',
          university: row[4] || 'প্রদান করা হয়নি'
        });
      }

      // sort: score desc, then timestamp asc (earlier first), then originalIndex
      participants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        const tA = Date.parse(a.timestamp);
        const tB = Date.parse(b.timestamp);
        const validA = !isNaN(tA);
        const validB = !isNaN(tB);

        if (validA && validB) {
          return tA - tB;
        }
        if (validA && !validB) return -1;
        if (!validA && validB) return 1;

        return a.originalIndex - b.originalIndex;
      });

      // Build HTML table
      let html = "<table class='results-table '>";
      html += "<thead><tr><th>রোল</th><th>নাম</th><th>শিক্ষাপ্রতিষ্ঠান</th><th>স্কোর</th></tr></thead><tbody>";

      participants.forEach((p, i) => {
        // compute normalized name key
        const normName = normalizeNameForKey(p.name);

        // determine if manually disqualified
        const isManuallyDisqualified = manualDisqualifiedNames.includes(normName);

        // build display name with medal for top3
        let displayName = p.name;
        let rowClass = '';

        if (i === 0) {
          displayName = '🥇 ' + displayName;
          rowClass = 'winner-first';
        } else if (i === 1) {
          displayName = '🥈 ' + displayName;
          rowClass = 'winner-second';
        } else if (i === 2) {
          displayName = '🥉 ' + displayName;
          rowClass = 'winner-third';
        }

        // if name is manually disqualified, append cross mark and mark rowClass as disqualified
        if (isManuallyDisqualified) {
          displayName = displayName + ' ❌';
          // ensure disqualified style applies; if it's a winner and you want winners to still show medal
          // we keep winner class as well but also add a 'disqualified' marker class
          rowClass = (rowClass ? rowClass + ' disqualified' : 'disqualified');
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${i + 1}</td>`;
        html += `<td class="name-cell">${escapeHtml(displayName)}</td>`;
        html += `<td>${escapeHtml(p.university)}</td>`;
        html += `<td>${escapeHtml(p.scoreRaw)}</td>`;
        html += "</tr>";
      });

            html += "</tbody></table>";

      // টেবিলের নিচে বার্তা
      html += `
        <div class="leaderboard-note">
          <p>👉 এই ❌ চিহ্ন দ্বারা বুঝানো হয়েছে বাতিল অংশগ্রহণকারী, একাধিকবার ফর্ম পূরণ করেছেন।</p>
          <p>👉 একই নাম্বার প্রাপ্ত অংশগ্রহণকারীদের সিরিয়াল নির্ধারণ হয়েছে ফর্ম জমা দেওয়ার সময় অনুযায়ী। যারা আগে ফর্ম জমা দিয়েছেন তাদের নাম আগে দেখানো হয়েছে।</p>
        </div>
      `;

      overallContainer.innerHTML = html;

      overallContainer.innerHTML = html;



    })
    .catch(err => {
      console.error(err);
      overallContainer.innerHTML = `<p style="color:red;">লোডিং এ সমস্যা: ${escapeHtml(err.message)}</p>`;
    });
}



/* safe html escape */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/[&<>"']/g, function(m) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' })[m];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadLeaderboard, 200);
});

