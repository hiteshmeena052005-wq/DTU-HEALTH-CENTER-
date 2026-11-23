// =============================================================================
// DTU Health Center - Common Application Logic, Supabase Bridge & State Controller
// =============================================================================

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
        // Sync memory store if updated in another tab
        if (typeof loadClientStore === 'function') {
            const stored = loadClientStore();
            if (stored) window._dtuMemoryDB = stored;
        }
        syncListeners.forEach(cb => {
            try { cb(event.data); } catch (e) {}
        });
    };
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'dtu_client_store' || (e.key && e.key.startsWith('dtu_'))) {
            if (typeof loadClientStore === 'function') {
                const stored = loadClientStore();
                if (stored) window._dtuMemoryDB = stored;
            }
            syncListeners.forEach(cb => {
                try { cb({ type: 'STORAGE_UPDATE', key: e.key }); } catch (err) {}
            });
        }
    });
}

// Setup Supabase live postgres_changes listener when configured
function initSupabaseRealtimeSync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        const tables = ['appointments', 'doctor_slots', 'consultations', 'referrals', 'notifications', 'emergency_sos_logs'];
        tables.forEach(tableName => {
            try {
                SupabaseService.subscribeRealtime(tableName, (payload) => {
                    broadcastDataChange('SUPABASE_' + tableName.toUpperCase(), payload);
                    syncListeners.forEach(cb => {
                        try { cb({ type: 'SUPABASE_REALTIME', table: tableName, payload }); } catch (e) {}
                    });
                });
            } catch (err) {
                console.warn(`Supabase realtime subscription for ${tableName} skipped:`, err.message);
            }
        });
    }
}

// -----------------------------------------------------------------------------
// User Session Management
// -----------------------------------------------------------------------------
function getCurrentUser() {
    try {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

function checkLogin(expectedRole) {
    const user = getCurrentUser();
    if (user) {
        return user;
    }
    // Return clean default role context for seamless UI browsing
    const defaultUser = {
        role: expectedRole || 'student',
        name: expectedRole === 'doctor' ? 'Dr. Ravi Bansal' : 'Rahul Sharma',
        email: expectedRole === 'doctor' ? 'dr.ravibansal@dtu.ac.in' : 'rahul@dtu.ac.in',
        department: expectedRole === 'doctor' ? 'General Medicine (OPD)' : undefined
    };
    try {
        localStorage.setItem("currentUser", JSON.stringify(defaultUser));
        localStorage.setItem("userRole", defaultUser.role);
    } catch (e) {}
    return defaultUser;
}

// Sign out user and clear active session
async function logout() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.signOutUser();
            return;
        } catch (e) {
            console.warn("Supabase signout warning:", e.message);
        }
    }
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("studentProfile");
    localStorage.removeItem("dtu_supabase_auth_token");
    window.location.href = "login.html";
}

// Show toast alert notification
function showNotification(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "99999";
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

// -----------------------------------------------------------------------------
// Data Store Operations (Dual-Mode: Live Supabase + Seamless Memory Fallback)
// -----------------------------------------------------------------------------

// Appointments
function getAppointments() {
    const all = (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) return all;

    if (user.role === 'student') {
        const studentEmail = (user.email || '').toLowerCase().trim();
        const studentId = user.id;
        const studentRoll = (user.rollNo || '').toLowerCase().trim();
        const studentName = (user.name || '').toLowerCase().trim();

        return all.filter(a => {
            const aptEmail = (a.studentEmail || '').toLowerCase().trim();
            const aptId = a.studentId;
            const aptRoll = (a.rollNo || '').toLowerCase().trim();
            const aptName = (a.studentName || '').toLowerCase().trim();

            if (studentEmail && aptEmail && studentEmail === aptEmail) return true;
            if (studentId && aptId && studentId === aptId) return true;
            if (studentRoll && aptRoll && studentRoll === aptRoll) return true;
            if (studentName && aptName && studentName !== 'student' && studentName === aptName) return true;
            return false;
        });
    }

    if (user.role === 'doctor') {
        const doctorName = (user.name || '').toLowerCase().trim();
        const doctorId = user.id;
        return all.filter(a => {
            const aptDocName = (a.doctorName || '').toLowerCase().trim();
            const aptDocId = a.doctorId;
            if (doctorId && aptDocId && doctorId === aptDocId) return true;
            if (doctorName && aptDocName && (aptDocName.includes(doctorName) || doctorName.includes(aptDocName))) return true;
            return false;
        });
    }

    return all;
}

async function fetchAppointmentsAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getAppointments();
            if (window._dtuMemoryDB) {
                window._dtuMemoryDB.appointments = data;
            }
            return data;
        } catch (e) {
            console.warn("Live fetch appointments failed, using local store:", e.message);
        }
    }
    return getAppointments();
}

