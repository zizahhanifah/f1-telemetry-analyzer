const API_BASE = 'http://127.0.0.1:8000';

const yearSelect = document.getElementById("yearSelect");
const sessionTypeSelect = document.getElementById("sessionTypeSelect");
const sessionSelect = document.getElementById("sessionSelect");
const driver1Select = document.getElementById("driver1Select");
const driver2Select = document.getElementById("driver2Select");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingEl = document.getElementById("loading");
const resultSection = document.getElementById("resultSection");
const matchupPreview = document.getElementById("matchupPreview");
const headerSessionBadge = document.getElementById("headerSessionBadge");

let lapChartInstance = null;
let cachedSessions = [];
let currentDriversMap = {};

const FALLBACK_DRIVER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%231f2937'><circle cx='32' cy='24' r='12' fill='%2300f0ff'/><path d='M12 56c0-11 9-18 20-18s20 7 20 18' fill='%2300f0ff'/><\/svg>";

const CIRCUIT_PATHS = {
    "Sakhir": "M20 45 L75 45 L82 35 L68 25 L78 15 L55 12 L48 25 L35 18 L22 25 L28 36 Z",
    "Jeddah": "M15 48 C25 42, 45 30, 65 18 C78 10, 88 12, 85 20 C75 28, 50 38, 25 50 C15 53, 10 50, 15 48 Z",
    "Melbourne": "M18 35 L35 18 L60 15 L82 22 L85 38 L68 45 L55 36 L40 46 L20 44 Z",
    "Suzuka": "M15 38 L38 25 L55 38 L82 42 L86 28 L65 24 L48 14 L25 16 L18 28 Z",
    "Shanghai": "M22 42 L68 42 L82 30 C84 16, 66 14, 62 24 L45 26 C35 14, 18 18, 24 30 Z",
    "Miami": "M15 35 L58 35 L78 22 L85 30 L72 44 L38 44 L25 39 L15 42 Z",
    "Imola": "M15 38 L42 36 L62 44 L85 38 L82 24 L62 22 L45 15 L22 22 Z",
    "Monte Carlo": "M16 42 L32 32 L36 16 L58 14 L78 24 L84 36 L70 36 L65 44 L42 44 L34 38 L22 46 Z",
    "Montreal": "M15 42 L48 28 L78 16 L85 22 L62 36 L30 46 L15 45 Z",
    "Catalunya": "M18 42 L65 42 L82 32 L78 18 L55 18 L48 28 L32 22 L18 28 Z",
    "Spielberg": "M20 42 L68 42 L82 28 L62 15 L45 22 L32 16 L18 28 Z",
    "Silverstone": "M22 40 L48 44 L65 32 L82 35 L84 18 L62 14 L48 22 L30 16 L20 26 Z",
    "Hungaroring": "M20 42 L62 42 L78 28 L68 15 L48 22 L36 16 L24 26 L32 34 Z",
    "Spa-Francorchamps": "M16 44 L28 24 L45 15 L78 18 L85 32 L68 38 L52 30 L36 42 Z",
    "Zandvoort": "M22 42 L55 44 L78 34 C84 20, 66 14, 58 24 L42 20 L25 26 Z",
    "Monza": "M18 44 L75 44 L84 32 L72 16 L45 16 L38 26 L20 28 Z",
    "Baku": "M16 44 L68 44 L68 24 L82 24 L82 14 L45 14 L45 28 L24 28 L24 38 Z",
    "Singapore": "M18 36 L45 44 L78 40 L84 24 L64 16 L48 24 L32 16 L18 24 Z",
    "Austin": "M16 44 L45 20 L68 16 L84 26 L74 42 L55 34 L42 44 L22 46 Z",
    "Mexico City": "M18 42 L76 42 L84 28 L72 16 L46 18 L42 30 L24 30 Z",
    "Interlagos": "M20 40 L65 44 L82 30 L72 16 L48 20 L54 32 L32 34 L20 28 Z",
    "Las Vegas": "M16 40 L52 44 L84 36 L82 18 L56 16 L46 26 L22 24 Z",
    "Lusail": "M22 44 L68 44 L82 30 L72 16 L46 18 L36 28 L22 30 Z",
    "Yas Marina": "M18 38 L55 44 L82 36 L80 20 L58 16 L44 26 L24 22 Z",
    "Sepang": "M16 42 L78 42 C85 42, 85 30, 74 30 L34 30 L56 18 C64 14, 56 10, 44 14 L18 28 C12 32, 12 42, 16 42 Z",
};

