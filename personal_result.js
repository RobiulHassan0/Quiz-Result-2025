

function fetchPersonalResult() {
    const participantId = document.getElementById('participantId').value.trim();
    const personalContainer = document.getElementById('personal-data-container');

    // ... (পূর্বের আইডি এবং কনফিগারেশন চেকিং কোড অপরিবর্তিত থাকবে)
    if (!participantId || typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined') {
         personalContainer.innerHTML = '<p style="color: orange;">অনুগ্রহ করে আপনার আইডি (ইমেইল) প্রবেশ করুন এবং কনফিগারেশন চেক করুন।</p>';
         return;
    }
    personalContainer.innerHTML = '<p>ফলাফল খোঁজা হচ্ছে...</p>';
    
    // URL তৈরি
    const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const allRows = data.values;
            if (!allRows || allRows.length <= 1) {
                personalContainer.innerHTML = "<p>কোনো ডেটা পাওয়া যায়নি।</p>";
                return;
            }
            
            const header = allRows[0];
            const emailColumnIndex = 1; // B কলামে (ইনডেক্স 1) ইমেইল আছে
            
            // ব্যবহারকারীকে ইমেইল অ্যাড্রেস দিয়ে খুঁজে বের করা
            const userRow = allRows.find((row, index) => {
                return index > 0 && (row[emailColumnIndex] || '').trim().toLowerCase() === participantId.toLowerCase();
            });

            if (userRow) {
                let html = '<h3>আপনার ফলাফল ও উত্তরপত্র 📄</h3><ul class="personal-details-list">';
                
                // সমস্ত কলাম ডেটা দেখাবে
                userRow.forEach((cell, index) => {
                    const headerText = header[index] || 'ডেটা';
                    const cellValue = cell || 'প্রদান করা হয়নি';

                    // টাইমস্ট্যাম্প, স্কোর, নাম, ইমেইল এই প্রথম চারটি কলাম হাইলাইট করবে
                    if (index < 4) { 
                        html += `<li><strong>${headerText}:</strong> <span style="font-weight: 600; color: #0b509d;">${cellValue}</span></li>`;
                    } 
                    // প্রশ্ন ও উত্তরগুলো একটি ভিন্ন ফরমেটে দেখাবে
                    else if (index >= 7) { 
                         html += `<li><strong>${headerText}:</strong> ${cellValue}</li>`;
                    }
                });
                html += '</ul>';
                personalContainer.innerHTML = html;
            } else {
                personalContainer.innerHTML = "<p style='color: orange;'>এই ইমেইল অ্যাড্রেস দিয়ে কোনো ফলাফল খুঁজে পাওয়া যায়নি। ইমেইলটি সঠিকভাবে প্রবেশ করিয়েছেন কিনা নিশ্চিত করুন।</p>";
            }
        })
        .catch(error => {
            console.error("Error loading personal data:", error);
            personalContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে API সেটিং ও ইমেইল ঠিক আছে কিনা দেখুন: ${error.message}</p>`;
        });
}