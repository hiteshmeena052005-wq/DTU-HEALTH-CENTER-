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

// Sync data from Node.js database file (data/database.json)
async function syncDatabaseFromServer() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        if (res.ok) {
            console.log("🟢 Connected to DTU Health Center Database Engine");

            // Fetch live appointments from database
            const aptRes = await fetch(`${API_BASE}/appointments`);
            if (aptRes.ok) {
                const liveApts = await aptRes.json();
                localStorage.setItem("dtu_appointments", JSON.stringify(liveApts || []));
            }

            // Fetch live slots from database
            const slotRes = await fetch(`${API_BASE}/slots`);
            if (slotRes.ok) {
                const liveSlots = await slotRes.json();
                if (Array.isArray(liveSlots) && liveSlots.length > 0) {
                    localStorage.setItem("dtu_slots", JSON.stringify(liveSlots));
                }
            }

            // Fetch live notices
            const noticeRes = await fetch(`${API_BASE}/notices`);
            if (noticeRes.ok) {
                const liveNotices = await noticeRes.json();
                if (Array.isArray(liveNotices) && liveNotices.length > 0) {
                    localStorage.setItem("dtu_notices", JSON.stringify(liveNotices));
                }
            }

            // Fetch live prescriptions
            const rxRes = await fetch(`${API_BASE}/prescriptions`);
            if (rxRes.ok) {
                const liveRx = await rxRes.json();
                if (Array.isArray(liveRx) && liveRx.length > 0) {
                    localStorage.setItem("dtu_prescriptions", JSON.stringify(liveRx));
                }
            }

            // Fetch live referrals
            const refRes = await fetch(`${API_BASE}/referrals`);
            if (refRes.ok) {
                const liveRefs = await refRes.json();
                if (Array.isArray(liveRefs) && liveRefs.length > 0) {
                    localStorage.setItem("dtu_referrals", JSON.stringify(liveRefs));
                }
            }

            // Fetch live medicines inventory
            const medRes = await fetch(`${API_BASE}/medicines`);
            if (medRes.ok) {
                const liveMeds = await medRes.json();
                if (Array.isArray(liveMeds) && liveMeds.length > 0) {
                    localStorage.setItem("dtu_medicines", JSON.stringify(liveMeds));
                }
            }
        }
    } catch (e) {
        console.log("ℹ️ Server offline. Operating in autonomous local mode.");
    }
}

// Reset all test data in database & localStorage
async function resetAllDemoData() {
    if (confirm("Reset all test appointments, queues, and demo bookings to fresh clean state?")) {
        try {
            await fetch(`${API_BASE}/reset`, { method: "POST" });
        } catch (e) {}

        localStorage.clear();
        if (typeof initData === "function") {
            initData(true);
        }
        showNotification("All previous test data cleared! Fresh database state initialized.", "success");
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
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toast.style.marginBottom = "10px";
    toast.style.minWidth = "260px";
    toast.style.animation = "fadeIn 0.3s ease";
    toast.innerHTML = `<strong>${type === "success" ? "✓" : "!"}</strong> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Helpers for Database Operations
function getAppointments() {
    return JSON.parse(localStorage.getItem("dtu_appointments") || "[]");
}

async function saveAppointment(appointment) {
    const list = getAppointments();
    const exists = list.some(a => a.id === appointment.id);
    if (!exists) {
        list.unshift(appointment);
        localStorage.setItem("dtu_appointments", JSON.stringify(list));
    }

    // Auto update slot count in slots array
    let slots = JSON.parse(localStorage.getItem("dtu_slots") || "[]");
    const targetSlot = slots.find(s => 
        (appointment.slotId && s.id == appointment.slotId) || 
        (appointment.doctorName && s.doctorName === appointment.doctorName)
    );
    if (targetSlot) {
        targetSlot.bookedCount = Math.min(targetSlot.maxLimit || 10, (targetSlot.bookedCount || 0) + 1);
        localStorage.setItem("dtu_slots", JSON.stringify(slots));
    }

    // Persist to Server Database File
    try {
        await fetch(`${API_BASE}/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appointment)
        });
        console.log("💾 Saved to database (data/database.json)");
    } catch (e) {}

    // Broadcast live event to all other open tabs (Doctor Queue, Slot Monitor)
    broadcastDataChange('APPOINTMENT_BOOKED', { appointment, slotId: targetSlot ? targetSlot.id : appointment.slotId });
}