function getCircuitSvgUrl(circuitName) {
    const key = Object.keys(CIRCUIT_PATHS).find(k =>
        circuitName && circuitName.toLowerCase().includes(k.toLowerCase())
    );
    const pathData = key ? CIRCUIT_PATHS[key] : "M18 42 L55 44 L82 32 L74 16 L45 18 L24 28 Z";
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" fill="none"><path d="' + pathData + '" stroke="#00f0ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><\/svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function updateHeaderBadge() {
    if (!yearSelect || !sessionTypeSelect || !headerSessionBadge) return;
    const yr = yearSelect.value;
    const typeLabel = sessionTypeSelect.value.includes("Sprint") ? "SPRINT RACE" : "MAIN RACE";
    headerSessionBadge.textContent = yr + ' • ' + typeLabel;
}

async function loadSessions() {
    updateHeaderBadge();
    const selectedYear = yearSelect ? yearSelect.value : "2024";
    if (sessionSelect) sessionSelect.innerHTML = '<option value="">Memuat daftar sirkuit...</option>';
    resetDriverDropdowns();
    try {
        const res = await fetch(API_BASE + '/sessions?year=' + selectedYear);
        if (!res.ok) throw new Error("Gagal mengambil sesi");
        cachedSessions = await res.json();
        filterSessionsByType();
    } catch (err) {
        console.error(err);
        if (sessionSelect) sessionSelect.innerHTML = '<option value="">Gagal memuat sesi</option>';
    }
}

function filterSessionsByType() {
    if (!sessionTypeSelect || !cachedSessions) return;
    
    const selectedType = sessionTypeSelect.value.toLowerCase();
    const sessionsArray = Array.isArray(cachedSessions) ? cachedSessions : [];
    
    // Filter secara fleksibel berdasarkan kata kunci pilihan dropdown
    const filtered = sessionsArray.filter(s => {
        const sType = (s.session_name || s.session_type || "").toLowerCase();
        
        if (selectedType.includes("sprint")) {
            return sType.includes("sprint");
        } else if (selectedType.includes("qualifying")) {
            return sType.includes("qualifying") || sType.includes("quali");
        } else {
            // Main Race / Grand Prix (pastikan tidak menyertakan sesi sprint atau qualifying)
            return sType.includes("race") && !sType.includes("sprint");
        }
    });
    
    renderCircuitDropdown(filtered);
}

function resetDriverDropdowns() {
    if (driver1Select) { driver1Select.innerHTML = '<option value="">Pilih sirkuit dulu</option>'; driver1Select.disabled = true; }
    if (driver2Select) { driver2Select.innerHTML = '<option value="">Pilih sirkuit dulu</option>'; driver2Select.disabled = true; }
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (matchupPreview) matchupPreview.classList.add("hidden");
    if (resultSection) resultSection.classList.add("hidden");
}

function updateMatchupPreview() {
    if (!sessionSelect || !driver1Select || !driver2Select || !matchupPreview) return;
    const sessionOpt = sessionSelect.options[sessionSelect.selectedIndex];
    const d1 = currentDriversMap[driver1Select.value];
    const d2 = currentDriversMap[driver2Select.value];
    if (!sessionOpt || !sessionOpt.value || !d1 || !d2) {
        matchupPreview.classList.add("hidden");
        return;
    }
    const circNameEl = document.getElementById("previewCircuitName");
    if (circNameEl) circNameEl.textContent = sessionOpt.textContent;
    const circuitImgEl = document.getElementById("previewCircuitImg");
    if (circuitImgEl) circuitImgEl.src = sessionOpt.dataset.img || getCircuitSvgUrl(sessionOpt.textContent);
    
    const d1Num = document.getElementById("previewD1Num"); if (d1Num) d1Num.textContent = '#' + d1.driver_number;
    const d1Name = document.getElementById("previewD1Name"); if (d1Name) d1Name.textContent = d1.name;
    const d1Team = document.getElementById("previewD1Team"); if (d1Team) d1Team.textContent = d1.team;
    const d1Img = document.getElementById("previewD1Img");
    if (d1Img) {
        d1Img.src = d1.headshot_url || FALLBACK_DRIVER_IMG;
        d1Img.onerror = function() { this.src = FALLBACK_DRIVER_IMG; };
    }

    const d2Num = document.getElementById("previewD2Num"); if (d2Num) d2Num.textContent = '#' + d2.driver_number;
    const d2Name = document.getElementById("previewD2Name"); if (d2Name) d2Name.textContent = d2.name;
    const d2Team = document.getElementById("previewD2Team"); if (d2Team) d2Team.textContent = d2.team;
    const d2Img = document.getElementById("previewD2Img");
    if (d2Img) {
        d2Img.src = d2.headshot_url || FALLBACK_DRIVER_IMG;
        d2Img.onerror = function() { this.src = FALLBACK_DRIVER_IMG; };
    }
    matchupPreview.classList.remove("hidden");
}

