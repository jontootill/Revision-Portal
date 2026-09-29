// Global scope protection against duplicate declarations
if (typeof window.currentQuizQuestions === 'undefined') window.currentQuizQuestions = [];
if (typeof window.currentQuestionIndex === 'undefined') window.currentQuestionIndex = 0;
if (typeof window.isFlipped === 'undefined') window.isFlipped = false;

if (typeof window.sessionStats === 'undefined') {
    window.sessionStats = {
        red: 0,
        yellow: 0,
        green: 0
    };
}

if (typeof window.sessionQuestions === 'undefined') {
    window.sessionQuestions = {
        red: [],
        yellow: [],
        green: []
    };
}

// Map Subject IDs to JSON file paths safely on window
if (typeof window.SUBJECT_FILE_MAP === 'undefined') {
    window.SUBJECT_FILE_MAP = {
        1: 'data/biology.json',
        2: 'data/chemistry.json',
        3: 'data/physics.json'
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    const wrapper = document.querySelector(".quiz-wrapper");

    const urlParams = new URLSearchParams(window.location.search);
    const yearId = parseInt(urlParams.get("year"), 10);
    const subjectId = parseInt(urlParams.get("subject"), 10);
    const topicId = parseInt(urlParams.get("topic"), 10);
    const rawSubtopic = urlParams.get("subtopic");
    const tierId = parseInt(urlParams.get("tier"), 10);

    // Fetch questions from subject JSON
    const questions = await fetchQuestionsBySubject(subjectId);

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        if (wrapper) {
            wrapper.innerHTML = `<h2 style="color:#dc2626; text-align:center; padding: 20px;">Error: Could not load questions for subject ID ${subjectId}.</h2>`;
        }
        return;
    }

    // Strict parameter filtering
    let filtered = questions.filter(q => {
        if (!q) return false;

        const qYear = Number(q.year ?? q.yearId ?? 0);
        const qSub = Number(q.subject ?? q.subjectId ?? 0);
        const qTopic = Number(q.topic ?? q.topicId ?? 0);
        const qSubtopic = Number(q.subtopic ?? q.subtopicId ?? 0);

        let matches = true;

        if (!isNaN(yearId) && yearId > 0) matches = matches && (qYear === yearId);
        if (!isNaN(subjectId) && subjectId > 0) matches = matches && (qSub === subjectId);
        if (!isNaN(topicId) && topicId > 0) matches = matches && (qTopic === topicId);

        if (rawSubtopic && rawSubtopic !== "all" && rawSubtopic !== "0") {
            const subtopicId = parseInt(rawSubtopic, 10);
            if (!isNaN(subtopicId) && subtopicId > 0) {
                matches = matches && (qSubtopic === subtopicId);
            }
        }

        if (yearId >= 4 && tierId > 0 && q.tier && q.tier > 0) {
            if (Number(q.tier) !== tierId) matches = false;
        }

        return matches;
    });

    // Fall back to full array if zero exact matches found
    if (filtered.length === 0) {
        console.warn("No exact filter matches found. Falling back to all loaded subject questions.");
        filtered = questions;
    }

    // Fisher-Yates Shuffle
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    window.currentQuizQuestions = shuffled.slice(0, 10);
    window.currentQuestionIndex = 0;

    displayQuestion();
});

function displayQuestion() {
    const q = window.currentQuizQuestions[window.currentQuestionIndex];
    if (!q) return;

    window.isFlipped = false;

    const card = document.getElementById("flashcard");
    const ratingSection = document.getElementById("ratingSection");

    if (card) card.classList.remove("flipped");
    if (ratingSection) ratingSection.classList.add("hidden");

    const tracker = document.getElementById("questionTracker");
    const qText = document.getElementById("questionText");
    const aText = document.getElementById("answerText");
    const qImg = document.getElementById("answerImage");

    if (tracker) tracker.textContent = `Question ${window.currentQuestionIndex + 1} of ${window.currentQuizQuestions.length}`;
    if (qText) qText.textContent = q.question || q.questionText || "Question unavailable";
    if (aText) aText.textContent = q.answer || q.answerText || "Answer unavailable";

    if (qImg) {
        if (q.image) {
            qImg.src = q.image;
            qImg.style.display = "block";
        } else {
            qImg.src = "";
            qImg.style.display = "none";
        }
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.textContent = (window.currentQuestionIndex === window.currentQuizQuestions.length - 1) ? "Finish Quiz ➔" : "Next Question ➔";
    }
}

function flipCard() {
    const card = document.getElementById("flashcard");
    const ratingSection = document.getElementById("ratingSection");

    window.isFlipped = !window.isFlipped;

    if (window.isFlipped) {
        if (card) card.classList.add("flipped");
        if (ratingSection) ratingSection.classList.remove("hidden");
    } else {
        if (card) card.classList.remove("flipped");
        if (ratingSection) ratingSection.classList.add("hidden");
    }
}