// Cancel appointment and accurately decrement slot count everywhere
async function cancelAppointmentAndFreeSlot(aptId, slotId, doctorName) {
    let list = getAppointments();
    const apt = list.find(a => a.id === aptId);
    list = list.filter(a => a.id !== aptId);
    localStorage.setItem("dtu_appointments", JSON.stringify(list));

    const targetSlotId = slotId || (apt ? apt.slotId : null);
    const targetDocName = doctorName || (apt ? apt.doctorName : null);

    let slots = JSON.parse(localStorage.getItem("dtu_slots") || "[]");
    const slot = slots.find(s => 
        (targetSlotId && s.id == targetSlotId) || 
        (targetDocName && s.doctorName === targetDocName)
    );

    if (slot) {
        // Recount active non-cancelled appointments for this doctor/slot
        const activeRemaining = list.filter(a => 
            (a.slotId && a.slotId == slot.id) || 
            (a.doctorName && a.doctorName === slot.doctorName)
        ).length;
        slot.bookedCount = Math.max(0, activeRemaining);
        localStorage.setItem("dtu_slots", JSON.stringify(slots));
        console.log(`📉 Slot capacity updated: ${slot.bookedCount}/${slot.maxLimit} for ${slot.doctorName}`);
    }

    // Inform Database Server
    try {
        await fetch(`${API_BASE}/appointments/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: aptId, slotId: targetSlotId, doctorName: targetDocName })
        });
        console.log("💾 Cancellation synced to database file (data/database.json)");
    } catch (e) {}

    // Update Firebase if active
    if (typeof isFirebaseConnected !== 'undefined' && isFirebaseConnected && db) {
        try {
            const snap = await db.collection("appointments").where("id", "==", aptId).get();
            snap.forEach(doc => doc.ref.delete());
        } catch (e) {}
    }

    // Broadcast cancellation to all tabs (Doctor Dashboard, Booking page)
    broadcastDataChange('APPOINTMENT_CANCELLED', { id: aptId, slotId: targetSlotId, doctorName: targetDocName });
}

function getPrescriptions() {
    return JSON.parse(localStorage.getItem("dtu_prescriptions") || "[]");
}

async function savePrescription(prescription) {
    const list = getPrescriptions();
    list.unshift(prescription);
    localStorage.setItem("dtu_prescriptions", JSON.stringify(list));

    try {
        await fetch(`${API_BASE}/prescriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prescription)
        });
        console.log("💾 Prescription saved to Hospital DBMS (database/hospital.db)");
    } catch (e) {}

    broadcastDataChange('PRESCRIPTION_ADDED', { prescription });
}

function getReferrals() {
    return JSON.parse(localStorage.getItem("dtu_referrals") || "[]");
}

async function saveReferral(referral) {
    const list = getReferrals();
    list.unshift(referral);
    localStorage.setItem("dtu_referrals", JSON.stringify(list));

    try {
        await fetch(`${API_BASE}/referrals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(referral)
        });
        console.log("💾 Referral saved to Hospital DBMS (database/hospital.db)");
    } catch (e) {}

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
    return JSON.parse(localStorage.getItem("dtu_notices") || "[]");
}

async function saveNotice(notice) {
    const list = getNotices();
    list.unshift(notice);
    localStorage.setItem("dtu_notices", JSON.stringify(list));

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
    let slots = JSON.parse(localStorage.getItem("dtu_slots") || "[]");
    const appointments = getAppointments();
    let updated = false;

    slots.forEach(slot => {
        if (!slot.maxLimit) slot.maxLimit = 10;
        
        // Count active appointments for this doctor/slot
        const activeCount = appointments.filter(a => 
            (a.slotId && a.slotId == slot.id) || (a.doctorName && a.doctorName === slot.doctorName)
        ).length;

        // Auto-heal any overflow, negative, or desynced slot counts
        if (slot.bookedCount > slot.maxLimit || slot.bookedCount !== activeCount) {
            slot.bookedCount = Math.min(slot.maxLimit, activeCount);
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem("dtu_slots", JSON.stringify(slots));
    }
    return slots;
}

async function saveSlot(slot) {
    const list = JSON.parse(localStorage.getItem("dtu_slots") || "[]");
    list.unshift(slot);
    localStorage.setItem("dtu_slots", JSON.stringify(list));

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
    // Reconciles slot count directly from getSlots() auto-heal
    getSlots();
}

function getMedicines() {
    return JSON.parse(localStorage.getItem("dtu_medicines") || "[]");
}

async function updateMedicineStock(id, newStock) {
    const list = getMedicines();
    const item = list.find(m => m.id == id);
    if (item) {
        item.stock = parseInt(newStock);
        localStorage.setItem("dtu_medicines", JSON.stringify(list));

        try {
            await fetch(`${API_BASE}/medicines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: id, stock: parseInt(newStock) })
            });
        } catch (e) {}
    }
}

