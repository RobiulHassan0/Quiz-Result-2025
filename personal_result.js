// কুইজের ডেটা গ্লোবাল স্কোপে সংরক্ষণ করার জন্য
let quizData = null;

/**
 * স্ট্রিংকে চূড়ান্তভাবে পরিষ্কার (Clean) করার সহায়ক ফাংশন।
 */
function cleanStringStrict(str) {
    if (typeof str !== 'string') return '';
    let cleaned = str.normalize("NFC");
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); 
    cleaned = cleaned.replace(/\s/g, ''); 
    cleaned = cleaned.replace(/[\uFEFF\u200B]/g, '');
    return cleaned.trim(); 
}

// কুইজ ডেটা একবার লোড করো
fetch('quizData.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}. quizData.json লোড করতে সমস্যা হয়েছে।`);
        }
        return response.json();
    })
    .then(data => {
        quizData = data;
        console.log("Quiz data loaded successfully.");
    })
    .catch(error => {
        console.error("Error loading quiz data:", error);
    });

// ব্যক্তিগত ফলাফল লোড করার প্রধান ফাংশন
function fetchPersonalResult() {
    const personalContainer = document.getElementById('personal-data-container');
    const participantId = document.getElementById('participantId').value.trim();

    if (!participantId) {
        personalContainer.innerHTML = "<p style='color: red;'>অনুগ্রহ করে আপনার আইডি (ইমেইল/ফোন নম্বর) প্রবেশ করুন।</p>";
        return;
    }
    
    if (!quizData) {
        personalContainer.innerHTML = "<p style='color: orange;'>কুইজের ডেটা এখনও লোড হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।</p>";
        return;
    }

    if (typeof SHEET_ID === 'undefined' || typeof API_KEY === 'undefined' || typeof SHEET_NAME === 'undefined') {
        personalContainer.innerHTML = '<p style="color:red;">Error: API Configuration (config.js) is missing or incorrectly loaded.</p>';
        return;
    }

    personalContainer.innerHTML = '<p>ফলাফল খোঁজা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>';

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
                personalContainer.innerHTML = "<p>শিটে কোনো ডেটা পাওয়া যায়নি।</p>";
                return;
            }

            const cleanParticipantId = cleanStringStrict(participantId);

            const participantData = rows.slice(1).find(row => {
                const email = row[1] ? cleanStringStrict(row[1]) : '';
                const phoneOrId = row[3] ? cleanStringStrict(row[3]) : '';
                return email === cleanParticipantId || phoneOrId === cleanParticipantId;
            });

            if (participantData) {
                const infoKeys = [
                    { index: 1, label: "ইমেইল" },
                    { index: 3, label: "ফোন নম্বর/আইডি" },
                    { index: 4, label: "নাম" },
                    { index: 5, label: "শিক্ষা প্রতিষ্ঠান" },
                    { index: 2, label: "প্রাপ্ত স্কোর" }
                ];

                let personalInfoHTML = '';
                infoKeys.forEach(item => {
                    personalInfoHTML += `<li><strong>${item.label}:</strong> ${participantData[item.index] || 'নেই'}</li>`;
                });

                let questionsHTML = '';
                
                participantData.forEach((cellValue, index) => {
                    if (index >= 6) { 
                        const questionIndex = index - 6;
                        const q = quizData.questions[questionIndex];
                        
                        if (q) {
                            const userAnswer = (cellValue || '').trim();
                            const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            
                            const cleanedUserAnswer = cleanStringStrict(userAnswer);
                            const cleanedCorrectAnswers = correctAnswers.map(ans => cleanStringStrict(ans));
                            
                            const isUserAnswerCorrect = cleanedCorrectAnswers.includes(cleanedUserAnswer);

                            let optionsListHTML = '';
                            q.options.forEach(option => {
                                const cleanedOption = cleanStringStrict(option);
                                const isCorrect = cleanedCorrectAnswers.includes(cleanedOption);
                                const isUserSelection = (cleanedUserAnswer === cleanedOption);

                                let optionClass = '';
                                if (isCorrect) optionClass += ' correct'; // সবসময় সঠিক হাইলাইট
                                if (isUserSelection) optionClass += ' selected';

                                optionsListHTML += `
                                    <li class="option-item ${optionClass}">
                                        ${option}
                                    </li>
                                `;
                            });

                            // ইউজারের উত্তর কার্ড UI (ব্যাখ্যার মতো)
                            let userAnswerCard = '';
                            if (isUserAnswerCorrect) {
                                userAnswerCard = `
                                    <div class="user-answer-card correct-answer-card">
                                        <p><strong>আপনার উত্তর:</strong> ${userAnswer} ✅</p>
                                    </div>
                                `;
                            } else {
                                userAnswerCard = `
                                    <div class="user-answer-card incorrect-answer-card">
                                        <p><strong>আপনার উত্তর:</strong> ${userAnswer || 'উত্তর দেননি'} ❌</p>
                                        <p><strong>সঠিক উত্তর ছিল:</strong> <span class="correct-response-highlight">${correctAnswers.join(" / ")}</span></p>
                                    </div>
                                `;
                            }

                            questionsHTML += `
                                <div class="question-card">
                                    <div class="question-number">প্রশ্ন ${q.questionNumber}</div>
                                    <div class="question-text"><strong>${q.questionText}</strong></div>
                                    
                                    <ul class="options-list">
                                        ${optionsListHTML}
                                    </ul>

                                    ${userAnswerCard}
                                </div>
                            `;
                        }
                    }
                });

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
                personalContainer.innerHTML = `<p style='color: orange;'>এই আইডি (<strong>${participantId}</strong>) দিয়ে কোনো ফলাফল খুঁজে পাওয়া যায়নি।</p>`;
            }
        })
        .catch(error => {
            console.error("Error loading personal data:", error);
            personalContainer.innerHTML = `<p style="color: red;">ফলাফল লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে API সেটিং চেক করুন: ${error.message}</p>`;
        });
}
