// কুইজের ডেটা গ্লোবাল স্কোপে সংরক্ষণ করার জন্য
let quizData = null;

// কুইজ ডেটা একবার লোড করার ফাংশন
function loadQuizData() {
    return fetch('quizData.json')
        .then(response => response.json())
        .then(data => {
            quizData = data;
            console.log("Quiz Data loaded successfully.");
        })
        .catch(error => {
            console.error('Error loading the quiz data:', error);
        });
}

// লোড হওয়ার সাথে সাথেই ডেটা লোড করা শুরু
loadQuizData();


function fetchPersonalResult() {
    // কাস্টম হেডার ম্যাপিং
    const headerMap = {
        "Timestamp": "উত্তর জমা দেওয়ার সময়",
        "Email Address": "ইমেইল অ্যাড্রেস",
        "Score": "প্রাপ্ত স্কোর",
        "আপনার নাম লিখুন": "আপনার নাম",
        "আপনার শিক্ষাপ্রতিষ্ঠানের নাম": "শিক্ষাপ্রতিষ্ঠানের নাম",
        "আপনার সচল ফোন নাম্বার": "মোবাইল নাম্বার"
    };

    const participantId = document.getElementById('participantId').value.trim(); 
    const personalContainer = document.getElementById('personal-data-container');

    if (!participantId || typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined' || !quizData) {
        const msg = !quizData ? 'ফলাফলের ডেটা লোড হচ্ছে, অনুগ্রহ করে আবার চেষ্টা করুন।' : 'অনুগ্রহ করে আপনার নাম বা ফোন নম্বর প্রবেশ করুন এবং কনফিগারেশন চেক করুন।';
        personalContainer.innerHTML = `<p style="color: orange;">${msg}</p>`;
        return;
    }

    personalContainer.innerHTML = '<p>ফলাফল খোঁজা হচ্ছে...</p>';
    
    // Google Sheets API এর URL
    const encodedRange = encodeURIComponent(SHEET_NAME) + '!' + API_RANGE;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                if (response.status === 403) {
                     throw new Error(`HTTP Error! Status: 403. অনুগ্রহ করে আপনার API Key কনফিগারেশন ও Google Sheet-এর শেয়ারিং সেটিংস চেক করুন।`);
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
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
            const nameColumnIndex = 3;
            const phoneColumnIndex = 5; 
            
            // ব্যবহারকারীকে খুঁজে বের করা
            const userRow = allRows.find((row, index) => {
                if (index === 0) return false; 
                const searchId = participantId.toLowerCase().replace(/\s/g, ''); 
                const nameMatch = (row[nameColumnIndex] || '').trim().toLowerCase().replace(/\s/g, '') === searchId;
                const phoneMatch = (row[phoneColumnIndex] || '').replace(/[^0-9]/g, '').trim() === participantId.replace(/[^0-9]/g, '').trim(); 
                return nameMatch || phoneMatch; 
            });

            
            if (userRow) {
                let personalInfoHTML = '';
                let questionsHTML = '';
                
                // ডেটা এবং প্রশ্নগুলোকে আলাদা করা
                userRow.forEach((cell, index) => {
                    const sheetHeaderText = header[index] || 'ডেটা';
                    const displayHeaderText = headerMap[sheetHeaderText] || sheetHeaderText; 
                    const cellValue = cell || 'প্রদান করা হয়নি';
                    
                    // ব্যক্তিগত তথ্য (A থেকে F কলাম)
                    if (index <= 5) { 
                        let valueClass = '';
                        if (index === 2 || index === 3) { 
                            valueClass = 'highlight-value'; 
                        }
                        personalInfoHTML += `<li><strong>${displayHeaderText}:</strong> <span class="${valueClass}">${cellValue}</span></li>`;
                    } 
                    
                    // প্রশ্ন-উত্তর (G কলাম বা ইনডেক্স 6 থেকে)
                    else if (index >= 6) { 
                        
                        const questionIndex = index - 6;
                        const q = quizData.questions[questionIndex];
                        
                        if (q) {
                            const userAnswer = (cellValue || '').trim();
                            let optionsListHTML = '';

                            // কুইজের সঠিক উত্তরগুলি array আকারে
                            const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            
                            // ব্যবহারকারীর উত্তরটি কি সঠিক?
                            const isUserAnswerCorrect = correctAnswers.includes(userAnswer);
                            
                            // কার্ডের রং নির্ধারণের জন্য
                            const resultClass = isUserAnswerCorrect ? 'correct-user-section' : 'incorrect-user-section';
                            
                            // একাধিক সঠিক উত্তরের ক্ষেত্রে বিশেষ বার্তা
                            let specialMessageHTML = '';
                            if (!isUserAnswerCorrect && correctAnswers.length > 1) {
                                // যদি উত্তর ভুল হয় এবং একাধিক সঠিক উত্তর থাকে
                                specialMessageHTML = `
                                    <p class="special-note">
                                        আপনি একটি উত্তর দিয়েছেন। দুটি অপশনই সঠিক ছিল। 
                                        একটি সিলেক্ট করে আরেকটিকে বাদ দিলে ধরে নেওয়া হয় বাকি সঠিক উত্তরটিকেও আপনি ভুল ভেবেছেন।
                                    </p>
                                    <p><strong>সঠিক উত্তর ছিল:</strong> <span class="correct-response-highlight">${correctAnswers.join(" / ")}</span></p>
                                `;
                            } else if (!isUserAnswerCorrect) {
                                // যদি উত্তর ভুল হয় এবং একটি সঠিক উত্তর থাকে
                                specialMessageHTML = `<p><strong>সঠিক উত্তর ছিল:</strong> <span class="correct-response-highlight">${correctAnswers.join(" / ")}</span></p>`;
                            }
                            
                            // অপশন লিস্ট তৈরি
                            q.options.forEach(option => {
                                let optionClass = '';
                                
                                // কুইজের সঠিক উত্তর
                                const isCorrect = correctAnswers.includes(option);
                                
                                // ক্লাসিফিকেশন
                                if (isCorrect) {
                                    optionClass += ' correct'; // হোম পেজের মতো সবুজ হাইলাইট
                                }

                                const tickIcon = isCorrect ? '✅' : ''; // শুধুমাত্র সঠিক উত্তরে টিক চিহ্ন থাকবে

                                optionsListHTML += `
                                    <li class="option-item ${optionClass}">
                                        ${option} ${tickIcon}
                                    </li>
                                `;
                            });
                            
                            // প্রশ্ন কার্ডের HTML তৈরি 
                            questionsHTML += `
                                <div class="question-card">
                                    <div class="question-number">প্রশ্ন ${q.questionNumber}</div>
                                    <div class="question-text">🌙 <strong>${q.questionText}</strong></div>
                                    <ul class="options-list">
                                        ${optionsListHTML}
                                    </ul>
                                    
                                    <div class="explanation-section ${resultClass}">
                                        <div class="explanation-content">
                                            <p>
                                                <strong>আপনার উত্তর:</strong> <span class="user-response-highlight">${userAnswer}</span>
                                                ${isUserAnswerCorrect ? ' ✅' : ' ❌'}
                                            </p>
                                            ${specialMessageHTML}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                });

                // চূড়ান্ত HTML তৈরি
                let finalHTML = `
                    <div class="info-card">
                        <h3>👤 আপনার ব্যক্তিগত তথ্য ও ফলাফল</h3>
                        <ul class="personal-details-list">
                            ${personalInfoHTML}
                        </ul>
                    </div>
                    
                    <h3>✅ আপনার উত্তরপত্র</h3>
                    <div class="quiz-container">
                        ${questionsHTML}
                    </div>
                `;

                personalContainer.innerHTML = finalHTML;
            } else {
                personalContainer.innerHTML = "<p style='color: orange;'>এই নাম বা ফোন নম্বর দিয়ে কোনো ফলাফল খুঁজে পাওয়া যায়নি।</p>";
            }
        })
        .catch(error => {
            console.error("Error loading personal data:", error);
            personalContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে API সেটিং চেক করুন: ${error.message}</p>`;
        });
}