// =============================================================================
// DTU Health Center - Core Datasets & State Store
// Official OPD Schedule - Main Campus Healthcare Datasets
// =============================================================================

const departments = [
    { id: 1, name: "General Medicine (OPD)", icon: "🩺", desc: "Outpatient clinical consultation and seasonal ailments." },
    { id: 2, name: "General Medicine (Evening OPD)", icon: "🌙", desc: "Evening primary healthcare and student consultations." },
    { id: 3, name: "Ophthalmology (Eye Specialist)", icon: "👁️", desc: "Eye care, vision checks, and computer vision strain." },
    { id: 4, name: "Dental Care", icon: "🦷", desc: "Dental screening, scaling, toothache and oral hygiene." },
    { id: 5, name: "Sports Medicine & Physiotherapy", icon: "🏃", desc: "Sports injuries, physical rehabilitation and MPT care." },
    { id: 6, name: "Orthopedic", icon: "🦴", desc: "Joint pain, bone alignment, fractures and sprains." },
    { id: 7, name: "Psychiatry", icon: "🧠", desc: "Mental health assessment, depression and psychiatric care." },
    { id: 8, name: "Gynecology", icon: "👩‍⚕️", desc: "Women's wellness clinic, menstrual and hormonal health." },
    { id: 9, name: "Clinical Psychology & Counseling", icon: "💬", desc: "Exam stress, psychotherapy and student counseling." },
    { id: 10, name: "Pathology & Lab Diagnostics", icon: "🔬", desc: "Diagnostic lab tests, blood investigations and reports." }
];

// Official DTU Health Center Main Campus OPD Doctors (From Official Schedule)
const doctors = [
    {
        id: 1,
        uuid: "d0000000-0000-0000-0000-000000000001",
        name: "Dr. Ravi Bansal",
        department: "General Medicine (OPD)",
        expertise: "General Physician",
        qualification: "MBBS, MD (General Medicine)",
        days: "Mon to Sat",
        timings: "1:00 PM to 5:00 PM",
        experience: "15+ Years",
        photo: "👨‍⚕️",
        email: "dr.ravibansal@dtu.ac.in",
        phone: "+91 9811223301",
        available: true
    },
    {
        id: 2,
        uuid: "d0000000-0000-0000-0000-000000000002",
        name: "Dr. Rajesh Singhai",
        department: "General Medicine (OPD)",
        expertise: "General Physician",
        qualification: "MBBS, MD",
        days: "Mon to Sat",
        timings: "9:00 AM to 12:00 PM",
        experience: "14+ Years",
        photo: "👨‍⚕️",
        email: "dr.rajeshsinghai@dtu.ac.in",
        phone: "+91 9811223302",
        available: true
    },
    {
        id: 3,
        uuid: "d0000000-0000-0000-0000-000000000003",
        name: "Dr. Arpana Bansal",
        department: "Ophthalmology (Eye Specialist)",
        expertise: "Eye Specialist",
        qualification: "MBBS, MS (Ophthalmology)",
        days: "Monday, Wednesday & Friday",
        timings: "1:00 PM to 3:00 PM",
        experience: "11+ Years",
        photo: "👩‍⚕️",
        email: "dr.arpanabansal@dtu.ac.in",
        phone: "+91 9811223303",
        available: true
    },
    {
        id: 4,
        uuid: "d0000000-0000-0000-0000-000000000004",
        name: "Dr. Bharat Bhushan Sethi",
        department: "Dental Care",
        expertise: "Dentist",
        qualification: "BDS, MDS (Dental Surgery)",
        days: "Monday, Wednesday & Friday",
        timings: "1:00 PM to 3:00 PM",
        experience: "12+ Years",
        photo: "👨‍⚕️",
        email: "dr.bharatsethi@dtu.ac.in",
        phone: "+91 9811223304",
        available: true
    },
    {
        id: 5,
        uuid: "d0000000-0000-0000-0000-000000000005",
        name: "Dr. Subodh Mor",
        department: "Sports Medicine & Physiotherapy",
        expertise: "Sports Medicine cum Physiotherapist(MPT)",
        qualification: "BPT, MPT (Sports Medicine)",
        days: "Monday to Saturday",
        timings: "1:00 PM to 4:00 PM",
        experience: "10+ Years",
        photo: "👨‍⚕️",
        email: "dr.subodhmor@dtu.ac.in",
        phone: "+91 9811223305",
        available: true
    },
    {
        id: 6,
        uuid: "d0000000-0000-0000-0000-000000000006",
        name: "Dr. Dinesh Bansal",
        department: "Orthopedic",
        expertise: "Orthopedician",
        qualification: "MBBS, MS (Orthopedics)",
        days: "Monday, Wednesday & Friday",
        timings: "1:00 PM to 3:00 PM",
        experience: "16+ Years",
        photo: "👨‍⚕️",
        email: "dr.dineshbansal@dtu.ac.in",
        phone: "+91 9811223306",
        available: true
    },
    {
        id: 7,
        uuid: "d0000000-0000-0000-0000-000000000007",
        name: "Dr. Gaurav Gupta",
        department: "Psychiatry",
        expertise: "Psychiatrist",
        qualification: "MBBS, MD (Psychiatry)",
        days: "Tuesday and Thursday",
        timings: "1:00 PM to 4:00 PM",
        experience: "9+ Years",
        photo: "👨‍⚕️",
        email: "dr.gauravgupta@dtu.ac.in",
        phone: "+91 9811223307",
        available: true
    },
    {
        id: 8,
        uuid: "d0000000-0000-0000-0000-000000000008",
        name: "Dr. Nisha Jha",
        department: "Gynecology",
        expertise: "Gynaecologist",
        qualification: "MBBS, MS, DGO",
        days: "Tuesday and Thursday",
        timings: "1:00 PM to 4:00 PM",
        experience: "13+ Years",
        photo: "👩‍⚕️",
        email: "dr.nishajha@dtu.ac.in",
        phone: "+91 9811223308",
        available: true
    },
    {
        id: 9,
        uuid: "d0000000-0000-0000-0000-000000000009",
        name: "Dr. Mohit Gulia",
        department: "General Medicine (Evening OPD)",
        expertise: "General Physician",
        qualification: "MBBS, DNB",
        days: "Monday to Saturday",
        timings: "7:00 PM to 10:00 PM",
        experience: "8+ Years",
        photo: "👨‍⚕️",
        email: "dr.mohitgulia@dtu.ac.in",
        phone: "+91 9811223309",
        available: true
    },
    {
        id: 10,
        uuid: "d0000000-0000-0000-0000-000000000010",
        name: "Dr. Aditi Bansal",
        department: "Clinical Psychology & Counseling",
        expertise: "Clinical Psychologist",
        qualification: "M.Phil, Ph.D. (Clinical Psychology)",
        days: "Tue, Thu and Saturday",
        timings: "12:00 PM to 4:00 PM",
        experience: "7+ Years",
        photo: "👩‍⚕️",
        email: "dr.aditibansal@dtu.ac.in",
        phone: "+91 9811223310",
        available: true
    }
];