function rateAnswer(rating, event) {
    if (event) event.stopPropagation();

    const currentQ = window.currentQuizQuestions[window.currentQuestionIndex];

    if (window.sessionStats.hasOwnProperty(rating)) {
        window.sessionStats[rating]++;
        window.sessionQuestions[rating].push(currentQ);
    }

    updateAllTimeStats(rating);
    nextQuestion();
}

function nextQuestion(event) {
    if (event) event.stopPropagation();

    window.currentQuestionIndex++;

    if (window.currentQuestionIndex < window.currentQuizQuestions.length) {
        displayQuestion();
    } else {
        showCompletionScreen();
    }
}

function updateAllTimeStats(rating) {
    let allTime = JSON.parse(localStorage.getItem("quiz_all_time_stats")) || { red: 0, yellow: 0, green: 0 };
    if (allTime.hasOwnProperty(rating)) {
        allTime[rating]++;
    }
    localStorage.setItem("quiz_all_time_stats", JSON.stringify(allTime));
}

function showCompletionScreen() {
    const wrapper = document.querySelector(".quiz-wrapper");
    if (!wrapper) return;

    const allTime = JSON.parse(localStorage.getItem("quiz_all_time_stats")) || { red: 0, yellow: 0, green: 0 };

    wrapper.innerHTML = `
        <div style="background: white; padding: 35px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; max-width: 600px; margin: 30px auto;">
            <h2 style="margin-bottom: 5px; color: #1e293b;">🎉 Quiz Complete!</h2>
            <p style="color: #64748b; margin-bottom: 25px;">Click any category below to review those questions:</p>

            <div style="margin-bottom: 25px; padding: 15px; background: #f8fafc; border-radius: 12px;">
                <h3 style="font-size: 0.85rem; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">This Session</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-weight: 600;">
                    <button onclick="toggleReview('green')" style="background: #dcfce7; border: 1px solid #bbf7d0; color: #166534; padding: 12px; border-radius: 10px; cursor: pointer;">
                        🟢 Got it<br><span style="font-size: 1.4rem;">${window.sessionStats.green}</span>
                    </button>
                    <button onclick="toggleReview('yellow')" style="background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 12px; border-radius: 10px; cursor: pointer;">
                        🟡 Needs practice<br><span style="font-size: 1.4rem;">${window.sessionStats.yellow}</span>
                    </button>
                    <button onclick="toggleReview('red')" style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 12px; border-radius: 10px; cursor: pointer;">
                        🔴 Need to relearn<br><span style="font-size: 1.4rem;">${window.sessionStats.red}</span>
                    </button>
                </div>
            </div>

            <div id="reviewContainer" style="text-align: left; margin-bottom: 25px;"></div>

            <div style="margin-bottom: 30px; padding: 15px; background: #f8fafc; border-radius: 12px;">
                <h3 style="font-size: 0.85rem; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">All-Time Totals</h3>
                <div style="display: flex; justify-content: space-around; font-weight: 600;">
                    <div style="color: #166534;">🟢 ${allTime.green}</div>
                    <div style="color: #92400e;">🟡 ${allTime.yellow}</div>
                    <div style="color: #991b1b;">🔴 ${allTime.red}</div>
                </div>
            </div>

            <a href="index.html" style="background-color: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Return to Topics</a>
        </div>
    `;
}

window.toggleReview = function(category) {
    const container = document.getElementById("reviewContainer");
    if (!container) return;

    const list = window.sessionQuestions[category];

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div style="padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; color: #64748b;">
                No questions marked under this rating in this session.
            </div>
        `;
        return;
    }

    let html = `<div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">`;
    
    list.forEach((q, idx) => {
        html += `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">Q${idx + 1}: ${q.question || q.questionText}</div>
                <div style="color: #059669; font-size: 0.95rem;"><strong>Answer:</strong> ${q.answer || q.answerText}</div>
                ${q.image ? `<img src="${q.image}" style="max-width: 100%; margin-top: 8px; border-radius: 6px; display: block;" />` : ''}
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
};

async function fetchQuestionsBySubject(subjectId) {
    const filePath = window.SUBJECT_FILE_MAP[subjectId];

    if (!filePath) {
        console.warn(`No JSON file mapped for subject ID: ${subjectId}`);
        return [];
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.questions)) {
            return data.questions;
        } else {
            console.error(`Unexpected JSON structure in ${filePath}. Expected array or object with 'questions' key.`);
            return [];
        }
    } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
        return [];
    }
}