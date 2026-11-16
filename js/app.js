// DTU Health Center - Common Application Logic & Database Controller

const API_BASE = (window.location.protocol === "http:" || window.location.protocol === "https:")
    ? "/api"
    : "http://localhost:5000/api";

// Cross-tab real-time sync bus (BroadcastChannel + storage event)
const dtuSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dtu_health_sync_bus') : null;
const syncListeners = [];

function broadcastDataChange(type, payload = {}) {
    if (dtuSyncChannel) {
        try {
            dtuSyncChannel.postMessage({ type, payload, timestamp: Date.now() });
        } catch (e) {}
    }
}

function onDataChanged(callback) {
    if (typeof callback === 'function') {
        syncListeners.push(callback);
    }
}

if (dtuSyncChannel) {
    dtuSyncChannel.onmessage = (event) => {
        syncListeners.forEach(cb => {
            try { cb(event.data); } catch (e) {}
        });
    };
}

window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('dtu_')) {
        syncListeners.forEach(cb => {
            try { cb({ type: 'STORAGE_UPDATE', key: e.key }); } catch (err) {}
        });
    }
});

// Live Server-Sent Events (SSE) Database Push Stream
let sseConnection = null;
function initSSE() {
    if (typeof EventSource !== 'undefined') {
        try {
            const sseUrl = (window.location.protocol === "http:" || window.location.protocol === "https:")
                ? "/api/events"
                : "http://localhost:5000/api/events";
            sseConnection = new EventSource(sseUrl);
            sseConnection.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    console.log("⚡ [SSE LIVE DATABASE PUSH]:", parsed);
                    // Refresh data cache from SQLite database
                    syncDatabaseFromServer();
                    syncListeners.forEach(cb => {
                        try { cb(parsed); } catch (e) {}
                    });
                } catch (e) {}
            };
        } catch (e) {}
    }
}
initSSE();

// Get current logged-in user from localStorage
function getCurrentUser() {
    try {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// Check login status and enforce student profile completion
function checkLogin(expectedRole) {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = "login.html";
        return null;
    }
    
    if (expectedRole && user.role !== expectedRole) {
        if (user.role === "doctor") {
            window.location.href = "doctor-dashboard.html";
        } else {
            window.location.href = "student-dashboard.html";
        }
        return null;
    }

    if (user.role === "student") {
        const profile = localStorage.getItem("studentProfile");
        const currentPage = window.location.pathname.split("/").pop();
        if (!profile && currentPage !== "student-profile.html" && currentPage !== "login.html") {
            window.location.href = "student-profile.html";
            return null;
        }
    }

    return user;
}

// Logout user and clear session
function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
}

// ==========================================
// 🗄️ REAL DATABASE SYNC (API + LOCAL FALLBACK)
// ==========================================

// ==========================================
// 🗄️ REAL DATABASE SYNC (FIREBASE CLOUD + SQLITE DBMS)
// LocalStorage is NEVER used for tables — ONLY in-memory store & real databases!
// ==========================================

// Ensure in-memory database store exists
window._dtuMemoryDB = window._dtuMemoryDB || {
    appointments: [],
    slots: [],
    prescriptions: [],
    referrals: [],
    notices: [],
    medicines: []
};

