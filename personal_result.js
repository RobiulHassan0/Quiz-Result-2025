// কুইজের ডেটা গ্লোবাল স্কোপে সংরক্ষণ করার জন্য
let quizData = null;

/**
 * স্ট্রিংকে চূড়ান্তভাবে পরিষ্কার (Clean) করার সহায়ক ফাংশন।
 * এটি সকল প্রকার হোয়াইটস্পেস, নিয়ন্ত্রণ ক্যারেক্টার (control characters), 
 * এবং শূন্য-প্রস্থের স্থান (zero-width space) অপসারণ করে।
 * নতুন সংযোজন: str.normalize("NFC") ব্যবহার, যা বাংলার মতো ভাষার জন্য এনকোডিং সমস্যার সমাধান করে।
 */
function cleanStringStrict(str) {
    if (typeof str !== 'string') return '';
    
    // 1. স্ট্রিং normalization: এনকোডিং-এর পার্থক্য দূর করে
    let cleaned = str.normalize("NFC"); 

    // 2. সকল নিয়ন্ত্রণ ক্যারেক্টার (Control characters) অপসারণ
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); 
    
    // 3. সকল প্রকার হোয়াইটস্পেস (স্পেস, ট্যাব, নতুন লাইন, ইত্যাদি) অপসারণ
    cleaned = cleaned.replace(/\s/g, ''); 
    
    // 4. Zero Width Space (ZWSP) ক্যারেক্টার অপসারণ 
    cleaned = cleaned.replace(/[\uFEFF\u200B]/g, '');
    
    // 5. Trim করে এবং লোয়ারকেস (যদি সব ক্যারেক্টার ASCII হয়)
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

    // URL তৈরি
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

            const headerRow = rows[0];
            const cleanParticipantId = cleanStringStrict(participantId);

            // আইডি ম্যাচিং: কলাম A (ইমেইল - সূচক 1) অথবা কলাম B (ফোন/আইডি - সূচক 3)
            // আপনার Google Sheet এ যদি ইমেইল কলাম সূচক 1 এবং ফোন/আইডি কলাম সূচক 3 এ থাকে।
            const participantData = rows.slice(1).find(row => {
                const email = row[1] ? cleanStringStrict(row[1]) : ''; // C2 বা সূচক 1 (টাইমস্ট্যাম্প 0)
                const phoneOrId = row[3] ? cleanStringStrict(row[3]) : ''; // D2 বা সূচক 3
                return email === cleanParticipantId || phoneOrId === cleanParticipantId;
            });

            if (participantData) {
                const infoKeys = [
                    { index: 1, label: "ইমেইল" },
                    { index: 3, label: "ফোন নম্বর/আইডি" },
                    { index: 4, label: "নাম" },
                    { index: 5, label: "শিক্ষা প্রতিষ্ঠান" },
                    { index: 2, label: "প্রাপ্ত স্কোর" } // স্কোর সূচক 2
                ];

                let personalInfoHTML = '';
                infoKeys.forEach(item => {
                    personalInfoHTML += `<li><strong>${item.label}:</strong> ${participantData[item.index] || 'নেই'}</li>`;
                });

                let questionsHTML = '';
                
                // 6 নম্বর সূচক থেকে প্রশ্ন শুরু (0-ভিত্তিক সূচক)
                // আপনার শিটে ৬,৭,৮... ইনডেক্সে প্রশ্নগুলোর উত্তর রয়েছে।
                participantData.forEach((cellValue, index) => {
                    // প্রশ্নগুলো 6 নম্বর কলাম থেকে শুরু
                    if (index >= 6) { 
                        
                        const questionIndex = index - 6; // quizData.questions-এর জন্য 0-ভিত্তিক সূচক
                        const q = quizData.questions[questionIndex];
                        
                        if (q) {
                            const userAnswer = (cellValue || '').trim();
                            let optionsListHTML = '';

                            // কুইজ ডেটা থেকে সঠিক উত্তরগুলো আনুন
                            const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                            
                            // ***Cleaned স্ট্রিং ম্যাচিং***
                            const cleanedUserAnswer = cleanStringStrict(userAnswer);
                            const cleanedCorrectAnswers = correctAnswers.map(ans => cleanStringStrict(ans));
                            
                            // উত্তর সঠিক কি না চেক করা
                            const isUserAnswerCorrect = cleanedCorrectAnswers.includes(cleanedUserAnswer);
                            
                            // কার্ডের রং নির্ধারণের জন্য
                            const resultClass = isUserAnswerCorrect ? 'correct-user-section' : 'incorrect-user-section';
                            
                            // অতিরিক্ত তথ্য এবং বার্তা তৈরি
                            let specialMessageHTML = '';
                            let userResultIcon = isUserAnswerCorrect ? ' ✅ (সঠিক উত্তর)' : ' ❌ (ভুল উত্তর)';
                            
                            if (!isUserAnswerCorrect) {
                                // যদি উত্তর ভুল হয়: সঠিক উত্তরটি specialMessageHTML-এ যোগ হবে।
                                if (correctAnswers.length > 1) {
                                    specialMessageHTML = `
                                        <p class="special-note">
                                            আপনি একটি উত্তর দিয়েছেন। দুটি অপশনই সঠিক ছিল। 
                                            একটি সিলেক্ট করে আরেকটিকে বাদ দিলে ধরে নেওয়া হয় বাকি সঠিক উত্তরটিকেও আপনি ভুল ভেবেছেন।
                                        </p>
                                    `;
                                }
                                // সঠিক উত্তর শুধুমাত্র ভুল হলেই দেখানো হবে
                                specialMessageHTML += `<p><strong>সঠিক উত্তর ছিল:</strong> <span class="correct-response-highlight">${correctAnswers.join(" / ")}</span></p>`;
                            }
                            
                            // অপশন লিস্ট তৈরি
                            q.options.forEach(option => {
                                let optionClass = '';
                                
                                const cleanedOption = cleanStringStrict(option);
                                const isCorrect = cleanedCorrectAnswers.includes(cleanedOption);
                                const isUserSelection = (cleanedUserAnswer === cleanedOption); // ব্যবহারকারী এই অপশনটি সিলেক্ট করেছে কি না

                                // **<< সংশোধিত লজিক: শুধুমাত্র ভুল হলে সঠিক উত্তর হাইলাইট হবে >>**
                                if (!isUserAnswerCorrect && isCorrect) { 
                                    optionClass += ' correct'; 
                                }

                                // ব্যবহারকারীর সিলেক্ট করা অপশনটি হাইলাইট হবে
                                if (isUserSelection) {
                                    optionClass += ' selected';
                                }

                                // CSS দিয়ে টিক চিহ্ন দেখানোর জন্য tickIcon খালি রাখা হলো
                                const tickIcon = ''; 

                                optionsListHTML += `
                                    <li class="option-item ${optionClass}">
                                        ${option} ${tickIcon}
                                    </li>
                                `;
                            });
                            
                            // প্রশ্ন কার্ডের HTML তৈরি
                            questionsHTML += `
                                <div class="question-card ${resultClass}">
                                    <div class="question-number">প্রশ্ন ${q.questionNumber}</div>
                                    <div class="question-text"><strong>${q.questionText}</strong></div>
                                    
                                    <ul class="options-list">
                                        ${optionsListHTML}
                                    </ul>

                                    <div class="explanation">
                                        <div class="user-response-section">
                                            <p class="user-answer-text">
                                                <strong>আপনার উত্তর:</strong> <span class="user-response-highlight">${userAnswer || 'উত্তর দেননি'}</span> 
                                                ${userResultIcon}
                                            </p>
                                            ${specialMessageHTML}
                                        </div>
                                        <div class="explanation-details">
                                            <p><strong>ব্যাখ্যা:</strong> ${q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                });

                // চূড়ান্ত HTML তৈরি (অপরিবর্তিত)
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

// লোড হওয়ার পর কিছু করার প্রয়োজন হলে এখানে যোগ করতে পারেন
// document.addEventListener('DOMContentLoaded', () => {
//     // 
// });