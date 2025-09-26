// personal_result.js
// config.js ফাইলটি HTML এ লোড করতে ভুলবেন না।
// যেমন: <script src="config.js"></script>

function fetchPersonalResult() {
    const participantId = document.getElementById('participantId').value.trim();
    const personalContainer = document.getElementById('personal-data-container');

    if (!participantId) {
        personalContainer.innerHTML = '<p style="color: orange;">অনুগ্রহ করে আপনার আইডি (ইমেইল/ফোন নম্বর) প্রবেশ করুন।</p>';
        return;
    }

    if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined') {
        personalContainer.innerHTML = '<p style="color:red;">Error: API Configuration is missing.</p>';
        return;
    }
    
    personalContainer.innerHTML = '<p>ফলাফল খোঁজা হচ্ছে...</p>';

    // ধরে নিলাম যে আইডি বা ইমেইলটি শিটের A কলামে আছে
    // শুধুমাত্র নির্দিষ্ট ID এর ডেটা আনার জন্য Sheets API এর Query ব্যবহার করা যায় না।
    // তাই, পুরো ডেটা নিয়ে এসে জাভাস্ক্রিপ্টে ফিল্টার করতে হবে।
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
            const allRows = data.values;
            if (!allRows || allRows.length <= 1) {
                personalContainer.innerHTML = "<p>কোনো ডেটা পাওয়া যায়নি।</p>";
                return;
            }
            
            const header = allRows[0];
            // ইমেইল বা আইডির কলাম ধরে নিচ্ছি (যেমন: 1st column, index 0)
            const idColumnIndex = 1; // ধরে নিলাম ইমেইল/আইডি B কলামে (ইনডেক্স 1) আছে
            
            const userRow = allRows.find((row, index) => {
                // হেডার সারি বাদ দিতে হবে (index > 0)
                return index > 0 && (row[idColumnIndex] || '').trim().toLowerCase() === participantId.toLowerCase();
            });

            if (userRow) {
                let html = '<h3>আপনার ফলাফল</h3><ul>';
                // ব্যবহারকারীর ডেটা হেডারের সাথে মিলিয়ে দেখাবে
                userRow.forEach((cell, index) => {
                    // শুধুমাত্র প্রথম কয়েকটি কলাম (যেমন: টাইমস্ট্যাম্প, নাম, স্কোর) দেখানোর জন্য কন্ডিশন যোগ করতে পারেন
                    if (index < 5 || index > 20) { // উদাহরণস্বরূপ, প্রথম ৫টি কলাম এবং ২০ এর পরের কলাম
                        html += `<li><strong>${header[index] || 'ডেটা'}:</strong> ${cell}</li>`;
                    }
                });
                html += '</ul>';
                personalContainer.innerHTML = html;
            } else {
                personalContainer.innerHTML = "<p style='color: orange;'>এই আইডি দিয়ে কোনো ফলাফল খুঁজে পাওয়া যায়নি।</p>";
            }
        })
        .catch(error => {
            console.error("Error loading personal data:", error);
            personalContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
        });
}