// Dynamic navbar
function loadNavbar(role) {
    const headerContainer = document.getElementById("navbar-mount");
    if (!headerContainer) return;

    const user = getCurrentUser();
    const userName = user ? (user.name || "User") : "Account";
    const currentPage = window.location.pathname.split("/").pop();

    let homeUrl = "index.html";
    if (role === "student" || (user && user.role === "student")) {
        homeUrl = "student-dashboard.html";
    } else if (role === "doctor" || (user && user.role === "doctor")) {
        homeUrl = "doctor-dashboard.html";
    }

    let navHtml = `
    <nav class="navbar">
        <div class="nav-brand">
            <a href="${homeUrl}" style="color:white; display:flex; align-items:center; gap:8px;">
                🏥 DTU <span>Health Center</span>
            </a>
        </div>
        <ul class="nav-links">
    `;

    if (role === "student") {
        navHtml += `
            <li><a href="student-dashboard.html" class="nav-link ${currentPage === 'student-dashboard.html' ? 'active' : ''}">Home / Dashboard</a></li>
            <li><a href="book-appointment.html" class="nav-link ${currentPage === 'book-appointment.html' ? 'active' : ''}">Book Appointment</a></li>
            <li><a href="prescriptions.html" class="nav-link ${currentPage === 'prescriptions.html' ? 'active' : ''}">Prescriptions</a></li>
            <li><a href="video-call.html" class="nav-link ${currentPage === 'video-call.html' ? 'active' : ''}">Video Call</a></li>
            <li><a href="health-tips.html" class="nav-link ${currentPage === 'health-tips.html' ? 'active' : ''}">Health Tips</a></li>
            <li><a href="emergency.html" class="nav-link" style="background:#dc3545; color:white; font-weight:bold; border-radius:4px;">🚑 SOS</a></li>
            <li><a href="student-profile.html" class="nav-link" title="My Profile">👤 ${userName}</a></li>
            <li><a href="javascript:void(0)" onclick="logout()" class="nav-link" style="color:#ffc107;">Logout</a></li>
        `;
    } else if (role === "doctor") {
        navHtml += `
            <li><a href="doctor-dashboard.html" class="nav-link ${currentPage === 'doctor-dashboard.html' ? 'active' : ''}">Home / Dashboard</a></li>
            <li><a href="doctor-dashboard.html#availability-section" class="nav-link">Post Slots</a></li>
            <li><a href="doctor-dashboard.html#notice-section" class="nav-link">Announcements</a></li>
            <li><a href="referral.html" class="nav-link ${currentPage === 'referral.html' ? 'active' : ''}">Refer Patient</a></li>
            <li><a href="prescriptions.html" class="nav-link ${currentPage === 'prescriptions.html' ? 'active' : ''}">Prescriptions</a></li>
            <li><a href="video-call.html" class="nav-link ${currentPage === 'video-call.html' ? 'active' : ''}">Video Room</a></li>
            <li><a href="medicine-inventory.html" class="nav-link ${currentPage === 'medicine-inventory.html' ? 'active' : ''}">Dispensary Stock</a></li>
            <li><span class="nav-link" style="color:#C5A55A;">👨‍⚕️ ${userName}</span></li>
            <li><a href="javascript:void(0)" onclick="logout()" class="nav-link" style="color:#ffc107;">Logout</a></li>
        `;
    } else {
        navHtml += `
            <li><a href="index.html" class="nav-link active">Home</a></li>
            <li><a href="emergency.html" class="nav-link" style="background:#dc3545; color:white;">Emergency</a></li>
            <li><a href="login.html" class="nav-link btn btn-secondary btn-small" style="color:#800020;">Login</a></li>
        `;
    }

    navHtml += `
        </ul>
    </nav>
    `;

    headerContainer.innerHTML = navHtml;
}

// Render standard DTU footer
function loadFooter() {
    const footerContainer = document.getElementById("footer-mount");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
    <footer class="footer">
        <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:20px; text-align:left;">
            <div>
                <h4 style="color:var(--accent); margin-bottom:8px;">DTU Health Center</h4>
                <p style="font-size:0.9rem; color:#ddd; max-width:320px;">
                    Providing round-the-clock primary medical aid, doctor consultations, and health welfare support to all students and staff of Delhi Technological University.
                </p>
                <p style="margin-top:8px; font-size:0.85rem; color:#bbb;">📍 Shahbad Daulatpur, Main Bawana Road, Delhi-110042</p>
            </div>
            <div>
                <h4 style="color:var(--accent); margin-bottom:8px;">Quick Links</h4>
                <ul style="list-style:none; font-size:0.9rem; line-height:1.8;">
                    <li><a href="student-dashboard.html" style="color:#eee;">Student Portal</a></li>
                    <li><a href="doctor-dashboard.html" style="color:#eee;">Doctor Portal (Admin)</a></li>
                    <li><a href="emergency.html" style="color:#ff8888;">Instant Ambulance / SOS</a></li>
                    <li><a href="javascript:void(0)" onclick="resetAllDemoData()" style="color:#bbb; font-size:0.8rem;">🔄 Reset Database Data</a></li>
                </ul>
            </div>
            <div>
                <h4 style="color:var(--accent); margin-bottom:8px;">Emergency Helpdesk</h4>
                <p style="font-size:0.9rem; color:#ddd;">📞 Health Center: <strong>011-27871018</strong></p>
                <p style="font-size:0.9rem; color:#ddd;">🚑 Ambulance: <strong>102 / 112</strong></p>
                <p style="font-size:0.9rem; color:#ddd;">⏰ Regular OPD: <strong>Mon - Sat: 9:00 AM - 5:00 PM</strong></p>
                <p style="font-size:0.9rem; color:#ddd;">🚨 Emergency: <strong>24 Hours Open</strong></p>
            </div>
        </div>
        <div style="text-align:center; margin-top:25px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#bbb;">
            © 2026 Delhi Technological University (DTU) Health Center. Minor Project Database Engine.
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

    // Trigger asynchronous sync with database file
    syncDatabaseFromServer();

    return user;
}
