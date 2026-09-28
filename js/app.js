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
const subtopicSelect = document.getElementById("subtopicSelect");
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
        
        yearSelect.value = userProfile.year || "";
        toggleGcseFields(userProfile.year);
        
        if (userProfile.year >= 4) {
            routeSelect.value = userProfile.route || 1;
            tierSelect.value = userProfile.tier || 1;
        }

        updateHeaderBadge();
        populateSubjectDropdown();
    }
}

// Function to update the subtopic dropdown when a topic is selected
function updateSubtopicDropdown(selectedTopicId) {
    const subtopicDropdown = document.getElementById("subtopicSelect");
    
    if (!subtopicDropdown) return;

    // Reset subtopic dropdown options
    subtopicDropdown.innerHTML = `<option value="0">All Subtopics</option>`;

    // If "All Topics" (0) or no topic is selected, keep it clean
    if (!selectedTopicId || selectedTopicId === 0) return;

    // Filter subtopics using our lookup dictionary
    Object.keys(LOOKUP.subtopicToTopic).forEach(subId => {
        const parentTopicId = LOOKUP.subtopicToTopic[subId];

        if (parentTopicId === parseInt(selectedTopicId, 10)) {
            const subName = LOOKUP.subtopics[subId];
            
            const option = document.createElement("option");
            option.value = subId;
            option.textContent = subName;
            subtopicDropdown.appendChild(option);
        }
    });
}

// Event Listener setup (run after DOM is loaded)
document.addEventListener("DOMContentLoaded", () => {
    const topicDropdown = document.getElementById("topicSelect");

    if (topicDropdown) {
        topicDropdown.addEventListener("change", (event) => {
            const selectedTopicId = event.target.value;
            updateSubtopicDropdown(selectedTopicId);
        });
    }
});

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
    const yearName = LOOKUP.years[userProfile.year] || "Not Set";

    if (userProfile.year >= 4) {
        const routeName = LOOKUP.routes[userProfile.route];
        const tierName = LOOKUP.tiers[userProfile.tier];
        currentProfileDisplay.textContent = `${yearName} • ${routeName} (${tierName})`;
    } else {
        currentProfileDisplay.textContent = yearName;
    }
}

// ==========================================
// 3. CURRICULUM & QUESTION BANK MAPPING
// ==========================================
function populateSubjectDropdown() {
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';

    topicSelect.disabled = true;
    subtopicSelect.disabled = true;
    startQuizBtn.disabled = true;

    if (!userProfile.year) {
        subjectSelect.disabled = true;
        return;
    }

    Object.keys(LOOKUP.subjects).forEach(subjectId => {
        const option = document.createElement("option");
        option.value = subjectId;
        option.textContent = LOOKUP.subjects[subjectId];
        subjectSelect.appendChild(option);
    });

    subjectSelect.disabled = false;
}

