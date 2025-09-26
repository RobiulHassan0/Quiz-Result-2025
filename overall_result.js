// overall_result.js (টেবিল কাঠামো অনুযায়ী পরিবর্তিত)

function loadOverallResults() {
    const overallContainer = document.getElementById('overall-data-container');
    
    // config.js লোড হয়েছে কি না, তা যাচাই
    if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined' || typeof SHEET_NAME === 'undefined') {
        overallContainer.innerHTML = '<p style="color:red;">Error: API Configuration (config.js) is missing or incorrectly loaded.</p>';
        return;
    }
    
    overallContainer.innerHTML = '<p>ফলাফল লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>';
    
    // URL তৈরি
    const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                // 403 এর মতো ত্রুটি এলে এখানে ধরা হবে
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

            const headerRow = rows[0]; // প্রথম সারি হেডার
            
            // টেবিল তৈরি শুরু
            let html = "<table class='results-table'>";

            // হেডার তৈরি (আপনার চাওয়া কাঠামো অনুযায়ী)
            html += "<thead><tr>";
            html += `<th>ক্রমিক</th>`; 
            html += `<th>${headerRow[3]}</th>`; // আপনার নাম লিখুন (নাম)
            html += `<th>${headerRow[4]}</th>`; // আপনার বিশ্ববিদ্যালয়ের নাম (শিক্ষাপ্রতিষ্ঠান)
            html += `<th>${headerRow[2]}</th>`; // Score (মোট স্কোর)
            html += "</tr></thead><tbody>";

            // ডেটা সারি তৈরি
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                // ডেটা ইনডেক্স ব্যবহার: 3=নাম, 4=শিক্ষাপ্রতিষ্ঠান, 2=স্কোর
                const participantName = row[3] || 'নাম নেই';
                const university = row[4] || 'প্রদান করা হয়নি'; 
                const score = row[2] || '০ / ০'; 
                
                // স্কোরটি আপনার চাওয়া ফরম্যাটে (যেমন: 25 / 30)
                
                html += `<tr>`;
                html += `<td>${i}</td>`; // ক্রমিক নম্বর (১ থেকে শুরু)
                html += `<td>${participantName}</td>`;
                html += `<td>${university}</td>`;
                html += `<td>${score}</td>`; 
                html += `</tr>`;
            }
            
            html += "</tbody></table>";
            overallContainer.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading overall data:", error);
            // 403 ত্রুটি সহ ফলাফল প্রদর্শন
            overallContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // config.js লোড হয়েছে কি না, তা নিশ্চিত করতে একটু অপেক্ষা করা হলো
    setTimeout(loadOverallResults, 100); 
});