// Sync data from Node.js SQLite database controller
async function syncDatabaseFromServer() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        if (res.ok) {
            console.log("🟢 Connected to DTU Health Center SQLite DBMS Engine");

            // Fetch live appointments from database
            const aptRes = await fetch(`${API_BASE}/appointments`);
            if (aptRes.ok) {
                const liveApts = await aptRes.json();
                if (Array.isArray(liveApts)) {
                    window._dtuMemoryDB.appointments = liveApts;
                }
            }

            // Fetch live slots from database
            const slotRes = await fetch(`${API_BASE}/slots`);
            if (slotRes.ok) {
                const liveSlots = await slotRes.json();
                if (Array.isArray(liveSlots) && liveSlots.length > 0) {
                    window._dtuMemoryDB.slots = liveSlots;
                }
            }

            // Fetch live notices
            const noticeRes = await fetch(`${API_BASE}/notices`);
            if (noticeRes.ok) {
                const liveNotices = await noticeRes.json();
                if (Array.isArray(liveNotices) && liveNotices.length > 0) {
                    window._dtuMemoryDB.notices = liveNotices;
                }
            }

            // Fetch live prescriptions
            const rxRes = await fetch(`${API_BASE}/prescriptions`);
            if (rxRes.ok) {
                const liveRx = await rxRes.json();
                if (Array.isArray(liveRx) && liveRx.length > 0) {
                    window._dtuMemoryDB.prescriptions = liveRx;
                }
            }

            // Fetch live referrals
            const refRes = await fetch(`${API_BASE}/referrals`);
            if (refRes.ok) {
                const liveRefs = await refRes.json();
                if (Array.isArray(liveRefs) && liveRefs.length > 0) {
                    window._dtuMemoryDB.referrals = liveRefs;
                }
            }

            // Fetch live medicines inventory
            const medRes = await fetch(`${API_BASE}/medicines`);
            if (medRes.ok) {
                const liveMeds = await medRes.json();
                if (Array.isArray(liveMeds) && liveMeds.length > 0) {
                    window._dtuMemoryDB.medicines = liveMeds;
                }
            }
        }
    } catch (e) {
        console.log("ℹ️ Server running autonomously with Firebase Cloud sync.");
    }
}

// Reset all test data in database
async function resetAllDemoData() {
    if (confirm("Reset all test appointments, queues, and demo bookings to fresh clean state?")) {
        try {
            await fetch(`${API_BASE}/reset`, { method: "POST" });
        } catch (e) {}

        // Clear only tables, keeping currentUser
        const tableKeys = ['dtu_appointments', 'dtu_slots', 'dtu_prescriptions', 'dtu_referrals', 'dtu_notices', 'dtu_medicines'];
        tableKeys.forEach(k => { try { localStorage.removeItem(k); } catch(err) {} });

        if (typeof initData === "function") {
            initData(true);
        }
        showNotification("All database test tables cleared! Fresh state initialized.", "success");
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// Show a simple toast alert notification
function showNotification(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `alert alert-${type}`;
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
    toast.style.marginBottom = "10px";
    toast.style.minWidth = "260px";
    toast.style.animation = "fadeIn 0.3s ease";
    toast.innerHTML = `<strong>${type === "success" ? "✓" : "!"}</strong> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Helpers for Database Operations (Single Source of Truth: Firebase Cloud & SQLite)
function getAppointments() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];
}

async function saveAppointment(appointment) {
    const list = getAppointments();
    const exists = list.some(a => a.id === appointment.id);
    if (!exists) {
        list.unshift(appointment);
    }

    // Auto update slot count in slots array
    let slots = getSlots();
    const targetSlot = slots.find(s => 
        (appointment.slotId && s.id == appointment.slotId) || 
        (appointment.doctorName && s.doctorName === appointment.doctorName)
    );
    if (targetSlot) {
        targetSlot.bookedCount = Math.min(targetSlot.maxLimit || 10, (targetSlot.bookedCount || 0) + 1);
    }

    // Persist to SQLite Database Server
    try {
        await fetch(`${API_BASE}/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appointment)
        });
        console.log("💾 Saved to SQLite database (database/hospital.db)");
    } catch (e) {}

    // Broadcast live event to all other open tabs (Doctor Queue, Slot Monitor)
    broadcastDataChange('APPOINTMENT_BOOKED', { appointment, slotId: targetSlot ? targetSlot.id : appointment.slotId });
}