if (yearSelect) yearSelect.addEventListener("change", loadSessions);
if (sessionTypeSelect) sessionTypeSelect.addEventListener("change", filterSessionsByType);
if (driver1Select) driver1Select.addEventListener("change", updateMatchupPreview);
if (driver2Select) driver2Select.addEventListener("change", updateMatchupPreview);

if (sessionSelect) {
    sessionSelect.addEventListener("change", async () => {
        const sessionKey = sessionSelect.value;
        if (!sessionKey) {
            resetDriverDropdowns();
            return;
        }
        if (driver1Select) driver1Select.disabled = true;
        if (driver2Select) driver2Select.disabled = true;
        if (analyzeBtn) analyzeBtn.disabled = true;
        if (matchupPreview) matchupPreview.classList.add("hidden");
        if (driver1Select) driver1Select.innerHTML = '<option>Memuat pembalap...</option>';
        if (driver2Select) driver2Select.innerHTML = '<option>Memuat pembalap...</option>';
        try {
            const res = await fetch(API_BASE + '/drivers/' + sessionKey);
            const drivers = await res.json();
            if (!drivers || drivers.length === 0) {
                if (driver1Select) driver1Select.innerHTML = '<option>Data pembalap belum tersedia</option>';
                if (driver2Select) driver2Select.innerHTML = '<option>Data pembalap belum tersedia</option>';
                return;
            }
            currentDriversMap = {};
            if (driver1Select) driver1Select.innerHTML = "";
            if (driver2Select) driver2Select.innerHTML = "";
            drivers.forEach(d => {
                currentDriversMap[d.driver_number] = d;
                const imgUrl = d.headshot_url || FALLBACK_DRIVER_IMG;
                const label = '#' + d.driver_number + ' - ' + d.name + ' (' + d.team + ')';
                const opt1 = document.createElement("option");
                opt1.value = d.driver_number;
                opt1.textContent = label;
                opt1.dataset.img = imgUrl;
                opt1.dataset.type = "driver";
                const opt2 = opt1.cloneNode(true);
                if (driver1Select) driver1Select.appendChild(opt1);
                if (driver2Select) driver2Select.appendChild(opt2);
            });
            if (driver2Select && drivers.length > 1) driver2Select.selectedIndex = 1;
            if (driver1Select) driver1Select.disabled = false;
            if (driver2Select) driver2Select.disabled = false;
            if (analyzeBtn) analyzeBtn.disabled = false;
            updateMatchupPreview();
        } catch (err) {
            console.error(err);
            if (driver1Select) driver1Select.innerHTML = '<option>Gagal memuat pembalap</option>';
            if (driver2Select) driver2Select.innerHTML = '<option>Gagal memuat pembalap</option>';
        }
    });
}

let lightInterval = null;
function startRaceSequence() {
    const bulbs = [1, 2, 3, 4, 5].map(i => document.getElementById('light' + i));
    const car = document.getElementById("f1Car");
    const statusText = document.getElementById("loadingText");
    bulbs.forEach(b => { if (b) b.className = "bulb"; });
    if (car) car.className = "f1-car revving";
    if (statusText) statusText.textContent = "Menyalakan lampu start & menarik telemetri OpenF1...";
    if (loadingEl) loadingEl.classList.remove("hidden");
    let idx = 0;
    clearInterval(lightInterval);
    lightInterval = setInterval(() => {
        if (idx < bulbs.length) {
            if (bulbs[idx]) bulbs[idx].classList.add("red-on");
            idx++;
        } else {
            clearInterval(lightInterval);
            if (statusText) statusText.textContent = "Menunggu data lap selesai diolah...";
        }
    }, 350);
}

