function loadOverallResults() {
    const overallContainer = document.getElementById('overall-data-container');
    const top3Container = document.getElementById('top-3-container');
    
    if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined' || typeof SHEET_NAME === 'undefined') {
        overallContainer.innerHTML = '<p style="color:red;">Error: API Configuration (config.js) is missing or incorrectly loaded.</p>';
        return;
    }

    overallContainer.innerHTML = '<p>ফলাফল লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>';
    top3Container.innerHTML = '';

    const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}. অনুগ্রহ করে আপনার API Key কনফিগারেশন চেক করুন।`);
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values;
            if (!rows || rows.length <= 1) {
                overallContainer.innerHTML = "<p>সবার ফলাফল লোড করা সম্ভব হয়নি। শিটে কোনো ডেটা পাওয়া যায়নি।</p>";
                return;
            }

            const headerRow = rows[0];
            let html = "<table class='results-table'>";
            html += "<thead><tr>";
            html += `<th>ক্রমিক</th>`; 
            html += `<th>${headerRow[3]}</th>`;
            html += `<th>${headerRow[4]}</th>`;
            html += `<th>${headerRow[2]}</th>`;
            html += "</tr></thead><tbody>";

            // সব ডেটা সংগ্রহ
            let participants = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                participants.push({
                    index: i,
                    name: row[3] || 'নাম নেই',
                    university: row[4] || 'প্রদান করা হয়নি',
                    score: row[2] || '০ / ০',
                });
            }

            // স্কোর অনুযায়ী টপ ৩ নির্বাচন
            let top3 = [...participants].sort((a, b) => {
                let scoreA = parseInt(a.score) || 0;
                let scoreB = parseInt(b.score) || 0;
                return scoreB - scoreA;
            }).slice(0, 3);

            // টপ ৩ কার্ড UI
            top3Container.innerHTML = `
                <div class="top-3-wrapper">
                    <div class="winner-card second">
                        <div class="medal">🥈</div>
                        <img src="https://png.pngtree.com/png-vector/20230305/ourmid/pngtree-muslim-girl-cartoon-with-niqab-vector-png-image_6633291.png" alt="2nd place">
                        <h2>${top3[1]?.name}</h2>
                        <p>${top3[1]?.university}</p>
                        <span>${top3[1]?.score}</span>
                    </div>
                    <div class="winner-card first">
                        <div class="medal">🥇</div>
                        <img src="https://img.freepik.com/vektor-premium/avatar-pria-muslim-memberikan-ilustrasi-jempol-ke-atas_591903-650.jpg" alt="1st place">
                        <h2>${top3[0]?.name}</h2>
                        <p>${top3[0]?.university}</p>
                        <span>${top3[0]?.score}</span>
                    </div>
                    <div class="winner-card third">
                        <div class="medal">🥉</div>
                        <img src="https://img.freepik.com/premium-vector/professional-male-muslim-cartoon-character-with-colour-gradient-background_1138840-2612.jpg" alt="3rd place">
                        <h2>${top3[2]?.name}</h2>
                        <p>${top3[2]?.university}</p>
                        <span>${top3[2]?.score}</span>
                    </div>
                </div>
            `;

            // বাতিল অংশগ্রহণকারীদের index
            const disqualifiedIndexes = [4, 10, 16, 18, 27, 28];

            // টেবিল (row highlight)
            participants.forEach(p => {
                let rowClass = '';
                
                // বাতিল হলে লাল রঙ
                if (disqualifiedIndexes.includes(p.index)) {
                    rowClass = 'disqualified';
                }
                // টপ ৩ হলে সবুজ রঙ
                else if (p.name === top3[0]?.name || p.name === top3[1]?.name || p.name === top3[2]?.name) {
                    rowClass = 'winner';
                }

                html += `<tr class="${rowClass}">`;
                html += `<td>${p.index}</td>`;
                html += `<td>${p.name}</td>`;
                html += `<td>${p.university}</td>`;
                html += `<td>${p.score}</td>`;
                html += `</tr>`;
            });

            html += "</tbody></table>";

            // টেবিলের নিচে টীকা
            html += `
                <div class="legend">
                    <p><span class="legend-box winner-box"></span> সবুজ = প্রতিযোগিতায় বিজয়ী</p>
                    <p><span class="legend-box disqualified-box"></span> লাল = একাধিকবার ফর্ম পূরণ করার কারণে অংশগ্রহণ বাতিল</p>
                </div>
            `;

            overallContainer.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading overall data:", error);
            overallContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadOverallResults, 100); 
});
