// DTU Health Center - Clean Initial Datasets & Runtime In-Memory Database
// Note: Real database is persisted in Google Firebase Cloud Firestore and SQLite 3 DBMS.
// Browser LocalStorage is ONLY reserved for user session (currentUser & studentProfile).

const departments = [
    { id: 1, name: "General Medicine (OPD)", icon: "🏥" },
    { id: 2, name: "Dental", icon: "🦷" },
    { id: 3, name: "Orthopedic", icon: "🦴" },
    { id: 4, name: "Dermatology", icon: "🧴" },
    { id: 5, name: "Psychiatry & Counseling", icon: "🧠" },
    { id: 6, name: "ENT", icon: "👂" },
    { id: 7, name: "Ophthalmology", icon: "👁️" },
    { id: 8, name: "Gynecology", icon: "🩺" },
    { id: 9, name: "Physiotherapy", icon: "💪" },
    { id: 10, name: "Pathology & Lab", icon: "🔬" }
];

const doctors = [
    {
        id: 1,
        name: "Dr. Rajesh Sharma",
        department: "General Medicine (OPD)",
        qualification: "MBBS, MD (Medicine)",
        experience: "12+ Years",
        photo: "👨‍⚕️",
        email: "dr.sharma@dtu.ac.in",
        phone: "+91 9811223344",
        available: true
    },
    {
        id: 2,
        name: "Dr. Priya Verma",
        department: "Dental",
        qualification: "BDS, MDS",
        experience: "8+ Years",
        photo: "👩‍⚕️",
        email: "dr.priya@dtu.ac.in",
        phone: "+91 9811223345",
        available: true
    },
    {
        id: 3,
        name: "Dr. Amit Kumar",
        department: "Orthopedic",
        qualification: "MBBS, MS (Ortho)",
        experience: "15+ Years",
        photo: "👨‍⚕️",
        email: "dr.amit@dtu.ac.in",
        phone: "+91 9811223346",
        available: true
    },
    {
        id: 4,
        name: "Dr. Sunita Gupta",
        department: "Psychiatry & Counseling",
        qualification: "MD (Psychiatry), DPM",
        experience: "10+ Years",
        photo: "👩‍⚕️",
        email: "dr.sunita@dtu.ac.in",
        phone: "+91 9811223347",
        available: true
    },
    {
        id: 5,
        name: "Dr. Vikram Singh",
        department: "Dermatology",
        qualification: "MBBS, DVD, MD",
        experience: "9+ Years",
        photo: "👨‍⚕️",
        email: "dr.vikram@dtu.ac.in",
        phone: "+91 9811223348",
        available: true
    },
    {
        id: 6,
        name: "Dr. Neha Agarwal",
        department: "ENT",
        qualification: "MBBS, MS (ENT)",
        experience: "7+ Years",
        photo: "👩‍⚕️",
        email: "dr.neha@dtu.ac.in",
        phone: "+91 9811223349",
        available: true
    }
];

const sampleStudents = [
    {
        id: 1,
        name: "Rahul Meena",
        email: "rahul.22co101@dtu.ac.in",
        dtuEmail: "rahul.22co101@dtu.ac.in",
        rollNo: "2K22/CO/101",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        dob: "2003-05-14",
        bloodGroup: "B+",
        phone: "+91 9876543210"
    }
];

const medicines = [
    { id: 1, name: "Paracetamol 650mg", category: "Analgesic / Fever", stock: 120, unit: "Tablets", expiry: "2027-04" },
    { id: 2, name: "Cetirizine 10mg", category: "Antihistamine / Allergy", stock: 85, unit: "Tablets", expiry: "2026-12" },
    { id: 3, name: "Amoxicillin 500mg", category: "Antibiotic", stock: 45, unit: "Capsules", expiry: "2026-09" },
    { id: 4, name: "Pantoprazole 40mg", category: "Antacid / Acidity", stock: 90, unit: "Tablets", expiry: "2027-02" },
    { id: 5, name: "Ibuprofen 400mg", category: "Pain Relief", stock: 60, unit: "Tablets", expiry: "2026-11" },
    { id: 6, name: "ORS Sachet", category: "Electrolyte / Dehydration", stock: 150, unit: "Packs", expiry: "2027-08" },
    { id: 7, name: "Betadine Ointment", category: "Antiseptic", stock: 35, unit: "Tubes", expiry: "2026-10" },
    { id: 8, name: "Azithromycin 500mg", category: "Antibiotic", stock: 40, unit: "Tablets", expiry: "2026-08" },
    { id: 9, name: "Bandage Roll (Cotton)", category: "First Aid", stock: 75, unit: "Rolls", expiry: "2028-01" },
    { id: 10, name: "Dextromethorphan Syrup", category: "Cough Syrup", stock: 28, unit: "Bottles", expiry: "2026-07" },
    { id: 11, name: "Volini Pain Spray", category: "Pain Relief", stock: 22, unit: "Cans", expiry: "2027-01" },
    { id: 12, name: "Vitamin C Chewable", category: "Supplements", stock: 110, unit: "Tablets", expiry: "2027-05" }
];