function renderCircuitDropdown(sessions) {
    if (!sessionSelect) return;
    sessionSelect.innerHTML = "";
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    if (sessionsArray.length === 0) {
        sessionSelect.innerHTML = '<option value="">Tidak ada sesi tersedia</option>';
        return;
    }
    sessionsArray.forEach(s => {
        const option = document.createElement("option");
        option.value = s.session_key;
        
        // Ambil nama sirkuit/lokasi yang valid dari properti OpenF1
        const circuitName = s.circuit_short_name || s.location || s.meeting_name || 'Grand Prix';
        const countryName = s.country_name || s.location || '';
        const sessionName = s.session_name || 'Race';
        
        option.textContent = `${countryName} - ${circuitName} (${sessionName})`;
        option.dataset.img = s.circuit_image || getCircuitSvgUrl(circuitName);
        option.dataset.type = "circuit";
        sessionSelect.appendChild(option);
    });
    if (sessionSelect.options.length > 0) {
        sessionSelect.dispatchEvent(new Event('change'));
    }
}

function finishRaceLaunch() {
    return new Promise((resolve) => {
        clearInterval(lightInterval);
        const bulbs = [1, 2, 3, 4, 5].map(i => document.getElementById('light' + i));
        const car = document.getElementById("f1Car");
        const statusText = document.getElementById("loadingText");
        bulbs.forEach(b => { if (b) b.className = "bulb green-on"; });
        if (statusText) statusText.textContent = "LIGHTS OUT & AWAY WE GO!";
        setTimeout(() => {
            if (car) car.className = "f1-car launch";
        }, 120);
        setTimeout(() => {
            if (loadingEl) loadingEl.classList.add("hidden");
            resolve();
        }, 700);
    });
}

if (analyzeBtn) {
    analyzeBtn.addEventListener("click", async () => {
        const sessionKey = sessionSelect ? sessionSelect.value : "";
        const d1 = driver1Select ? driver1Select.value : "";
        const d2 = driver2Select ? driver2Select.value : "";
        if (d1 === d2) {
            showF1Notification("Pilih dua pembalap yang berbeda untuk dibandingkan!", "error");
            return;
        }
        if (resultSection) resultSection.classList.add("hidden");
        startRaceSequence();
        try {
            const [res] = await Promise.all([
                fetch(API_BASE + '/analyze?session_key=' + sessionKey + '&driver_1=' + d1 + '&driver_2=' + d2),
                new Promise(r => setTimeout(r, 1800))
            ]);
            if (!res.ok) throw new Error("Gagal mengambil data analisis");
            const data = await res.json();
            if (!data.driver_1 || !data.driver_2 || (data.driver_1.analysis.clean_laps.length === 0 && data.driver_2.analysis.clean_laps.length === 0)) {
                clearInterval(lightInterval);
                if (loadingEl) loadingEl.classList.add("hidden");
                showF1Notification(data.driver_1?.analysis?.warning || "Data telemetri untuk sesi ini belum tersedia.", "error");
                return;
            }
            await finishRaceLaunch();
            const d1Obj = currentDriversMap[d1];
            const d2Obj = currentDriversMap[d2];
            const rD1Img = document.getElementById("resD1Img");
            if (rD1Img) {
                rD1Img.src = d1Obj.headshot_url || FALLBACK_DRIVER_IMG;
                rD1Img.onerror = function() { this.src = FALLBACK_DRIVER_IMG; };
            }
            const rD1Team = document.getElementById("resD1Team");
            if (rD1Team) rD1Team.textContent = d1Obj.team;

            const rD2Img = document.getElementById("resD2Img");
            if (rD2Img) {
                rD2Img.src = d2Obj.headshot_url || FALLBACK_DRIVER_IMG;
                rD2Img.onerror = function() { this.src = FALLBACK_DRIVER_IMG; };
            }
            const rD2Team = document.getElementById("resD2Team");
            if (rD2Team) rD2Team.textContent = d2Obj.team;

            generateBeginnerInsight(data, d1Obj, d2Obj);
            renderChart(data, '#' + d1Obj.driver_number + ' ' + d1Obj.acronym, '#' + d2Obj.driver_number + ' ' + d2Obj.acronym);
            renderTable("driver1Table", "driver1Title", '#' + d1Obj.driver_number + ' ' + d1Obj.name, data.driver_1.analysis.stint_summary);
            renderTable("driver2Table", "driver2Title", '#' + d2Obj.driver_number + ' ' + d2Obj.name, data.driver_2.analysis.stint_summary);
            if (resultSection) resultSection.classList.remove("hidden");
        } catch (err) {
            console.error(err);
            clearInterval(lightInterval);
            if (loadingEl) loadingEl.classList.add("hidden");
            showF1Notification("Terjadi kesalahan saat menganalisis data. Coba pilih sesi balapan lain.");
        }
    });
}