function handleSubjectChange() {
    const subjectId = parseInt(subjectSelect.value, 10);

    topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
    subtopicSelect.disabled = true;
    startQuizBtn.disabled = true;

    if (!subjectId || !userProfile.year) {
        topicSelect.disabled = true;
        return;
    }

    let topicIds = [];

    // Check CURRICULUM_MAP first (e.g. key "2_3" for Year 8 Physics)
    const mapKey = `${userProfile.year}_${subjectId}`;
    if (typeof CURRICULUM_MAP !== "undefined" && CURRICULUM_MAP[mapKey]) {
        const mappedEntry = CURRICULUM_MAP[mapKey];
        // Handles both array format [36,37,38,39] and object format { topics: [36,37,38,39] }
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

    if (topicIds.length > 0) {
        topicIds.forEach(topicId => {
            const option = document.createElement("option");
            option.value = topicId;
            option.textContent = LOOKUP.topics[topicId] || `Topic ${topicId}`;
            topicSelect.appendChild(option);
        });
        topicSelect.disabled = false;
    } else {
        topicSelect.innerHTML = '<option value="">-- No topics found --</option>';
        topicSelect.disabled = true;
    }
}

function handleTopicChange() {
    const subjectId = parseInt(subjectSelect.value, 10);
    const topicId = parseInt(topicSelect.value, 10);

    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
    startQuizBtn.disabled = true;

    if (!topicId || !subjectId || !userProfile.year) {
        subtopicSelect.disabled = true;
        return;
    }

    let subtopicIds = [];

    // 1. Get official subtopic IDs for this Year & Subject from CURRICULUM_MAP
    const mapKey = `${userProfile.year}_${subjectId}`;
    if (typeof CURRICULUM_MAP !== "undefined" && CURRICULUM_MAP[mapKey]) {
        subtopicIds = CURRICULUM_MAP[mapKey].subtopics || [];
    }

    // 2. Fallback: Extract unique subtopic IDs from QUESTION_BANK for this topic
    if (subtopicIds.length === 0 && typeof QUESTION_BANK !== "undefined") {
        subtopicIds = [...new Set(
            QUESTION_BANK
                .filter(q => {
                    const qYear = q.year ?? q.yearId ?? q.yearsID;
                    const qSub = q.subject ?? q.subjectId;
                    const qTopic = q.topic ?? q.topicId;
                    return Number(qYear) === Number(userProfile.year) && 
                           Number(qSub) === subjectId && 
                           Number(qTopic) === topicId;
                })
                .map(q => Number(q.subtopic ?? q.subtopicId))
                .filter(Boolean)
        )];
    }

    // Populate dropdown
    if (subtopicIds.length > 0) {
        // Add "All Subtopics" option first
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Subtopics";
        subtopicSelect.appendChild(allOption);

        subtopicIds.forEach(subId => {
            const option = document.createElement("option");
            option.value = subId;
            option.textContent = LOOKUP.subtopics[subId] || `Subtopic ${subId}`;
            subtopicSelect.appendChild(option);
        });

        // Default to "all" and immediately enable the button
        subtopicSelect.value = "all";
        subtopicSelect.disabled = false;
        startQuizBtn.disabled = false;
    } else {
        subtopicSelect.innerHTML = '<option value="">-- No subtopics available --</option>';
        subtopicSelect.disabled = true;
        startQuizBtn.disabled = true;
    }
}

function handleSubtopicChange() {
    // Enable button whenever any option (including "all") has a non-empty value
    const subtopicVal = subtopicSelect.value;
    startQuizBtn.disabled = !subtopicVal;
}

// ==========================================
// 4. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    yearSelect.addEventListener("change", (e) => {
        const selectedYear = parseInt(e.target.value, 10);
        toggleGcseFields(selectedYear);
    });

    saveProfileBtn.addEventListener("click", saveUserProfile);

    subjectSelect.addEventListener("change", handleSubjectChange);
    topicSelect.addEventListener("change", handleTopicChange);
    subtopicSelect.addEventListener("change", handleSubtopicChange);
    
    // Enable button when subtopic changes
    subtopicSelect.addEventListener("change", () => {
    if (subtopicSelect.value) {
        startQuizBtn.disabled = false;
    } else {
        startQuizBtn.disabled = true;
    }
});

    // Attach click listener directly
    if (startQuizBtn) {
        startQuizBtn.addEventListener("click", startQuiz);
    }
}

// ==========================================
// 4. QUIZ GENERATION LOGIC
// ==========================================
function startQuiz() {
    console.log("Start Quiz clicked!");

    const selectedYear = userProfile.year;
    const selectedSubject = parseInt(subjectSelect.value, 10);
    const selectedTopic = parseInt(topicSelect.value, 10);
    const selectedSubtopic = subtopicSelect.value; // Keep as string to preserve "all"

    if (!selectedSubtopic) {
        alert("Please select a subtopic (or 'All Subtopics') first.");
        return;
    }

    const params = new URLSearchParams({
        year: selectedYear,
        subject: selectedSubject,
        topic: selectedTopic || 0,
        subtopic: selectedSubtopic, // Will pass "all" or specific numerical ID (e.g., 401)
        route: userProfile.route || 0,
        tier: userProfile.tier || 0
    });

    // Redirect to quiz page
    window.location.href = `quiz.html?${params.toString()}`;
}