async function saveAppointment(appointment) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.bookAppointment(appointment);
        } catch (e) {
            console.error("Supabase booking failed, falling back to local store:", e.message);
        }
    }

    const list = getAppointments();
    const exists = list.some(a => a.id === appointment.id);
    if (!exists) {
        list.unshift(appointment);
    }

    // Update slot count in slots array
    let slots = getSlots();
    const targetSlot = slots.find(s => 
        (appointment.slotId && s.id == appointment.slotId) || 
        (appointment.doctorName && s.doctorName === appointment.doctorName)
    );
    if (targetSlot) {
        targetSlot.bookedCount = Math.min(targetSlot.maxLimit || 10, (targetSlot.bookedCount || 0) + 1);
    }

    // Persist to client store
    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }

    broadcastDataChange('APPOINTMENT_BOOKED', { appointment, slotId: targetSlot ? targetSlot.id : appointment.slotId });
}

async function cancelAppointmentAndFreeSlot(aptId, slotId, doctorName) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.cancelAppointment(aptId);
        } catch (e) {
            console.warn("Supabase cancel failed, using local fallback:", e.message);
        }
    }

    let allApts = (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];
    const apt = allApts.find(a => a.id === aptId);
    window._dtuMemoryDB.appointments = allApts.filter(a => a.id !== aptId);

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
    }

    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }

    broadcastDataChange('APPOINTMENT_CANCELLED', { id: aptId, slotId: targetSlotId, doctorName: targetDocName });
}

// Prescriptions / Consultations
function getPrescriptions() {
    const all = (window._dtuMemoryDB && window._dtuMemoryDB.prescriptions) || [];
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) return all;

    if (user.role === 'student') {
        const studentEmail = (user.email || '').toLowerCase().trim();
        const studentId = user.id;
        const studentRoll = (user.rollNo || '').toLowerCase().trim();
        const studentName = (user.name || '').toLowerCase().trim();

        return all.filter(p => {
            const rxEmail = (p.studentEmail || '').toLowerCase().trim();
            const rxId = p.studentId;
            const rxRoll = (p.rollNo || '').toLowerCase().trim();
            const rxName = (p.studentName || '').toLowerCase().trim();

            if (studentEmail && rxEmail && studentEmail === rxEmail) return true;
            if (studentId && rxId && studentId === rxId) return true;
            if (studentRoll && rxRoll && studentRoll === rxRoll) return true;
            if (studentName && rxName && studentName !== 'student' && studentName === rxName) return true;
            return false;
        });
    }

    if (user.role === 'doctor') {
        const doctorName = (user.name || '').toLowerCase().trim();
        const doctorId = user.id;
        return all.filter(p => {
            const rxDocName = (p.doctorName || '').toLowerCase().trim();
            const rxDocId = p.doctorId;
            if (doctorId && rxDocId && doctorId === rxDocId) return true;
            if (doctorName && rxDocName && (rxDocName.includes(doctorName) || doctorName.includes(rxDocName))) return true;
            return false;
        });
    }

    return all;
}

async function fetchPrescriptionsAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getPrescriptions();
            if (window._dtuMemoryDB) {
                window._dtuMemoryDB.prescriptions = data;
            }
            return data;
        } catch (e) {
            console.warn("Live fetch prescriptions failed:", e.message);
        }
    }
    return getPrescriptions();
}

async function savePrescription(prescription) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.createPrescription(prescription);
        } catch (e) {
            console.error("Supabase create prescription failed, fallback:", e.message);
        }
    }

    if (!window._dtuMemoryDB) window._dtuMemoryDB = {};
    if (!Array.isArray(window._dtuMemoryDB.prescriptions)) window._dtuMemoryDB.prescriptions = [];
    window._dtuMemoryDB.prescriptions.unshift(prescription);

    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }
    broadcastDataChange('PRESCRIPTION_ADDED', { prescription });
}