// Cancel appointment and accurately decrement slot count everywhere
async function cancelAppointmentAndFreeSlot(aptId, slotId, doctorName) {
    let list = getAppointments();
    const apt = list.find(a => a.id === aptId);
    window._dtuMemoryDB.appointments = list.filter(a => a.id !== aptId);

    const targetSlotId = slotId || (apt ? apt.slotId : null);
    const targetDocName = doctorName || (apt ? apt.doctorName : null);

    let slots = getSlots();
    const slot = slots.find(s => 
        (targetSlotId && s.id == targetSlotId) || 
        (targetDocName && s.doctorName === targetDocName)
    );

    if (slot) {
        const activeRemaining = window._dtuMemoryDB.appointments.filter(a => 
            (a.slotId && a.slotId == slot.id) || 
            (a.doctorName && a.doctorName === slot.doctorName)
        ).length;
        slot.bookedCount = Math.max(0, activeRemaining);
        console.log(`📉 Slot capacity updated: ${slot.bookedCount}/${slot.maxLimit} for ${slot.doctorName}`);
    }

    // Inform SQLite Database Server
    try {
        await fetch(`${API_BASE}/appointments/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: aptId, slotId: targetSlotId, doctorName: targetDocName })
        });
        console.log("💾 Cancellation synced to SQLite database (database/hospital.db)");
    } catch (e) {}

    // Update Firebase Cloud Firestore
    if (typeof cloudCancelAppointment === 'function') {
        cloudCancelAppointment(aptId, targetSlotId);
    }

    // Broadcast cancellation to all tabs (Doctor Dashboard, Booking page)
    broadcastDataChange('APPOINTMENT_CANCELLED', { id: aptId, slotId: targetSlotId, doctorName: targetDocName });
}

function getPrescriptions() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.prescriptions) || [];
}

async function savePrescription(prescription) {
    const list = getPrescriptions();
    list.unshift(prescription);

    try {
        await fetch(`${API_BASE}/prescriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prescription)
        });
        console.log("💾 Prescription saved to Hospital DBMS (database/hospital.db)");
    } catch (e) {}

    // Cloud Firebase Firestore sync
    if (typeof cloudAddPrescription === 'function') {
        cloudAddPrescription(prescription);
    }

    broadcastDataChange('PRESCRIPTION_ADDED', { prescription });
}

function getReferrals() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.referrals) || [];
}

async function saveReferral(referral) {
    const list = getReferrals();
    list.unshift(referral);

    try {
        await fetch(`${API_BASE}/referrals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(referral)
        });
        console.log("💾 Referral saved to Hospital DBMS (database/hospital.db)");
    } catch (e) {}

    // Cloud Firebase Firestore sync
    if (typeof cloudAddReferral === 'function') {
        cloudAddReferral(referral);
    }

    broadcastDataChange('REFERRAL_ADDED', { referral });
}

async function triggerEmergencySOS(sosData) {
    try {
        await fetch(`${API_BASE}/emergency`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sosData)
        });
        console.log("🚨 Emergency SOS saved to Hospital DBMS (database/hospital.db)");
    } catch (e) {}

    broadcastDataChange('EMERGENCY_SOS', sosData);
}

function getNotices() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.notices) || [];
}

async function saveNotice(notice) {
    const list = getNotices();
    list.unshift(notice);

    try {
        await fetch(`${API_BASE}/notices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notice)
        });
    } catch (e) {}

    broadcastDataChange('NOTICE_ADDED', { notice });
}

function getSlots() {
    let slots = (window._dtuMemoryDB && window._dtuMemoryDB.slots) || [];
    const appointments = getAppointments();

    slots.forEach(slot => {
        if (!slot.maxLimit) slot.maxLimit = 10;
        
        // Count active appointments for this doctor/slot
        const activeCount = appointments.filter(a => 
            (a.slotId && a.slotId == slot.id) || (a.doctorName && a.doctorName === slot.doctorName)
        ).length;

        // Auto-heal any overflow, negative, or desynced slot counts
        if (slot.bookedCount > slot.maxLimit || slot.bookedCount !== activeCount) {
            slot.bookedCount = Math.min(slot.maxLimit, activeCount);
        }
    });

    return slots;
}

async function saveSlot(slot) {
    const list = getSlots();
    list.unshift(slot);

    try {
        await fetch(`${API_BASE}/slots`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slot)
        });
    } catch (e) {}

    broadcastDataChange('SLOT_ADDED', { slot });
}

function updateSlotBookedCount(slotId) {
    getSlots();
}

function getMedicines() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.medicines) || [];
}

