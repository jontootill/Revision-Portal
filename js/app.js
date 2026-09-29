// Global variable to hold the fetched curriculum
window.CURRICULUM = window.CURRICULUM || null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    await loadCurriculumData();
    setupEventListeners();
});

// 1. Fetch the master curriculum file
async function loadCurriculumData() {
    try {
        const response = await fetch("./data/curriculum.json");
        if (!response.ok) throw new Error("Failed to fetch curriculum data");
        window.CURRICULUM = await response.json();
    } catch (error) {
        console.error("Error loading curriculum.json:", error);
    }
}

// 2. Event Listeners for Dropdown Changes
function setupEventListeners() {
    const subjectSelect = document.getElementById("subjectSelect");
    const topicSelect = document.getElementById("topicSelect");

    if (subjectSelect) {
        subjectSelect.addEventListener("change", (e) => {
            populateTopicDropdown(e.target.value);
        });
    }

    if (topicSelect) {
        topicSelect.addEventListener("change", (e) => {
            populateSubtopicDropdown(e.target.value);
        });
    }
}

// Helper to safely convert object/array topics/subtopics
function getListFromCurriculum(key) {
    if (!window.CURRICULUM || !window.CURRICULUM[key]) return [];
    const data = window.CURRICULUM[key];
    if (Array.isArray(data)) return data;
    if (typeof data === "object") {
        return Object.entries(data).map(([id, item]) => ({ id, ...item }));
    }
    return [];
}

// 3. Populate Topics based on Selected Subject & User's Year
function populateTopicDropdown(subjectId) {
    const topicSelect = document.getElementById("topicSelect");
    const subtopicSelect = document.getElementById("subtopicSelect");

    if (!topicSelect || !window.CURRICULUM) return;

    // Reset subtopic dropdown
    if (subtopicSelect) {
        subtopicSelect.innerHTML = `<option value="all">All Subtopics</option>`;
        subtopicSelect.disabled = true;
    }

    const profile = JSON.parse(localStorage.getItem("userProfile"));
    if (!profile || !profile.year || !subjectId) {
        topicSelect.disabled = true;
        topicSelect.innerHTML = `<option value="">-- Select Topic --</option>`;
        return;
    }

    const currentYear = Number(profile.year);
    const selectedSubjectId = Number(subjectId);

    topicSelect.innerHTML = `<option value="">-- Select Topic --</option>`;
    let count = 0;

    const topicsList = getListFromCurriculum("topics");

    topicsList.forEach((topic) => {
        if (Number(topic.subjectId) === selectedSubjectId && Number(topic.year) === currentYear) {
            topicSelect.innerHTML += `<option value="${topic.id}">${topic.name}</option>`;
            count++;
        }
    });

    topicSelect.disabled = count === 0;
}

// 4. Populate Subtopics based on Selected Topic
function populateSubtopicDropdown(topicId) {
    const subtopicSelect = document.getElementById("subtopicSelect");
    if (!subtopicSelect || !window.CURRICULUM) return;

    const profile = JSON.parse(localStorage.getItem("userProfile"));
    if (!topicId || !profile || !profile.year) {
        subtopicSelect.disabled = true;
        subtopicSelect.innerHTML = `<option value="all">All Subtopics</option>`;
        return;
    }

    const currentYear = Number(profile.year);
    const selectedTopicId = Number(topicId);

    subtopicSelect.innerHTML = `<option value="all">All Subtopics</option>`;

    const subtopicsList = getListFromCurriculum("subtopics");

    let count = 0;
    subtopicsList.forEach((sub) => {
        if (Number(sub.topicId) === selectedTopicId && Number(sub.year) === currentYear) {
            subtopicSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
            count++;
        }
    });

    subtopicSelect.disabled = count === 0;
}