// DTU Health Center - Common Application Logic

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

    // If student has not set up profile yet, redirect to profile setup
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

// Reset all test data to a fresh clean state
function resetAllDemoData() {
    if (confirm("Reset all test appointments, queues, and demo bookings to fresh clean state?")) {
        localStorage.clear();
        if (typeof initData === "function") {
            initData(true);
        }
        showNotification("All previous test data cleared! Fresh state initialized.", "success");
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

// Helpers for localStorage data
function getAppointments() {
    return JSON.parse(localStorage.getItem("dtu_appointments") || "[]");
}

function saveAppointment(appointment) {
    const list = getAppointments();
    list.unshift(appointment);
    localStorage.setItem("dtu_appointments", JSON.stringify(list));
}

function getPrescriptions() {
    return JSON.parse(localStorage.getItem("dtu_prescriptions") || "[]");
}

function savePrescription(prescription) {
    const list = getPrescriptions();
    list.unshift(prescription);
    localStorage.setItem("dtu_prescriptions", JSON.stringify(list));
}

function getNotices() {
    return JSON.parse(localStorage.getItem("dtu_notices") || "[]");
}

function saveNotice(notice) {
    const list = getNotices();
    list.unshift(notice);
    localStorage.setItem("dtu_notices", JSON.stringify(list));
}

function getSlots() {
    return JSON.parse(localStorage.getItem("dtu_slots") || "[]");
}

function saveSlot(slot) {
    const list = getSlots();
    list.unshift(slot);
    localStorage.setItem("dtu_slots", JSON.stringify(list));
}

function updateSlotBookedCount(slotId) {
    const list = getSlots();
    const target = list.find(s => s.id == slotId);
    if (target) {
        target.bookedCount = (target.bookedCount || 0) + 1;
        localStorage.setItem("dtu_slots", JSON.stringify(list));
    }
}

function getMedicines() {
    return JSON.parse(localStorage.getItem("dtu_medicines") || "[]");
}

function updateMedicineStock(id, newStock) {
    const list = getMedicines();
    const item = list.find(m => m.id == id);
    if (item) {
        item.stock = parseInt(newStock);
        localStorage.setItem("dtu_medicines", JSON.stringify(list));
    }
}

// Render dynamic navbar based on role
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
                    <li><a href="javascript:void(0)" onclick="resetAllDemoData()" style="color:#bbb; font-size:0.8rem;">🔄 Reset Demo Data</a></li>
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
            © 2026 Delhi Technological University (DTU) Health Center. Minor Project Prototype.
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
    return user;
}