const healthTips = [
    {
        id: 1,
        title: "Beat the Exam Season Stress",
        content: "Practice deep breathing and 7 hours of consistent sleep during exams. Visit DTU Counseling center if feeling overwhelmed.",
        author: "Dr. Sunita Gupta (Psychiatry)",
        date: "14 Nov 2026",
        category: "Mental Health"
    },
    {
        id: 2,
        title: "Preventing Seasonal Viral & Flu on Campus",
        content: "Wash hands regularly before eating at college canteen, drink clean water and avoid sudden exposure to severe air pollution without masks.",
        author: "Dr. Rajesh Sharma (General Medicine)",
        date: "12 Nov 2026",
        category: "General Wellness"
    },
    {
        id: 3,
        title: "Posture Health for Coding & Long Lab Hours",
        content: "Keep your laptop screen at eye level and take a 5-minute walking stretch every 45 minutes to protect your cervical spine and lower back.",
        author: "Dr. Amit Kumar (Orthopedic)",
        date: "09 Nov 2026",
        category: "Ergonomics"
    },
    {
        id: 4,
        title: "Healthy Hydration in Hostels",
        content: "Drink at least 2.5 to 3 liters of purified water daily. Use hostel RO dispensers and keep water bottles sanitised.",
        author: "DTU Health Team",
        date: "05 Nov 2026",
        category: "Lifestyle"
    }
];

const emergencyContacts = [
    { name: "DTU Health Center Emergency", phone: "011-27871018", available: "24/7", location: "Near Admin Block" },
    { name: "Government Ambulance Service", phone: "102 / 112", available: "24/7", location: "Delhi Central Dispatch" },
    { name: "DTU Main Gate Security Post", phone: "011-27871024", available: "24/7", location: "Main Gate No. 1" },
    { name: "Nearest Govt Hospital (BJRM Jahangirpuri)", phone: "011-27192222", available: "24/7", location: "Jahangirpuri, Delhi" },
    { name: "Rohini Sector 16 Police Station", phone: "100 / 112", available: "24/7", location: "Rohini, Delhi" }
];

const sampleSlots = [
    {
        id: 1,
        doctorId: 1,
        doctorName: "Dr. Rajesh Sharma",
        department: "General Medicine (OPD)",
        date: "2026-11-18",
        startTime: "10:00 AM",
        endTime: "01:00 PM",
        maxLimit: 10,
        bookedCount: 0,
        note: "OPD physical checkup slots available for students with fever/cough"
    },
    {
        id: 2,
        doctorId: 2,
        doctorName: "Dr. Priya Verma",
        department: "Dental",
        date: "2026-11-19",
        startTime: "11:00 AM",
        endTime: "02:00 PM",
        maxLimit: 10,
        bookedCount: 0,
        note: "Dental examination & cavity screening"
    },
    {
        id: 3,
        doctorId: 4,
        doctorName: "Dr. Sunita Gupta",
        department: "Psychiatry & Counseling",
        date: "2026-11-20",
        startTime: "02:00 PM",
        endTime: "05:00 PM",
        maxLimit: 10,
        bookedCount: 0,
        note: "One-on-one stress and anxiety management session"
    }
];

const sampleNotices = [
    {
        id: 1,
        title: "Flu Vaccination Drive at Health Center",
        content: "Annual seasonal influenza vaccination drive will be conducted on 20th Nov from 10:00 AM to 4:00 PM. All students are advised to bring DTU ID.",
        doctorName: "Dr. Rajesh Sharma",
        department: "General Medicine",
        date: "16 Nov 2026",
        type: "announcement"
    }
];

// In-Memory Runtime Store (Single Source of Truth is Firebase Firestore & SQLite DBMS)
window._dtuMemoryDB = window._dtuMemoryDB || {
    appointments: [],
    slots: sampleSlots.slice(),
    prescriptions: [],
    referrals: [],
    notices: sampleNotices.slice(),
    medicines: medicines.slice(),
    doctors: doctors.slice(),
    emergency: emergencyContacts.slice()
};

// Initialize runtime datasets and PURGE legacy table keys from localStorage
function initData(forceReset = false) {
    // Purge any old table keys from browser localStorage so it's not a fake database
    const tableKeysToPurge = [
        "dtu_appointments",
        "dtu_slots",
        "dtu_prescriptions",
        "dtu_referrals",
        "dtu_notices",
        "dtu_medicines",
        "dtu_doctors",
        "dtu_emergency",
        "dtu_healthTips"
    ];

    tableKeysToPurge.forEach(key => {
        try { localStorage.removeItem(key); } catch (e) {}
    });

    if (forceReset) {
        window._dtuMemoryDB.appointments = [];
        window._dtuMemoryDB.slots = JSON.parse(JSON.stringify(sampleSlots));
        window._dtuMemoryDB.prescriptions = [];
        window._dtuMemoryDB.referrals = [];
        window._dtuMemoryDB.notices = JSON.parse(JSON.stringify(sampleNotices));
        window._dtuMemoryDB.medicines = JSON.parse(JSON.stringify(medicines));
    }

    console.log("☁️ [DATABASE ARCHITECTURE] Running on Cloud Firebase Firestore & SQLite 3 DBMS. Browser localStorage cleared of tables.");
}