// Helper: Safely resolve Doctor Supabase UUID by ID, Name, or Email
function getDoctorUUID(idOrName) {
    if (idOrName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idOrName))) {
        return String(idOrName);
    }
    if (!idOrName) return "d0000000-0000-0000-0000-000000000001";
    const str = String(idOrName).toLowerCase().trim();
    const doc = doctors.find(d => 
        (d.id && String(d.id) === str) ||
        (d.uuid && d.uuid.toLowerCase() === str) ||
        (d.name && (d.name.toLowerCase().includes(str) || str.includes(d.name.toLowerCase()))) ||
        (d.email && d.email.toLowerCase() === str)
    );
    return doc ? doc.uuid : "d0000000-0000-0000-0000-000000000001";
}

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
        author: "Dr. Aditi Bansal (Clinical Psychologist)",
        date: "14 Nov 2026",
        category: "Mental Health"
    },
    {
        id: 2,
        title: "Preventing Seasonal Viral & Flu on Campus",
        content: "Wash hands regularly before eating at college canteen, drink clean water and avoid sudden exposure to severe air pollution without masks.",
        author: "Dr. Ravi Bansal (General Physician)",
        date: "11 Nov 2026",
        category: "General Wellness"
    },
    {
        id: 3,
        title: "Posture Health for Coding & Long Lab Hours",
        content: "Keep your laptop screen at eye level and take a 5-minute walking stretch every 45 minutes to protect your cervical spine and lower back.",
        author: "Dr. Subodh Mor (Sports Medicine / MPT)",
        date: "08 Nov 2026",
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

// Active OPD slots matching the official DTU Health Center schedule
const sampleSlots = [
    {
        id: 1,
        doctorId: "d0000000-0000-0000-0000-000000000002",
        doctorNumericId: 2,
        doctorName: "Dr. Rajesh Singhai",
        department: "General Medicine (OPD)",
        date: "2026-11-23",
        startTime: "09:00 AM",
        endTime: "12:00 PM",
        startTimeRaw: "09:00:00",
        endTimeRaw: "12:00:00",
        maxLimit: 10,
        bookedCount: 1,
        note: "Morning General OPD Consultation (Mon to Sat 9 AM - 12 PM)"
    },
    {
        id: 2,
        doctorId: "d0000000-0000-0000-0000-000000000001",
        doctorNumericId: 1,
        doctorName: "Dr. Ravi Bansal",
        department: "General Medicine (OPD)",
        date: "2026-11-23",
        startTime: "01:00 PM",
        endTime: "05:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "17:00:00",
        maxLimit: 10,
        bookedCount: 1,
        note: "Afternoon General OPD (Mon to Sat 1 PM - 5 PM)"
    },
    {
        id: 3,
        doctorId: "d0000000-0000-0000-0000-000000000003",
        doctorNumericId: 3,
        doctorName: "Dr. Arpana Bansal",
        department: "Ophthalmology (Eye Specialist)",
        date: "2026-11-24",
        startTime: "01:00 PM",
        endTime: "03:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "15:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Eye testing, vision screening & computer strain (Mon, Wed, Fri 1 PM - 3 PM)"
    },
    {
        id: 4,
        doctorId: "d0000000-0000-0000-0000-000000000004",
        doctorNumericId: 4,
        doctorName: "Dr. Bharat Bhushan Sethi",
        department: "Dental Care",
        date: "2026-11-24",
        startTime: "01:00 PM",
        endTime: "03:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "15:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Dental examination, scaling & cavity treatment (Mon, Wed, Fri 1 PM - 3 PM)"
    },
    {
        id: 5,
        doctorId: "d0000000-0000-0000-0000-000000000005",
        doctorNumericId: 5,
        doctorName: "Dr. Subodh Mor",
        department: "Sports Medicine & Physiotherapy",
        date: "2026-11-24",
        startTime: "01:00 PM",
        endTime: "04:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "16:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Sports injuries, physical rehabilitation & joint therapy (Mon to Sat 1 PM - 4 PM)"
    },
    {
        id: 6,
        doctorId: "d0000000-0000-0000-0000-000000000006",
        doctorNumericId: 6,
        doctorName: "Dr. Dinesh Bansal",
        department: "Orthopedic",
        date: "2026-11-25",
        startTime: "01:00 PM",
        endTime: "03:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "15:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Orthopedic screening, sprains & bone alignment (Mon, Wed, Fri 1 PM - 3 PM)"
    },
    {
        id: 7,
        doctorId: "d0000000-0000-0000-0000-000000000007",
        doctorNumericId: 7,
        doctorName: "Dr. Gaurav Gupta",
        department: "Psychiatry",
        date: "2026-11-25",
        startTime: "01:00 PM",
        endTime: "04:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "16:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Psychiatric consultation & mental health care (Tue & Thu 1 PM - 4 PM)"
    },
    {
        id: 8,
        doctorId: "d0000000-0000-0000-0000-000000000008",
        doctorNumericId: 8,
        doctorName: "Dr. Nisha Jha",
        department: "Gynecology",
        date: "2026-11-25",
        startTime: "01:00 PM",
        endTime: "04:00 PM",
        startTimeRaw: "13:00:00",
        endTimeRaw: "16:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Women's wellness & gynecological consultation (Tue & Thu 1 PM - 4 PM)"
    },
    {
        id: 9,
        doctorId: "d0000000-0000-0000-0000-000000000010",
        doctorNumericId: 10,
        doctorName: "Dr. Aditi Bansal",
        department: "Clinical Psychology & Counseling",
        date: "2026-11-26",
        startTime: "12:00 PM",
        endTime: "04:00 PM",
        startTimeRaw: "12:00:00",
        endTimeRaw: "16:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Exam stress, psychotherapy & student counseling (Tue, Thu, Sat 12 PM - 4 PM)"
    },
    {
        id: 10,
        doctorId: "d0000000-0000-0000-0000-000000000009",
        doctorNumericId: 9,
        doctorName: "Dr. Mohit Gulia",
        department: "General Medicine (Evening OPD)",
        date: "2026-11-26",
        startTime: "07:00 PM",
        endTime: "10:00 PM",
        startTimeRaw: "19:00:00",
        endTimeRaw: "22:00:00",
        maxLimit: 10,
        bookedCount: 0,
        note: "Evening General OPD consultation for hostelers (Mon to Sat 7 PM - 10 PM)"
    }
];

const sampleAppointments = [
    {
        id: "APT-101",
        studentName: "Rahul Meena",
        rollNo: "2K22/CO/101",
        doctorName: "Dr. Ravi Bansal",
        department: "General Medicine (OPD)",
        slotId: 2,
        date: "2026-11-23",
        time: "01:00 PM - 05:00 PM",
        reason: "Seasonal viral fever and persistent dry cough",
        status: "Confirmed",
        createdAt: "21 Nov 2026"
    }
];

const samplePrescriptions = [
    {
        id: "RX-101",
        studentName: "Rahul Meena",
        studentEmail: "rahul.22co101@dtu.ac.in",
        doctorName: "Dr. Ravi Bansal",
        department: "General Medicine (OPD)",
        date: "21 Nov 2026",
        diagnosis: "Acute viral nasopharyngitis with mild pyrexia",
        medicines: [
            { name: "Paracetamol 650mg", dosage: "1 tab TDS after meals", duration: "3 Days" },
            { name: "Cetirizine 10mg", dosage: "1 tab OD at bedtime", duration: "5 Days" }
        ],
        tests: "None required currently",
        followUp: "After 3 days if fever persists",
        notes: "Take warm saline gargles twice daily and ensure adequate hydration."
    }
];

const sampleReferrals = [
    {
        id: "REF-101",
        studentName: "Rahul Meena",
        rollNo: "2K22/CO/101",
        fromDoctor: "Dr. Ravi Bansal",
        fromDept: "General Medicine (OPD)",
        toDoctor: "Dr. Dinesh Bansal",
        toDept: "Orthopedic",
        priority: "Routine OPD Referral",
        reason: "Complaining of persistent lower back stiffness after prolonged coding sessions.",
        tests: "Lumbosacral spine posture evaluation",
        date: "20 Nov 2026",
        status: "Consultation Completed"
    }
];

const sampleNotices = [
    {
        id: 1,
        title: "Flu Vaccination Drive at Health Center",
        content: "Annual seasonal influenza vaccination drive will be conducted from 10:00 AM to 4:00 PM. All students are advised to bring DTU ID.",
        doctorName: "Dr. Ravi Bansal",
        department: "General Medicine",
        date: "21 Nov 2026",
        type: "announcement"
    }
];

// Client State Storage Adapter
const CLIENT_STORAGE_KEY = 'dtu_client_store';

function loadClientStore() {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        }
    } catch (e) {}
    return null;
}