function generateBeginnerInsight(data, d1Obj, d2Obj) {
    const insightEl = document.getElementById("raceInsightText");
    if (!insightEl) return;
    const laps1 = data.driver_1.analysis.clean_laps;
    const laps2 = data.driver_2.analysis.clean_laps;
    const sum1 = data.driver_1.analysis.stint_summary;
    const sum2 = data.driver_2.analysis.stint_summary;
    if (!laps1.length || !laps2.length) {
        insightEl.innerHTML = "Data perbandingan lengkap hanya tersedia untuk salah satu pembalap karena pembalap lainnya mengalami kendala teknis atau berhenti lebih awal (DNF).";
        return;
    }
    const avg1 = laps1.reduce((acc, l) => acc + l.lap_duration, 0) / laps1.length;
    const avg2 = laps2.reduce((acc, l) => acc + l.lap_duration, 0) / laps2.length;
    const diff = Math.abs(avg1 - avg2).toFixed(3);
    const fasterDriver = avg1 < avg2 ? d1Obj.name : d2Obj.name;
    const slowerDriver = avg1 < avg2 ? d2Obj.name : d1Obj.name;
    const avgDeg1 = sum1.length ? sum1.reduce((a, s) => a + s.degradation_per_lap, 0) / sum1.length : 0;
    const avgDeg2 = sum2.length ? sum2.reduce((a, s) => a + s.degradation_per_lap, 0) / sum2.length : 0;
    const betterTyreDriver = avgDeg1 < avgDeg2 ? d1Obj.name : d2Obj.name;
    insightEl.innerHTML = "Secara keseluruhan, <b>" + fasterDriver + "</b> melaju lebih cepat dengan selisih rata-rata <b>" + diff + " detik per lap</b> dibandingkan <b>" + slowerDriver + "</b>. Dari sisi manajemen ban, <b>" + betterTyreDriver + "</b> memiliki tingkat keausan ban yang lebih terjaga sehingga ritme waktunya lebih stabil sepanjang balapan.";
}

function renderChart(data, d1Label, d2Label) {
    const canvasEl = document.getElementById("lapChart");
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    const laps1 = data.driver_1.analysis.clean_laps;
    const laps2 = data.driver_2.analysis.clean_laps;
    const allLapNumbers = Array.from(new Set([
        ...laps1.map(l => l.lap_number),
        ...laps2.map(l => l.lap_number)
    ])).sort((a, b) => a - b);
    const mapData = (laps) => allLapNumbers.map(num => {
        const found = laps.find(l => l.lap_number === num);
        return found ? found.lap_duration : null;
    });
    if (lapChartInstance) lapChartInstance.destroy();
    lapChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: allLapNumbers.map(n => 'L' + n),
            datasets: [
                {
                    label: d1Label,
                    data: mapData(laps1),
                    borderColor: "#00f0ff",
                    backgroundColor: "rgba(0, 240, 255, 0.12)",
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointHoverRadius: 6,
                    tension: 0.25,
                    spanGaps: true
                },
                {
                    label: d2Label,
                    data: mapData(laps2),
                    borderColor: "#ff2a5f",
                    backgroundColor: "rgba(255, 42, 95, 0.12)",
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointHoverRadius: 6,
                    tension: 0.25,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: "#f3f4f6",
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "600" }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#9ca3af", font: { size: 11 } },
                    grid: { color: "rgba(255, 255, 255, 0.06)" }
                },
                y: {
                    ticks: { color: "#9ca3af", font: { size: 11 } },
                    grid: { color: "rgba(255, 255, 255, 0.06)" },
                    title: {
                        display: true,
                        text: "Lap Time (Detik)",
                        color: "#00f0ff",
                        font: { family: "'Orbitron', sans-serif", size: 11 }
                    }
                }
            }
        }
    });
}

