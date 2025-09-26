// overall_result.js
// config.js ফাইলটি HTML এ লোড করতে ভুলবেন না।
// যেমন: <script src="config.js"></script>

function loadOverallResults() {
    const overallContainer = document.getElementById('overall-data-container');
    
    // API কল করার আগে config.js ফাইলটি HTML এ যোগ করতে হবে
    if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined') {
        overallContainer.innerHTML = '<p style="color:red;">Error: API Configuration (config.js) is missing or incorrectly loaded.</p>';
        return;
    }
    
    // URL তৈরি
    const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values;
            if (!rows || rows.length === 0) {
                overallContainer.innerHTML = "<p>সবার ফলাফল লোড করা সম্ভব হয়নি। শিটে কোনো ডেটা পাওয়া যায়নি।</p>";
                return;
            }

            // এখানে আপনার ফলাফল প্রদর্শনের লজিক থাকবে (নাম, সঠিক উত্তরের সংখ্যা, স্কোর)
            // ধরে নিচ্ছি প্রথম সারিটি হেডার এবং প্রতিটি সারিতে নাম, স্কোর ইত্যাদি আছে।
            
            let html = "<table border='1'>";
            rows.forEach((row, index) => {
                // আপনি এখানে কলামের ইন্ডেক্স ব্যবহার করে নাম (যেমন কলাম 2), স্কোর (যেমন কলাম 3) দেখাতে পারেন।
                const name = row[1] || 'নাম নেই'; // উদাহরণস্বরূপ: কলাম B
                const correctAnswers = row[2] || 0; // উদাহরণস্বরূপ: কলাম C
                const score = row[3] || 0; // উদাহরণস্বরূপ: কলাম D

                if (index === 0) {
                    // হেডার রো
                    html += `<tr><th>${name}</th><th>সঠিক উত্তর</th><th>মোট স্কোর</th></tr>`;
                } else {
                    // ডেটা রো
                    html += `<tr><td>${name}</td><td>${correctAnswers}</td><td>${score}</td></tr>`;
                }
            });
            html += "</table>";
            overallContainer.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading overall data:", error);
            overallContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
        });
}

// পেজ লোড হওয়ার পর ডেটা লোড শুরু
document.addEventListener('DOMContentLoaded', () => {
    // config.js লোড হয়েছে কি না, তা নিশ্চিত করতে একটু অপেক্ষা করা ভালো
    setTimeout(loadOverallResults, 100); 
});