async function updateMedicineStock(id, newStock) {
    const list = getMedicines();
    const item = list.find(m => m.id == id);
    if (item) {
        item.stock = parseInt(newStock);

        try {
            await fetch(`${API_BASE}/medicines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: id, stock: parseInt(newStock) })
            });
        } catch (e) {}
    }
}

// Dynamic modern floating pill navbar
function loadNavbar(role) {
    const headerContainer = document.getElementById("navbar-mount");
    if (!headerContainer) return;

    const user = getCurrentUser();
    const userName = user ? (user.name || "User") : "Account";
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    let homeUrl = "index.html";
    if (role === "student" || (user && user.role === "student")) {
        homeUrl = "student-dashboard.html";
    } else if (role === "doctor" || (user && user.role === "doctor")) {
        homeUrl = "doctor-dashboard.html";
    }

    // Determine initials for avatar circle (e.g. RS for Dr. Rajesh Sharma)
    let initials = "HC";
    if (role === "doctor" || (user && user.role === "doctor")) {
        initials = "RS";
    } else if (userName) {
        const parts = userName.replace(/^(Dr\.|Mr\.|Ms\.)\s*/i, '').trim().split(/\s+/);
        if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0].substring(0, 2).toUpperCase();
        }
    }

    let navLinksHtml = "";

    if (role === "doctor" || (user && user.role === "doctor")) {
        navLinksHtml = `
            <li><a href="doctor-dashboard.html" class="nav-link ${currentPage === 'doctor-dashboard.html' ? 'active' : ''}">Dashboard</a></li>
            <li><a href="doctor-dashboard.html#availability-section" class="nav-link">Slots</a></li>
            <li><a href="doctor-dashboard.html#notice-section" class="nav-link">Notices</a></li>
            <li><a href="doctor-dashboard.html#clinical-tools-section" class="nav-link">Tools</a></li>
            <li><a href="doctor-dashboard.html#analytics-section" class="nav-link">Analytics</a></li>
        `;
    } else if (role === "student" || (user && user.role === "student")) {
        navLinksHtml = `
            <li><a href="student-dashboard.html" class="nav-link ${currentPage === 'student-dashboard.html' ? 'active' : ''}">Dashboard</a></li>
            <li><a href="book-appointment.html" class="nav-link ${currentPage === 'book-appointment.html' ? 'active' : ''}">Book Slot</a></li>
            <li><a href="prescriptions.html" class="nav-link ${currentPage === 'prescriptions.html' ? 'active' : ''}">Prescriptions</a></li>
            <li><a href="video-call.html" class="nav-link ${currentPage === 'video-call.html' ? 'active' : ''}">Video Call</a></li>
            <li><a href="health-tips.html" class="nav-link ${currentPage === 'health-tips.html' ? 'active' : ''}">Tips</a></li>
        `;
    } else {
        navLinksHtml = `
            <li><a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">Home</a></li>
            <li><a href="emergency.html" class="nav-link" style="color:#e63946;">Emergency</a></li>
            <li><a href="login.html" class="nav-link btn-pill-primary btn-small" style="color:white; margin-left:6px;">Login</a></li>
        `;
    }

    let userRightHtml = "";
    if (user) {
        userRightHtml = `
            <div class="user-pill">
                <span class="user-avatar-circle">${initials}</span>
                <span>${userName}</span>
                <button onclick="logout()" class="nav-logout-btn" title="Sign Out">↪</button>
            </div>
        `;
    }

    const currentTheme = getSavedTheme();
    const isLight = currentTheme === 'light';
    const themeIcon = isLight ? '☀️' : '🌙';
    const themeTitle = isLight ? 'Switch to Dark Glass Mode' : 'Switch to Light Mode';

    const navHtml = `
    <div class="nav-wrapper">
        <nav class="navbar">
            <a href="${homeUrl}" class="nav-brand">
                <span class="brand-badge">DTU</span>
                <span class="brand-text">Health</span>
                <span class="brand-accent">Center</span>
            </a>
            <ul class="nav-links">
                ${navLinksHtml}
            </ul>
            <div class="nav-right">
                <button id="themeToggleBtn" class="theme-toggle-btn" onclick="toggleTheme()" title="${themeTitle}" aria-label="${themeTitle}">${themeIcon}</button>
                ${userRightHtml}
            </div>
        </nav>
    </div>
    `;

    headerContainer.innerHTML = navHtml;
    applyTheme(currentTheme);
}

// ==========================================================================
// THEME MANAGEMENT (Dark Glassmorphism <-> Modern Crisp Light Mode)
// ==========================================================================
function getSavedTheme() {
    try {
        return localStorage.getItem('dtu_theme') || 'dark';
    } catch (e) {
        return 'dark';
    }
}

function applyTheme(theme) {
    const isLight = (theme === 'light');
    if (isLight) {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        document.documentElement.classList.remove('light-mode');
    }

    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = isLight ? '☀️' : '🌙';
        const label = isLight ? 'Switch to Dark Glass Mode' : 'Switch to Light Mode';
        btn.title = label;
        btn.setAttribute('aria-label', label);
    }
}

function toggleTheme() {
    const current = getSavedTheme();
    const nextTheme = current === 'light' ? 'dark' : 'light';
    try {
        localStorage.setItem('dtu_theme', nextTheme);
    } catch (e) {}
    applyTheme(nextTheme);

    if (typeof showNotification === 'function') {
        showNotification(nextTheme === 'light' ? '☀️ Light Mode Activated' : '🌙 Dark Glass Mode Activated', 'info');
    }
}

// Auto-apply theme immediately on script load to prevent white flash
(function () {
    try {
        const saved = localStorage.getItem('dtu_theme');
        if (saved === 'light') {
            document.documentElement.classList.add('light-mode');
            if (document.body) {
                document.body.classList.add('light-mode');
            } else {
                document.addEventListener('DOMContentLoaded', function () {
                    document.body.classList.add('light-mode');
                });
            }
        }
    } catch (e) {}
})();

// Render modern DTU footer with floating SOS ambulance button
function loadFooter() {
    const footerContainer = document.getElementById("footer-mount");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
    <!-- Floating Bottom-Left SOS Ambulance Pill Button -->
    <a href="emergency.html" class="floating-ambulance-btn" title="Immediate 24x7 Ambulance Dispatch">
        <span>⚠️</span> Ambulance - 102
    </a>

    <footer class="footer">
        <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:24px; text-align:left;">
            <div style="max-width:340px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <span class="brand-badge">DTU</span>
                    <strong style="color:#ffffff; font-size:1.05rem;">Health Center</strong>
                </div>
                <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6;">
                    Delhi Technological University · Shahbad Daulatpur, Main Bawana Road, Delhi-110042. 
                    Providing round-the-clock primary clinical aid and emergency response.
                </p>
            </div>
            <div>
                <h4 style="color:#ffffff; font-size:0.95rem; margin-bottom:12px;">Portals & Services</h4>
                <ul style="list-style:none; font-size:0.85rem; line-height:2;">
                    <li><a href="student-dashboard.html">Student OPD Portal</a></li>
                    <li><a href="doctor-dashboard.html">Doctor Clinical Portal</a></li>
                    <li><a href="emergency.html" style="color:#e63946; font-weight:600;">🚨 Campus SOS Dispatch</a></li>
                    <li><a href="javascript:void(0)" onclick="resetAllDemoData()" style="color:var(--text-subtle);">🔄 Reset DBMS State</a></li>
                </ul>
            </div>
            <div>
                <h4 style="color:#ffffff; font-size:0.95rem; margin-bottom:12px;">Emergency & OPD</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">📞 Health Center: <strong style="color:#fff;">011-27871018</strong></p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">🚑 Ambulance: <strong style="color:#e63946;">102 / 112</strong></p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">⏰ OPD Hours: <span style="color:#fff;">Mon–Sat 9:00 AM – 5:00 PM</span></p>
                <p style="font-size:0.85rem; color:#2ecc71; font-weight:600;">● Emergency Casualty: 24×7 Open</p>
            </div>
        </div>
        <div style="text-align:center; margin-top:30px; padding-top:18px; border-top:1px solid var(--border-glass); font-size:0.8rem; color:var(--text-subtle);">
            © 2026 Delhi Technological University (DTU) Health Center. Real-Time Cloud + SQLite 3 DBMS.
        </div>
    </footer>
    `;
}

// Master page initialization
function initPage(role) {
    if (typeof initData === "function") {
        initData();
    }
    const user = checkLogin(role);
    loadNavbar(role);
    loadFooter();
    applyTheme(getSavedTheme());

    // Trigger asynchronous sync with database file
    syncDatabaseFromServer();

    return user;
}