// Referrals
function getReferrals() {
    const all = (window._dtuMemoryDB && window._dtuMemoryDB.referrals) || [];
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) return all;

    if (user.role === 'student') {
        const studentEmail = (user.email || '').toLowerCase().trim();
        const studentId = user.id;
        const studentRoll = (user.rollNo || '').toLowerCase().trim();
        const studentName = (user.name || '').toLowerCase().trim();

        return all.filter(r => {
            const rEmail = (r.studentEmail || '').toLowerCase().trim();
            const rId = r.studentId;
            const rRoll = (r.rollNo || '').toLowerCase().trim();
            const rName = (r.studentName || '').toLowerCase().trim();

            if (studentEmail && rEmail && studentEmail === rEmail) return true;
            if (studentId && rId && studentId === rId) return true;
            if (studentRoll && rRoll && studentRoll === rRoll) return true;
            if (studentName && rName && studentName !== 'student' && studentName === rName) return true;
            return false;
        });
    }

    if (user.role === 'doctor') {
        const doctorName = (user.name || '').toLowerCase().trim();
        const doctorId = user.id;
        return all.filter(r => {
            const fromDoc = (r.fromDoctor || '').toLowerCase().trim();
            const toDoc = (r.toDoctor || '').toLowerCase().trim();
            return (doctorId && (r.fromDoctorId === doctorId || r.toDoctorId === doctorId)) ||
                   (doctorName && (fromDoc.includes(doctorName) || toDoc.includes(doctorName)));
        });
    }

    return all;
}

async function fetchReferralsAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getReferrals();
            if (window._dtuMemoryDB) {
                window._dtuMemoryDB.referrals = data;
            }
            return data;
        } catch (e) {
            console.warn("Live fetch referrals failed:", e.message);
        }
    }
    return getReferrals();
}

async function saveReferral(referral) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.createReferral(referral);
        } catch (e) {
            console.error("Supabase create referral failed, fallback:", e.message);
        }
    }

    const list = getReferrals();
    list.unshift(referral);
    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }
    broadcastDataChange('REFERRAL_ADDED', { referral });
}

// Emergency SOS
async function triggerEmergencySOS(sosData) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.triggerSOS(sosData);
        } catch (e) {
            console.error("Supabase emergency SOS failed, broadcasting locally:", e.message);
        }
    }
    broadcastDataChange('EMERGENCY_SOS', sosData);
}

// Notices & Advisories
function getNotices() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.notices) || [];
}

async function fetchNoticesAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getNotices();
            if (window._dtuMemoryDB) {
                window._dtuMemoryDB.notices = data;
            }
            return data;
        } catch (e) {
            console.warn("Live fetch notices failed:", e.message);
        }
    }
    return getNotices();
}

async function saveNotice(notice) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.createNotice(notice);
        } catch (e) {
            console.error("Supabase notice creation failed, fallback:", e.message);
        }
    }

    const list = getNotices();
    list.unshift(notice);
    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }
    broadcastDataChange('NOTICE_ADDED', { notice });
}

// Slots
function getSlots(filterDoctor) {
    let slots = (window._dtuMemoryDB && window._dtuMemoryDB.slots) || [];
    const appointments = (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];

    slots.forEach(slot => {
        if (!slot.maxLimit) slot.maxLimit = 10;
        const activeCount = appointments.filter(a => 
            (a.slotId && a.slotId == slot.id) || (a.doctorName && a.doctorName === slot.doctorName)
        ).length;
        if (slot.bookedCount > slot.maxLimit || slot.bookedCount !== activeCount) {
            slot.bookedCount = Math.min(slot.maxLimit, activeCount);
        }
    });

    if (filterDoctor) {
        const docStr = String(filterDoctor).toLowerCase().trim();
        return slots.filter(s => {
            const sName = (s.doctorName || '').toLowerCase().trim();
            const sId = String(s.doctorId || s.id || '');
            return (sId && sId === docStr) || (sName && (sName.includes(docStr) || docStr.includes(sName)));
        });
    }

    return slots;
}

