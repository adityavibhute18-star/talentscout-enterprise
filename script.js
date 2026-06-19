let candidates = [
    { id: 1, name: "Aditya Vibhute", email: "adityavibhute28@gmail.com", role: "Python Developer Intern", skills: [], score: 0, status: "review" },
    { id: 2, name: "Rahul Sharma", email: "rahul.sharma@outlook.com", role: "Data Analyst", skills: [], score: 0, status: "review" },
];

const UPLOAD_GATEWAY_URL = "https://lhit5uvbrv2lm4ziwzsvhxxnbm0bbodj.lambda-url.us-east-1.on.aws/";
const MAX_RETRIES = 25;
const POLL_INTERVAL_MS = 5000;

const KNOWN_RESUMES = [
    "Aditya_Vibhute.pdf",
    "Rahul_Sharma.pdf",
    "Ramesh_Kumar.pdf",
    "Sneha_Reddy.pdf",
    "Rohit_Shamra.pdf"
];

// ============================================================
// TAB SWITCHING
// ============================================================
function showTab(tab) {
    if (tab === 'candidates') {
        document.getElementById('viewCandidates').classList.remove('d-none');
        document.getElementById('viewAnalytics').classList.add('d-none');
        document.getElementById('tabCandidates').classList.add('active', 'btn-outline-info');
        document.getElementById('tabCandidates').classList.remove('btn-outline-secondary');
        document.getElementById('tabAnalytics').classList.remove('active', 'btn-outline-info');
        document.getElementById('tabAnalytics').classList.add('btn-outline-secondary');
    } else {
        document.getElementById('viewCandidates').classList.add('d-none');
        document.getElementById('viewAnalytics').classList.remove('d-none');
        document.getElementById('tabAnalytics').classList.add('active', 'btn-outline-info');
        document.getElementById('tabAnalytics').classList.remove('btn-outline-secondary');
        document.getElementById('tabCandidates').classList.remove('active', 'btn-outline-info');
        document.getElementById('tabCandidates').classList.add('btn-outline-secondary');
        renderAnalytics();
    }
}

// ============================================================
// ANALYTICS
// ============================================================
let chartStatus = null, chartRoles = null, chartSkills = null, chartScores = null;

function renderAnalytics() {
    const loaded = candidates.filter(c => c.score > 0);
    const shortlisted = loaded.filter(c => c.status.toLowerCase() === 'shortlisted').length;
    const review = loaded.filter(c => c.status.toLowerCase() !== 'shortlisted').length;
    const avgScore = loaded.length ? Math.round(loaded.reduce((a, b) => a + b.score, 0) / loaded.length) : 0;

    document.getElementById('statTotal').innerText = loaded.length;
    document.getElementById('statShortlisted').innerText = shortlisted;
    document.getElementById('statReview').innerText = review;
    document.getElementById('statAvgScore').innerText = avgScore + '%';

    // Status Pie Chart
    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: {
            labels: ['Shortlisted', 'Under Review'],
            datasets: [{ data: [shortlisted, review], backgroundColor: ['#4ade80', '#fbbf24'], borderWidth: 0 }]
        },
        options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
    });

    // Role Bar Chart
    const roleCounts = {};
    loaded.forEach(c => { roleCounts[c.role] = (roleCounts[c.role] || 0) + 1; });
    if (chartRoles) chartRoles.destroy();
    chartRoles = new Chart(document.getElementById('chartRoles'), {
        type: 'bar',
        data: {
            labels: Object.keys(roleCounts),
            datasets: [{ label: 'Candidates', data: Object.values(roleCounts), backgroundColor: '#38bdf8', borderRadius: 6 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } }
            }
        }
    });

    // Skills Bar Chart
    const skillCounts = {};
    loaded.forEach(c => (c.skills || []).forEach(s => { skillCounts[s] = (skillCounts[s] || 0) + 1; }));
    const sortedSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (chartSkills) chartSkills.destroy();
    chartSkills = new Chart(document.getElementById('chartSkills'), {
        type: 'bar',
        data: {
            labels: sortedSkills.map(s => s[0]),
            datasets: [{ label: 'Candidates', data: sortedSkills.map(s => s[1]), backgroundColor: '#818cf8', borderRadius: 6 }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
            }
        }
    });

    // Score Distribution
    const ranges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    loaded.forEach(c => {
        if (c.score <= 20) ranges['0-20']++;
        else if (c.score <= 40) ranges['21-40']++;
        else if (c.score <= 60) ranges['41-60']++;
        else if (c.score <= 80) ranges['61-80']++;
        else ranges['81-100']++;
    });
    if (chartScores) chartScores.destroy();
    chartScores = new Chart(document.getElementById('chartScores'), {
        type: 'bar',
        data: {
            labels: Object.keys(ranges),
            datasets: [{ label: 'Candidates', data: Object.values(ranges), backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'], borderRadius: 6 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } }
            }
        }
    });
}

