// ==========================================
// APPLICATION STATE
// ==========================================
let userProfile = {
    year: null,   // 1=Y7, 2=Y8, 3=Y9, 4=Y10, 5=Y11
    route: 0,     // 0=KS3, 1=Combined, 2=Triple
    tier: 0       // 0=All Tiers, 1=Foundation, 2=Higher
};

// DOM Elements
const yearSelect = document.getElementById("yearSelect");
const gcseOptions = document.getElementById("gcseOptions");
const routeSelect = document.getElementById("routeSelect");
const tierSelect = document.getElementById("tierSelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const currentProfileDisplay = document.getElementById("currentProfileDisplay");

const subjectSelect = document.getElementById("subjectSelect");
const topicSelect = document.getElementById("topicSelect");
const subtopicSelect = document.getElementById("subtopicSelect") || document.getElementById("subtopic-select");

const startQuizBtn = document.getElementById("startQuizBtn");
const randomiseAllBtn = document.getElementById("randomiseAllBtn");

// ==========================================
// 1. INITIALIZATION & STORAGE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    loadUserProfile();
});

function loadUserProfile() {
    const savedProfile = localStorage.getItem("revisionProfile");

    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
        
        if (yearSelect) yearSelect.value = userProfile.year || "";
        toggleGcseFields(userProfile.year);
        
        if (userProfile.year >= 4) {
            if (routeSelect) routeSelect.value = userProfile.route || 1;
            if (tierSelect) tierSelect.value = userProfile.tier || 1;
        }

        updateHeaderBadge();
        populateSubjectDropdown();
    }
}

function saveUserProfile() {
    const selectedYear = parseInt(yearSelect.value, 10);

    if (!selectedYear) {
        alert("Please select a Year Group.");
        return;
    }

    userProfile.year = selectedYear;

    if (selectedYear >= 4) {
        userProfile.route = parseInt(routeSelect.value, 10) || 1;
        userProfile.tier = parseInt(tierSelect.value, 10) || 1;
    } else {
        userProfile.route = 0;
        userProfile.tier = 0;
    }

    localStorage.setItem("revisionProfile", JSON.stringify(userProfile));
    updateHeaderBadge();
    
    populateSubjectDropdown();
}

// ==========================================
// 2. UI TOGGLES
// ==========================================
function toggleGcseFields(yearId) {
    if (!gcseOptions) return;

    if (yearId >= 4) {
        gcseOptions.classList.remove("hidden");
    } else {
        gcseOptions.classList.add("hidden");
    }
}

function updateHeaderBadge() {
    if (!currentProfileDisplay) return;

    const yearName = (typeof LOOKUP !== "undefined" && LOOKUP.years[userProfile.year]) || "Not Set";

    if (userProfile.year >= 4) {
        const routeName = LOOKUP.routes[userProfile.route] || "";
        const tierName = LOOKUP.tiers[userProfile.tier] || "";
        currentProfileDisplay.textContent = `${yearName} - ${routeName} (${tierName})`;
    } else {
        currentProfileDisplay.textContent = yearName;
    }
}

// ==========================================
// 3. CURRICULUM & QUESTION BANK MAPPING
// ==========================================
function populateSubjectDropdown() {
    if (!subjectSelect) return;

    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    if (topicSelect) {
        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
        topicSelect.disabled = true;
    }
    if (subtopicSelect) {
        subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
        subtopicSelect.disabled = true;
    }
    if (startQuizBtn) startQuizBtn.disabled = true;

    if (!userProfile.year) {
        subjectSelect.disabled = true;
        return;
    }

    if (typeof LOOKUP !== "undefined" && LOOKUP.subjects) {
        Object.keys(LOOKUP.subjects).forEach(subjectId => {
            const option = document.createElement("option");
            option.value = subjectId;
            option.textContent = LOOKUP.subjects[subjectId];
            subjectSelect.appendChild(option);
        });
    }

    subjectSelect.disabled = false;
}

function handleSubjectChange() {
    const subjectId = parseInt(subjectSelect.value, 10);

    if (topicSelect) {
        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
    }
    if (subtopicSelect) {
        subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
        subtopicSelect.disabled = true;
    }
    if (startQuizBtn) startQuizBtn.disabled = true;

    if (!subjectId || !userProfile.year) {
        if (topicSelect) topicSelect.disabled = true;
        return;
    }

    let topicIds = [];

    // Check CURRICULUM_MAP first (e.g. key "2_3" for Year 8 Physics)
    const mapKey = `${userProfile.year}_${subjectId}`;
    if (typeof CURRICULUM_MAP !== "undefined" && CURRICULUM_MAP[mapKey]) {
        const mappedEntry = CURRICULUM_MAP[mapKey];
        topicIds = Array.isArray(mappedEntry) ? mappedEntry : (mappedEntry.topics || []);
    }

    // Fallback: If CURRICULUM_MAP key doesn't exist, extract topic IDs directly from QUESTION_BANK
    if (topicIds.length === 0 && typeof QUESTION_BANK !== "undefined") {
        topicIds = [...new Set(
            QUESTION_BANK
                .filter(q => Number(q.yearId ?? q.year) === Number(userProfile.year) && 
                             Number(q.subjectId ?? q.subject) === subjectId)
                .map(q => Number(q.topicId ?? q.topic))
                .filter(Boolean)
        )];
    }

    if (topicIds.length > 0 && topicSelect) {
        topicIds.forEach(topicId => {
            const option = document.createElement("option");
            option.value = topicId;
            option.textContent = (typeof LOOKUP !== "undefined" && LOOKUP.topics[topicId]) || `Topic ${topicId}`;
            topicSelect.appendChild(option);
        });
        topicSelect.disabled = false;
    } else if (topicSelect) {
        topicSelect.innerHTML = '<option value="">-- No topics found --</option>';
        topicSelect.disabled = true;
    }
}

