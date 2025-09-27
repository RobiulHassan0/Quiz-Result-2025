function fetchPersonalResult() {
    // ইনপুট ফিল্ড থেকে ব্যবহারকারীর দেওয়া মানটি সংগ্রহ করা
    const participantId = document.getElementById('participantId').value.trim(); 
    const personalContainer = document.getElementById('personal-data-container');

    // ... (পূর্বের আইডি এবং কনফিগারেশন চেকিং কোড অপরিবর্তিত থাকবে)
    if (!participantId || typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined') {
        personalContainer.innerHTML = '<p style="color: orange;">অনুগ্রহ করে আপনার নাম বা ফোন নম্বর প্রবেশ করুন এবং কনফিগারেশন চেক করুন।</p>';
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
            
            // --- এই অংশটি পরিবর্তন করা হয়েছে ---
            
            // গুগল শিটের কলাম ইনডেক্স (0-ভিত্তিক)
            const nameColumnIndex = 3;   // D কলাম: "আপনার নাম লিখুন"
            const phoneColumnIndex = 5;  // F কলাম: "আপনার ফোন নম্বর"
            
            // ব্যবহারকারীকে নাম বা ফোন নম্বর দিয়ে খুঁজে বের করা
            const userRow = allRows.find((row, index) => {
                // হেডার সারি বাদ দিতে হবে
                if (index === 0) return false; 
                
                // ইনপুট মানটিকে ছোট হাতের অক্ষরে এবং অতিরিক্ত স্পেস বাদ দেওয়া
                const searchId = participantId.toLowerCase();
                
                // ১. নাম কলামে খোঁজা
                const nameMatch = (row[nameColumnIndex] || '').trim().toLowerCase() === searchId;
                
                // ২. ফোন নম্বর কলামে খোঁজা (ফোন নম্বরে স্পেস বা হাইফেন থাকলে তা বাদ দিতে হবে)
                const phoneMatch = (row[phoneColumnIndex] || '').replace(/[^0-9]/g, '').trim() === participantId.replace(/[^0-9]/g, '').trim(); 
                
                return nameMatch || phoneMatch; // নাম অথবা ফোন নম্বরের যেকোনো একটির সাথে মিললে হবে
            });

            // --- পরিবর্তন শেষ ---
            
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
                personalContainer.innerHTML = "<p style='color: orange;'>এই নাম বা ফোন নম্বর দিয়ে কোনো ফলাফল খুঁজে পাওয়া যায়নি।</p>";
            }
        })
        .catch(error => {
            console.error("Error loading personal data:", error);
            personalContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে API সেটিং চেক করুন: ${error.message}</p>`;
        });
}