// ============================================================
// CANDIDATES TABLE
// ============================================================
function renderTable(data) {
    const tableBody = document.getElementById("candidateRows");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    data.forEach(item => {
        const skillsHTML = (item.skills || []).map(s => `<span class="skill-badge">${s}</span>`).join('');
        const statusClass = (item.status || "").toLowerCase() === 'shortlisted' ? 'status-shortlisted' : 'status-review';
        const displayStatus = (item.status || "").toLowerCase() === 'shortlisted' ? 'Shortlisted' : 'Under Review';

        const row = `
            <tr>
                <td>
                    <div class="fw-bold text-white">${item.name}</div>
                    <small style="color: var(--text-muted)">${item.email}</small>
                </td>
                <td>${item.role}</td>
                <td>${skillsHTML}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 6px; width: 80px; background-color: #334155;">
                            <div class="progress-bar bg-info" style="width: ${item.score}%"></div>
                        </div>
                        <span class="fw-bold text-info small">${item.score}%</span>
                    </div>
                </td>
                <td><span class="status-pill ${statusClass}">${displayStatus}</span></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function findExistingCandidate(dataName) {
    const incoming = dataName.toLowerCase().trim();
    return candidates.find(c => {
        const existing = c.name.toLowerCase().trim();
        return incoming === existing || incoming.includes(existing) || existing.includes(incoming);
    });
}

function getResultJsonUrl(fileName) {
    const cleanName = fileName.replace(/ /g, '_').replace('.pdf', '');
    return `https://ai-resume-screener-aditya.s3.us-east-1.amazonaws.com/results/${cleanName}_results.json?t=${new Date().getTime()}`;
}

function fetchResumeResults(fileName, retryCount = 0) {
    if (retryCount >= MAX_RETRIES) {
        console.error(`❌ Timed out: ${fileName}`);
        return;
    }

    fetch(getResultJsonUrl(fileName))
        .then(res => {
            if (res.status === 403 || res.status === 404) throw new Error("NOT_READY");
            if (!res.ok) throw new Error(`HTTP_ERROR_${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log(`✅ Results received for ${fileName}:`, data);
            const statusText = document.getElementById("uploadStatusText");
            if (statusText) statusText.innerText = "✅ Analysis complete!";

            let existing = findExistingCandidate(data.name);
            if (existing) {
                existing.score  = data.match_score;
                existing.skills = data.skills_found;
                existing.status = data.status;
                existing.email  = data.email  || existing.email;
                existing.role   = data.role   || existing.role;
            } else {
                candidates.push({
                    id: candidates.length + 1,
                    name:   data.name,
                    email:  data.email  || "not.found@example.com",
                    role:   data.role   || "New Applicant",
                    skills: data.skills_found,
                    score:  data.match_score,
                    status: data.status
                });
            }
            renderTable(candidates);
        })
        .catch(err => {
            if (err.message === "NOT_READY") {
                setTimeout(() => fetchResumeResults(fileName, retryCount + 1), POLL_INTERVAL_MS);
            } else {
                console.error("❌ Error:", err.message);
            }
        });
}

function handleFileUpload(file) {
    if (!file || file.type !== "application/pdf") return alert("Please select a PDF file.");

    const statusText = document.getElementById("uploadStatusText");
    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBar = document.getElementById("uploadProgressBar");

    if (progressContainer) progressContainer.classList.remove('d-none');
    if (progressBar) progressBar.style.width = '30%';
    if (statusText) statusText.innerText = "Uploading...";

    fetch(UPLOAD_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name })
    })
        .then(res => { if (!res.ok) throw new Error("Failed to get upload URL"); return res.json(); })
        .then(data => {
            const uploadUrl = data.uploadUrl || data.uploadURL;
            if (!uploadUrl) throw new Error("No upload URL returned");
            if (progressBar) progressBar.style.width = '60%';
            return fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": "application/pdf" } });
        })
        .then(() => {
            if (progressBar) progressBar.style.width = '100%';
            if (statusText) statusText.innerText = "Analyzing...";
            console.log(`✅ File uploaded: ${file.name}`);
            fetchResumeResults(file.name, 0);
        })
        .catch(err => {
            console.error("❌ Upload error:", err);
            if (statusText) statusText.innerText = "Upload failed. Please try again.";
        });
}

// Search
document.addEventListener("DOMContentLoaded", () => {
    renderTable(candidates);
    KNOWN_RESUMES.forEach(f => fetchResumeResults(f, 0));

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const searchInput = document.getElementById("searchInput");

    if (dropZone) {
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFileUpload(e.dataTransfer.files[0]); });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    }
    if (fileInput) fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            const filtered = candidates.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.skills || []).some(s => s.toLowerCase().includes(q)) ||
                c.role.toLowerCase().includes(q)
            );
            renderTable(filtered);
        });
    }
});