async function handleTopicChange() {
    const subjectId = parseInt(subjectSelect.value, 10);
    const topicId = parseInt(topicSelect.value, 10);

    if (!subtopicSelect) return;

    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
    if (startQuizBtn) startQuizBtn.disabled = true;

    if (!topicId || !subjectId || !userProfile.year) {
        subtopicSelect.disabled = true;
        return;
    }

    let subtopicIds = [];

    // 1. Check CURRICULUM_MAP first
    const mapKey = `${userProfile.year}_${subjectId}`;
    if (typeof CURRICULUM_MAP !== "undefined" && CURRICULUM_MAP[mapKey]) {
        subtopicIds = CURRICULUM_MAP[mapKey].subtopics || [];
    }

    // 2. Fallback: Fetch subject JSON dynamically to extract available subtopics
    if (subtopicIds.length === 0) {
        const questions = await fetchQuestionsBySubject(subjectId);
        subtopicIds = [...new Set(
            questions
                .filter(q => {
                    const qYear = q.year ?? q.yearId;
                    const qTopic = q.topic ?? q.topicId;
                    return Number(qYear) === Number(userProfile.year) && Number(qTopic) === topicId;
                })
                .map(q => Number(q.subtopic ?? q.subtopicId))
                .filter(Boolean)
        )];
    }

    // Populate dropdown
    if (subtopicIds.length > 0) {
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Subtopics";
        subtopicSelect.appendChild(allOption);

        subtopicIds.forEach(subId => {
            const option = document.createElement("option");
            option.value = subId;
            option.textContent = (typeof LOOKUP !== "undefined" && LOOKUP.subtopics[subId]) || `Subtopic ${subId}`;
            subtopicSelect.appendChild(option);
        });

        subtopicSelect.value = "all";
        subtopicSelect.disabled = false;
        if (startQuizBtn) startQuizBtn.disabled = false;
    } else {
        subtopicSelect.innerHTML = '<option value="">-- No subtopics available --</option>';
        subtopicSelect.disabled = true;
        if (startQuizBtn) startQuizBtn.disabled = true;
    }
}

function handleSubtopicChange() {
    const subtopicVal = subtopicSelect ? subtopicSelect.value : "";
    if (startQuizBtn) {
        startQuizBtn.disabled = !subtopicVal;
    }
}

// ==========================================
// 4. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    if (yearSelect) {
        yearSelect.addEventListener("change", (e) => {
            const selectedYear = parseInt(e.target.value, 10);
            toggleGcseFields(selectedYear);
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", saveUserProfile);
    }

    if (subjectSelect) {
        subjectSelect.addEventListener("change", handleSubjectChange);
    }
    if (topicSelect) {
        topicSelect.addEventListener("change", handleTopicChange);
    }
    if (subtopicSelect) {
        subtopicSelect.addEventListener("change", handleSubtopicChange);
    }

    if (startQuizBtn) {
        startQuizBtn.addEventListener("click", startQuiz);
    }
}

// ==========================================
// 5. QUIZ GENERATION LOGIC
// ==========================================
function startQuiz() {
    console.log("Start Quiz clicked!");

    const selectedYear = userProfile.year;
    const selectedSubject = parseInt(subjectSelect.value, 10);
    const selectedTopic = parseInt(topicSelect.value, 10);
    const selectedSubtopic = subtopicSelect ? subtopicSelect.value : "";

    if (!selectedSubtopic) {
        alert("Please select a subtopic (or 'All Subtopics') first.");
        return;
    }

    const params = new URLSearchParams({
        year: selectedYear,
        subject: selectedSubject,
        topic: selectedTopic || 0,
        subtopic: selectedSubtopic, // Passes "all" or numerical ID
        route: userProfile.route || 0,
        tier: userProfile.tier || 0
    });

    // Redirect to quiz page
    window.location.href = `quiz.html?${params.toString()}`;
}

// Map Subject IDs to JSON file paths
const SUBJECT_FILE_MAP = {
    1: 'data/biology.json',
    2: 'data/chemistry.json',
    3: 'data/physics.json'
};

/**
 * Fetches questions for a specific subject ID.
 * @param {number} subjectId 
 * @returns {Promise<Array>} Array of question objects
 */
async function fetchQuestionsBySubject(subjectId) {
    const filePath = SUBJECT_FILE_MAP[subjectId];

    if (!filePath) {
        console.warn(`No JSON file mapped for subject ID: ${subjectId}`);
        return [];
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
        return [];
    }
}