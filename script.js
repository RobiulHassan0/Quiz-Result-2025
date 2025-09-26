const quizContainer = document.getElementById('quiz');

function renderQuiz(quizData) {
    quizData.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'question-card';

        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.innerHTML = `প্রশ্ন ${q.questionNumber}`;
        
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        // questionText.innerHTML = `${q.questionNumber}️1️⃣ ${q.questionText}`;
        questionText.innerHTML = `🌙 <strong>${q.questionText}</strong>`;

        card.appendChild(questionNumber);
        card.appendChild(questionText);

        const optionsList = document.createElement('ul');
        optionsList.className = 'options-list';

        // q.options.forEach(option => {
        //     const optionItem = document.createElement('li');
        //     optionItem.className = 'option-item';
        //     optionItem.textContent = option;
            
        //     if (option === q.correctAnswer) {
        //         optionItem.classList.add('correct');
        //     }

        //     optionsList.appendChild(optionItem);
        // });
        q.options.forEach(option => {
            const optionItem = document.createElement('li');
            optionItem.className = 'option-item';
            optionItem.textContent = option;
    
            // একাধিক সঠিক উত্তর সাপোর্ট করতে নিচের অংশে চেক করো:
            if (Array.isArray(q.correctAnswer)) {
                if (q.correctAnswer.includes(option)) {
                    optionItem.classList.add('correct');
                }
            } else if (option === q.correctAnswer) {
                optionItem.classList.add('correct');
            }

            optionsList.appendChild(optionItem);
        });



        card.appendChild(optionsList);

        const explanation = document.createElement('div');
        explanation.className = 'explanation';
        explanation.innerHTML = `<strong>ব্যাখ্যা:</strong> ${q.explanation}`;
        card.appendChild(explanation);

        quizContainer.appendChild(card);
    });
}

// JSON ফাইল থেকে ডাটা নিয়ে এসে renderQuiz ফাংশন কল করো
fetch('quizData.json')
    .then(response => response.json())
    .then(data => {
        renderQuiz(data);
    })
    .catch(error => {
        console.error('Error loading the quiz data:', error);
    });