function renderTable(tableId, titleId, driverTitle, summaryList) {
    const titleEl = document.getElementById(titleId);
    if (titleEl) titleEl.textContent = driverTitle;
    const tbody = document.querySelector('#' + tableId + ' tbody');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // Ubah keterangan di sini menjadi DNF (Did Not Finish)
    if (!summaryList || summaryList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="color: #ff2a5f; text-align: center; font-weight: bold;">DNF (Did Not Finish) - Tidak ada data lap bersih</td></tr>';
        return;
    }

    summaryList.forEach(item => {
        const degSign = item.degradation_per_lap > 0 ? '+' + item.degradation_per_lap : item.degradation_per_lap;
        const colorStyle = item.degradation_per_lap > 0 ? '#ff2a5f' : '#00e676';
        const row = '<tr><td><strong>Stint ' + item.stint + '</strong></td><td><span class="badge badge-' + item.compound + '">' + item.compound + '</span></td><td>' + item.total_clean_laps + ' laps</td><td>' + item.avg_lap_time + 's</td><td>' + item.fastest_lap + 's</td><td style="color: ' + colorStyle + '"><strong>' + degSign + 's / lap</strong></td></tr>';
        tbody.innerHTML += row;
    });
}

function buildOptionContent(opt) {
    const frag = document.createDocumentFragment();
    if (opt && opt.dataset && opt.dataset.img) {
        const img = document.createElement("img");
        img.src = opt.dataset.img;
        img.className = opt.dataset.type === "circuit" ? "opt-thumb-circuit" : "opt-thumb-driver";
        img.onerror = function() {
            this.src = opt.dataset.type === "circuit" ? getCircuitSvgUrl("") : FALLBACK_DRIVER_IMG;
        };
        frag.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = opt ? opt.textContent : "-- Pilih --";
    frag.appendChild(span);
    return frag;
}

function initCustomDropdowns() {
    document.querySelectorAll(".control-panel select").forEach((selectEl) => {
        const wrapper = document.createElement("div");
        wrapper.className = "custom-select-wrapper";
        if (selectEl.parentNode) {
            selectEl.parentNode.insertBefore(wrapper, selectEl);
        }
        wrapper.appendChild(selectEl);
        const trigger = document.createElement("div");
        trigger.className = "custom-select-trigger";
        const triggerContent = document.createElement("div");
        triggerContent.className = "trigger-content";
        trigger.appendChild(triggerContent);
        wrapper.appendChild(trigger);
        const optionsContainer = document.createElement("div");
        optionsContainer.className = "custom-options";
        wrapper.appendChild(optionsContainer);
        
        const syncDropdown = () => {
            wrapper.classList.toggle("disabled", selectEl.disabled);
            const selectedOpt = selectEl.options[selectEl.selectedIndex];
            triggerContent.innerHTML = "";
            triggerContent.appendChild(buildOptionContent(selectedOpt));
            optionsContainer.innerHTML = "";
            Array.from(selectEl.options).forEach((opt, idx) => {
                const div = document.createElement("div");
                div.className = "custom-option";
                if (idx === selectEl.selectedIndex) div.classList.add("selected");
                div.appendChild(buildOptionContent(opt));
                div.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectEl.selectedIndex = idx;
                    wrapper.classList.remove("open");
                    syncDropdown();
                    selectEl.dispatchEvent(new Event("change"));
                });
                optionsContainer.appendChild(div);
            });
        };
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            if (selectEl.disabled) return;
            document.querySelectorAll(".custom-select-wrapper.open").forEach((other) => {
                if (other !== wrapper) other.classList.remove("open");
            });
            wrapper.classList.toggle("open");
        });
        const observer = new MutationObserver(syncDropdown);
        observer.observe(selectEl, { childList: true, attributes: true, attributeFilter: ["disabled"] });
        syncDropdown();
    });
    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-select-wrapper.open").forEach((w) => {
            w.classList.remove("open");
        });
    });
}

initCustomDropdowns();
loadSessions();

