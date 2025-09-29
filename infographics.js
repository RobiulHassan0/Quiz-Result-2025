function renderInfographics(quizData, sheetData) {
    const container = document.getElementById("infographics-container");
    container.innerHTML = "";

    const rows = sheetData.values;
    const startIndex = 6; // উত্তর শুরু হওয়া index

    quizData.questions.forEach((q, qIndex) => {
        let counts = {}, total = 0, correctCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const raw = rows[i][startIndex + qIndex];
            if (!raw) continue;
            total++;
            const answers = raw.split(/[,;|]/).map(a => a.trim());
            answers.forEach(a => counts[a] = (counts[a] || 0) + 1);

            const normUser = answers.map(a => a.toLowerCase());
            const normCorrect = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(a => a.toLowerCase());
            if (normCorrect.every(c => normUser.includes(c)) && normUser.length === normCorrect.length) {
                correctCount++;
            }
        }

        const labels = q.options;
        const data = labels.map(l => counts[l] || 0);
        const percents = data.map(v => total ? ((v/total)*100).toFixed(1) : "0");

        const card = document.createElement("div");
        card.className = "infographic-card";
        card.innerHTML = `
            <h3>প্রশ্ন ${q.questionNumber}: ${q.question}</h3>
            <canvas id="chart-${qIndex}"></canvas>
            <div class="stats-footer">
                <span class="correct">সঠিক: ${correctCount} (${((correctCount/total)*100).toFixed(1)}%)</span>
                <span class="total">মোট: ${total} জন</span>
            </div>
        `;
        container.appendChild(card);

        new Chart(document.getElementById(`chart-${qIndex}`), {
            type: "bar",
            data: {
                labels: labels.map((l, i) => `${l} (${percents[i]}%)`),
                datasets: [{
                    label: "উত্তরের সংখ্যা",
                    data: data,
                    backgroundColor: ["#1a73e8","#0b509d","#36b9cc","#f6c23e","#e74a3b"]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.raw} জন (${percents[ctx.dataIndex]}%)`
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    });
}