async function fetchSlotsAsync(doctorId, doctorName) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getSlots(doctorId, doctorName);
            if (window._dtuMemoryDB) {
                if (!doctorId && !doctorName) {
                    window._dtuMemoryDB.slots = data;
                }
            }
            return data;
        } catch (e) {
            console.warn("Live fetch slots failed:", e.message);
        }
    }
    return getSlots(doctorName || doctorId);
}

async function saveSlot(slot) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.createSlot(slot);
        } catch (e) {
            console.error("Supabase create slot failed, fallback:", e.message);
        }
    }

    const list = getSlots();
    list.unshift(slot);
    if (typeof saveClientStore === 'function') {
        saveClientStore(window._dtuMemoryDB);
    }
    broadcastDataChange('SLOT_ADDED', { slot });
}

// Medicine Inventory
function getMedicines() {
    return (window._dtuMemoryDB && window._dtuMemoryDB.medicines) || [];
}

async function fetchMedicinesAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getMedicines();
            if (window._dtuMemoryDB) {
                window._dtuMemoryDB.medicines = data;
            }
            return data;
        } catch (e) {
            console.warn("Live fetch medicines failed:", e.message);
        }
    }
    return getMedicines();
}

async function updateMedicineStock(id, newStock) {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            await SupabaseService.updateMedicineStock(id, newStock);
        } catch (e) {
            console.warn("Supabase update stock failed, fallback:", e.message);
        }
    }

    const list = getMedicines();
    const item = list.find(m => m.id == id);
    if (item) {
        item.stock = parseInt(newStock);
        if (typeof saveClientStore === 'function') {
            saveClientStore(window._dtuMemoryDB);
        }
        broadcastDataChange('MEDICINE_STOCK_UPDATED', { id, stock: item.stock });
    }
}

// Health Tips
function getHealthTips() {
    return (typeof healthTips !== 'undefined' ? healthTips : []);
}

async function fetchHealthTipsAsync() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isLive()) {
        try {
            const data = await SupabaseService.getHealthTips();
            return data;
        } catch (e) {}
    }
    return getHealthTips();
}