function showF1Notification(message, type = 'error') {
    let container = document.getElementById("f1ToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "f1ToastContainer";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = 'f1-toast ' + type;
    const icon = type === 'error' ? '⚠️' : '💡';
    toast.innerHTML = '<div class="f1-toast-icon">' + icon + '</div><div style="flex-grow: 1; line-height: 1.4;">' + message + '</div>';
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOutToast 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.content-tab').forEach(t => t.classList.add('hidden'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.remove('hidden');
        if (targetId === 'tyreLabSection' && window.initThreeTyre && !window.threeInitialized) {
            window.initThreeTyre();
            window.threeInitialized = true;
        }
    });
});

const tyreDataInfo = {
    soft: { name: "PIRELLI P ZERO SOFT (C5)", desc: "Kompon paling lunak untuk kecepatan maksimal satu lap kilat, namun sangat rentan terhadap keausan tinggi.", temp: "85°C - 100°C", life: "15 - 20 Lap", char: "Super Cepat, Degradasi Tinggi", color: 0xff2a5f },
    medium: { name: "PIRELLI P ZERO MEDIUM (C3)", desc: "Kompon seimbang yang paling sering digunakan dalam balapan konvensional. Daya tahan dan kecepatan pas.", temp: "90°C - 105°C", life: "25 - 30 Lap", char: "Seimbang, Serbaguna", color: 0xffd000 },
    hard: { name: "PIRELLI P ZERO HARD (C1)", desc: "Kompon paling keras dan awet. Butuh waktu lebih lama untuk mencapai suhu optimal namun tahan siksaan berlap-lap.", temp: "100°C - 120°C", life: "35 - 45 Lap", char: "Sangat Awet, Lebih Lambat", color: 0xf3f4f6 },
    inter: { name: "CINTURATO INTERMEDIATE (HIJAU)", desc: "Ban khusus lintasan basah ringan atau gerimis. Memiliki alur khusus untuk membuang genangan air.", temp: "60°C - 85°C", life: "Tergantung Intensitas Hujan", char: "Traksi Basah Ringan", color: 0x00e676 },
    wet: { name: "CINTURATO FULL WET (BIRU)", desc: "Ban penyelamat saat hujan deras. Mampu membuang air hingga 85 liter per detik pada kecepatan penuh.", temp: "50°C - 75°C", life: "Tergantung Genangan", char: "Anti-Aquaplaning Maksimal", color: 0x2979ff }
};

window.initThreeTyre = function() {
    const compoundBtns = document.querySelectorAll('.compound-btn');
    const tyreImage = document.getElementById('tyreImageDisplay');
    const tyreImages = {
        soft: 'assets/soft_tyre.jpeg',
        medium: 'assets/medium_tyre.jpeg',
        hard: 'assets/hard_tyre.jpeg',
        inter: 'assets/inter_tyre.jpeg',
        wet: 'assets/wet_tyre.jpeg'
    };
    compoundBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.compound-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const key = btn.getAttribute('data-compound');
            const info = tyreDataInfo[key];
            if (!info) return;
            const tName = document.getElementById('tyreNameTitle'); if (tName) tName.textContent = info.name;
            const tDesc = document.getElementById('tyreDescText'); if (tDesc) tDesc.textContent = info.desc;
            const sTemp = document.getElementById('specTemp'); if (sTemp) sTemp.textContent = info.temp;
            const sLife = document.getElementById('specLife'); if (sLife) sLife.textContent = info.life;
            const sChar = document.getElementById('specChar'); if (sChar) sChar.textContent = info.char;
            if (tyreImage) {
                tyreImage.style.opacity = '0';
                setTimeout(() => {
                    tyreImage.src = tyreImages[key] || 'assets/soft_tyre.jpeg';
                    tyreImage.style.opacity = '1';
                }, 200);
            }
        });
    });
    document.querySelectorAll('.hotspot').forEach(spot => {
        spot.addEventListener('click', () => {
            const infoText = spot.getAttribute('data-info');
            const labelEl = spot.querySelector('.hotspot-label');
            const labelText = labelEl ? labelEl.textContent : 'Bagian Ban';
            const infoBox = document.getElementById('hotspotInfoBox');
            if (infoBox) {
                infoBox.innerHTML = '<b>' + labelText + ':</b> ' + infoText;
                infoBox.style.borderColor = '#00f0ff';
                setTimeout(() => {
                    infoBox.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                }, 400);
            }
        });
    });
};