function saveClientStore(db) {
    try {
        if (typeof localStorage !== 'undefined' && db) {
            localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(db));
        }
    } catch (e) {}
}

// In-Memory Runtime Store
window._dtuMemoryDB = window._dtuMemoryDB || loadClientStore() || {
    appointments: sampleAppointments.slice(),
    slots: sampleSlots.slice(),
    prescriptions: samplePrescriptions.slice(),
    referrals: sampleReferrals.slice(),
    notices: sampleNotices.slice(),
    medicines: medicines.slice(),
    doctors: doctors.slice(),
    emergency: emergencyContacts.slice()
};

// Initialize runtime datasets
function initData(forceReset = false) {
    if (!forceReset) {
        const stored = loadClientStore();
        if (stored && Array.isArray(stored.appointments)) {
            // Merge official doctors
            stored.doctors = doctors;
            // If stored slots still contain outdated mock doctors (Dr. Rajesh Sharma, Dr. Priya Verma, Dr. Sunita Gupta), refresh with official 10-doctor slots
            const hasLegacySlots = stored.slots && stored.slots.some(s => 
                s.doctorName === "Dr. Rajesh Sharma" || 
                s.doctorName === "Dr. Priya Verma" || 
                s.doctorName === "Dr. Sunita Gupta"
            );
            if (hasLegacySlots || !stored.slots || stored.slots.length < 5) {
                stored.slots = JSON.parse(JSON.stringify(sampleSlots));
            }
            window._dtuMemoryDB = stored;
            saveClientStore(window._dtuMemoryDB);
            return;
        }
    }

    window._dtuMemoryDB = {
        appointments: JSON.parse(JSON.stringify(sampleAppointments)),
        slots: JSON.parse(JSON.stringify(sampleSlots)),
        prescriptions: JSON.parse(JSON.stringify(samplePrescriptions)),
        referrals: JSON.parse(JSON.stringify(sampleReferrals)),
        notices: JSON.parse(JSON.stringify(sampleNotices)),
        medicines: JSON.parse(JSON.stringify(medicines)),
        doctors: JSON.parse(JSON.stringify(doctors)),
        emergency: JSON.parse(JSON.stringify(emergencyContacts))
    };

    saveClientStore(window._dtuMemoryDB);
}

// Reset data to defaults
function resetAllData() {
    initData(true);
}