// -----------------------------------------------------------------------------
// Dynamic Floating Pill Navbar
// -----------------------------------------------------------------------------
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
        <nav class="navbar" id="mainNavbar">
            <div class="navbar-header">
                <a href="${homeUrl}" class="nav-brand">
                    <span class="brand-badge">DTU</span>
                    <span class="brand-text">Health</span>
                    <span class="brand-accent">Center</span>
                </a>
                <div class="nav-mobile-controls">
                    <button id="themeToggleBtnMobile" class="theme-toggle-btn mobile-only-control" onclick="toggleTheme()" title="${themeTitle}" aria-label="${themeTitle}">${themeIcon}</button>
                    <button id="navHamburgerBtn" class="nav-hamburger-btn" onclick="toggleMobileNav()" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
                </div>
            </div>
            <div class="nav-collapse-menu" id="navCollapseMenu">
                <ul class="nav-links">
                    ${navLinksHtml}
                </ul>
                <div class="nav-right">
                    <button id="themeToggleBtn" class="theme-toggle-btn desktop-only-control" onclick="toggleTheme()" title="${themeTitle}" aria-label="${themeTitle}">${themeIcon}</button>
                    ${userRightHtml}
                </div>
            </div>
        </nav>
    </div>
    `;

    headerContainer.innerHTML = navHtml;
    applyTheme(currentTheme);
}

// -----------------------------------------------------------------------------
// Mobile Navigation Drawer Toggle
// -----------------------------------------------------------------------------
function toggleMobileNav() {
    const nav = document.getElementById('mainNavbar') || document.querySelector('.navbar');
    const btn = document.getElementById('navHamburgerBtn');
    if (!nav) return;

    nav.classList.toggle('nav-expanded');
    const isExpanded = nav.classList.contains('nav-expanded');
    if (btn) {
        btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        btn.innerHTML = isExpanded ? '✕' : '☰';
    }
}

// Auto-close mobile navbar when any nav-link is tapped
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('nav-link')) {
            const nav = document.getElementById('mainNavbar') || document.querySelector('.navbar');
            if (nav && nav.classList.contains('nav-expanded')) {
                nav.classList.remove('nav-expanded');
                const btn = document.getElementById('navHamburgerBtn');
                if (btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.innerHTML = '☰';
                }
            }
        }
    });
}

// -----------------------------------------------------------------------------
// Theme Management (Dark Glassmorphism <-> Modern Light Mode)
// -----------------------------------------------------------------------------
function getSavedTheme() {
    try {
        return localStorage.getItem('dtu_theme') || localStorage.getItem('app_theme') || 'dark';
    } catch (e) {
        return 'dark';
    }
}

function applyTheme(theme) {
    const isLight = (theme === 'light');
    if (document.body) {
        if (isLight) document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
    }
    if (document.documentElement) {
        if (isLight) document.documentElement.classList.add('light-mode');
        else document.documentElement.classList.remove('light-mode');
    }

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.innerHTML = isLight ? '☀️' : '🌙';
        const label = isLight ? 'Switch to Dark Glass Mode' : 'Switch to Light Mode';
        btn.title = label;
        btn.setAttribute('aria-label', label);
    });
}

function toggleTheme() {
    const current = getSavedTheme();
    const nextTheme = current === 'light' ? 'dark' : 'light';
    try {
        localStorage.setItem('dtu_theme', nextTheme);
        localStorage.setItem('app_theme', nextTheme);
    } catch (e) {}
    applyTheme(nextTheme);

    if (typeof showNotification === 'function') {
        showNotification(nextTheme === 'light' ? '☀️ Light Mode Activated' : '🌙 Dark Glass Mode Activated', 'info');
    }
}

// -----------------------------------------------------------------------------
// Footer & Supabase Configuration Modal Mount
// -----------------------------------------------------------------------------
function loadFooter() {
    const footerContainer = document.getElementById("footer-mount");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
    <!-- Floating Bottom-Left SOS Ambulance Pill Button -->
    <a href="emergency.html" class="floating-ambulance-btn" title="Immediate 24x7 Ambulance Dispatch">
        <span>⚠️</span> Ambulance - 102
    </a>

    <!-- Supabase Connection Config Modal -->
    <div id="supabaseModalBackdrop" class="supabase-modal-backdrop" onclick="if(event.target === this) closeSupabaseConfigModal();">
        <div class="supabase-modal-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:#ffffff; margin:0;">
                        ⚙️ Supabase Backend Settings
                    </h3>
                    <p style="font-size:0.84rem; color:var(--text-muted); margin-top:4px;">
                        Connect your live Supabase project to the DTU Health Center portal.
                    </p>
                </div>
                <button type="button" onclick="closeSupabaseConfigModal()" style="background:transparent; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
            </div>

            <form onsubmit="saveSupabaseConfigFromModal(event)">
                <div class="form-group" style="margin-bottom:14px;">
                    <label class="form-label" style="font-size:0.85rem; font-weight:600; color:#fff;">Supabase Project URL / ID</label>
                    <input type="text" id="modalSupabaseUrl" class="form-input" placeholder="e.g. zifgkxkrpimyxjaqjvwd or https://zifgkxkrpimyxjaqjvwd.supabase.co" required>
                    <small style="color:var(--text-subtle); font-size:0.75rem;">Found in your Supabase Dashboard under Project Settings &gt; API</small>
                </div>

                <div class="form-group" style="margin-bottom:18px;">
                    <label class="form-label" style="font-size:0.85rem; font-weight:600; color:#fff;">Supabase Anon / Publishable Key</label>
                    <input type="text" id="modalSupabaseAnonKey" class="form-input" placeholder="sb_publishable_... or eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required>
                    <small style="color:#ff6b6b; font-size:0.75rem; display:block; margin-top:3px;">
                        🛡️ Strict Security: Use ONLY the anon/publishable key. NEVER expose your service_role secret key in frontend code.
                    </small>
                </div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" class="btn btn-pill-primary" style="flex:2; padding:10px;">
                        Save &amp; Connect Live
                    </button>
                    <button type="button" onclick="resetSupabaseConfigFromModal()" class="btn btn-pill-glass" style="flex:1; padding:10px; border-color:rgba(230,57,70,0.4); color:#ff6b6b;">
                        Reset / Demo
                    </button>
                </div>
            </form>
        </div>
    </div>

    <footer class="footer">
        <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:24px; text-align:left;">
            <div style="max-width:340px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <span class="brand-badge">DTU</span>
                    <strong style="color:#ffffff; font-size:1.05rem;">Health Center</strong>
                </div>
                <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6;">
                    Delhi Technological University · Shahbad Daulatpur, Main Bawana Road, Delhi-110042.<br>
                    Featuring a full-fledged 20-bed hospital block, day &amp; evening medical practitioners, and weekly visiting specialized doctors (ENT, eye, dental, nutrition).
                </p>
            </div>
            <div>
                <h4 style="color:#ffffff; font-size:0.95rem; margin-bottom:12px;">Portals &amp; Services</h4>
                <ul style="list-style:none; font-size:0.85rem; line-height:2;">
                    <li><a href="student-dashboard.html">Student OPD Portal</a></li>
                    <li><a href="doctor-dashboard.html">Doctor Clinical Portal</a></li>
                    <li><a href="emergency.html" style="color:#e63946; font-weight:600;">🚨 Campus SOS Dispatch</a></li>
                </ul>
            </div>
            <div>
                <h4 style="color:#ffffff; font-size:0.95rem; margin-bottom:12px;">Emergency &amp; OPD</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">📞 Health Center: <strong style="color:#fff;">011-27871018</strong></p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">🚑 Ambulance: <strong style="color:#e63946;">102 / 112</strong></p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">⏰ OPD Hours: <span style="color:#fff;">Mon–Sat 9:00 AM – 5:00 PM</span></p>
                <p style="font-size:0.85rem; color:#2ecc71; font-weight:600;">● Emergency Casualty: 24×7 Open</p>
            </div>
        </div>
        <div style="text-align:center; margin-top:30px; padding-top:18px; border-top:1px solid var(--border-glass); font-size:0.8rem; color:var(--text-subtle);">
            © 2026 Delhi Technological University (DTU) Health Center. All rights reserved.
        </div>
    </footer>
    `;
}