const quizQuestions = [
    {
        question: "Apa arti garis warna MERAH pada dinding ban Pirelli F1?",
        options: [
            "Kompon Hard (Paling awet tapi lambat)",
            "Kompon Soft (Paling cepat tapi cepat habis aus)",
            "Ban khusus untuk lintasan hujan deras",
            "Ban cadangan darurat pit stop"
        ],
        answer: 1
    },
    {
        question: "Mengapa pembalap melakukan 'Undercut' (masuk pit lebih awal dari lawan di depan)?",
        options: [
            "Agar mobil lebih ringan karena membuang sisa bensin",
            "Memanfaatkan keunggulan ban baru yang jauh lebih kencang di lap-lap awal untuk menyalip saat lawan pit",
            "Menghindari penalti dari stewards balapan",
            "Mengganti sayap depan yang patah"
        ],
        answer: 1
    },
    {
        question: "Berapa kapasitas pembuangan air maksimal ban Full Wet (Biru) pada kecepatan 300 km/jam?",
        options: [
            "Sekitar 10 liter per detik",
            "Sekitar 35 liter per detik",
            "Sekitar 85 liter per detik",
            "Tidak membuang air sama sekali"
        ],
        answer: 2
    },
    {
        question: "Apa indikator utama dalam grafik telemetri bahwa ban pembalap mulai mengalami degradasi berat?",
        options: [
            "Catatan waktu lap semakin melambat secara konsisten (garis grafik menanjak)",
            "Kecepatan puncak di lurusan meningkat drastis",
            "Suhu mesin mobil menjadi sangat dingin",
            "Pembalap masuk posisi pertama"
        ],
        answer: 0
    }
];

let currentQuizIndex = 0;
let userScore = 0;

function loadQuizQuestion() {
    const q = quizQuestions[currentQuizIndex];
    const qProg = document.getElementById('questionProgress');
    if (qProg) qProg.textContent = 'Pertanyaan ' + (currentQuizIndex + 1) + ' dari ' + quizQuestions.length;
    const qText = document.getElementById('quizQuestion');
    if (qText) qText.textContent = q.question;
    const optionsContainer = document.getElementById('quizOptions');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => checkQuizAnswer(idx, q.answer));
        optionsContainer.appendChild(btn);
    });
}

function checkQuizAnswer(selectedIdx, correctIdx) {
    const optionButtons = document.querySelectorAll('.quiz-opt-btn');
    optionButtons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === correctIdx) {
            btn.style.background = 'rgba(0, 230, 118, 0.2)';
            btn.style.borderColor = '#00e676';
        } else if (idx === selectedIdx) {
            btn.style.background = 'rgba(255, 42, 95, 0.2)';
            btn.style.borderColor = '#ff2a5f';
        }
    });
    if (selectedIdx === correctIdx) {
        userScore += 25;
        const sBadge = document.getElementById('quizScoreBadge');
        if (sBadge) sBadge.textContent = 'Skor: ' + userScore;
    }
    setTimeout(() => {
        currentQuizIndex++;
        if (currentQuizIndex < quizQuestions.length) {
            loadQuizQuestion();
        } else {
            const qBody = document.getElementById('quizBody'); if (qBody) qBody.classList.add('hidden');
            const qRes = document.getElementById('quizResultScreen'); if (qRes) qRes.classList.remove('hidden');
            const qFinal = document.getElementById('quizFinalMessage');
            if (qFinal) qFinal.textContent = 'Skor akhir kamu ' + userScore + '/100. ' + (userScore >= 75 ? 'Hebat! Kamu paham strategi pit-wall F1!' : 'Bagus! Terus pelajari data telemetri ban ya!');
        }
    }, 1500);
}

const restartQuizBtn = document.getElementById('restartQuizBtn');
if (restartQuizBtn) {
    restartQuizBtn.addEventListener('click', () => {
        currentQuizIndex = 0;
        userScore = 0;
        const sBadge = document.getElementById('quizScoreBadge'); if (sBadge) sBadge.textContent = 'Skor: 0';
        const qBody = document.getElementById('quizBody'); if (qBody) qBody.classList.remove('hidden');
        const qRes = document.getElementById('quizResultScreen'); if (qRes) qRes.classList.add('hidden');
        loadQuizQuestion();
    });
}

loadQuizQuestion();