function openSupabaseConfigModal() {
    const modal = document.getElementById('supabaseModalBackdrop');
    if (!modal) return;
    const urlInput = document.getElementById('modalSupabaseUrl');
    const keyInput = document.getElementById('modalSupabaseAnonKey');

    if (window.DTU_SUPABASE) {
        const currentUrl = window.DTU_SUPABASE.getUrl();
        const currentKey = window.DTU_SUPABASE.getAnonKey();
        if (currentUrl && !currentUrl.includes('your-project-id')) urlInput.value = currentUrl;
        if (currentKey && !currentKey.includes('your-anon')) keyInput.value = currentKey;
    }

    modal.style.display = 'flex';
}

function closeSupabaseConfigModal() {
    const modal = document.getElementById('supabaseModalBackdrop');
    if (modal) modal.style.display = 'none';
}

function saveSupabaseConfigFromModal(event) {
    event.preventDefault();
    let url = document.getElementById('modalSupabaseUrl').value.trim();
    const key = document.getElementById('modalSupabaseAnonKey').value.trim();

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        if (!url.includes('.')) {
            url = `https://${url}.supabase.co`;
        } else {
            url = `https://${url}`;
        }
    }

    if (!url.startsWith('https://')) {
        alert('Invalid Supabase Project URL. Must start with https://');
        return;
    }
    if (key.length < 20) {
        alert('Invalid Supabase Publishable / Anon Key.');
        return;
    }

    if (window.DTU_SUPABASE && window.DTU_SUPABASE.saveCredentials) {
        window.DTU_SUPABASE.saveCredentials(url, key);
    }
}

function resetSupabaseConfigFromModal() {
    if (confirm('Reset to demo offline mode? This will clear locally entered Supabase credentials.')) {
        if (window.DTU_SUPABASE && window.DTU_SUPABASE.clearCredentials) {
            window.DTU_SUPABASE.clearCredentials();
        }
    }
}

// -----------------------------------------------------------------------------
// Master page initialization
// -----------------------------------------------------------------------------
function initPage(role) {
    if (typeof initData === "function") {
        initData();
    }
    const user = checkLogin(role);
    loadNavbar(role);
    loadFooter();
    applyTheme(getSavedTheme());
    initSupabaseRealtimeSync();

    return user;
}
