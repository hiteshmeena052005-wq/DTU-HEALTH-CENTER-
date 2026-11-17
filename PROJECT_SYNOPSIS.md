# 🎓 B.TECH MINOR PROJECT SYNOPSIS

---

## 1. PROJECT TITLE
**DEVELOPMENT OF A REAL-TIME DIGITAL HEALTHCARE, TELEMEDICINE & CAMPUS EMERGENCY DISPATCH PORTAL (DTU HEALTH CENTER)**

---

## 2. ACADEMIC & INSTITUTIONAL DETAILS
- **Degree Program:** Bachelor of Technology (B.Tech)
- **Academic Department:** Computer Science & Engineering / Information Technology
- **Course:** Minor Project (VIII / VII Semester)
- **Institution:** Delhi Technological University (DTU), Shahbad Daulatpur, Main Bawana Road, Delhi-110042
- **Academic Session:** 2026–2027
- **Target Beneficiary:** Students, Resident Scholars, Medical Staff, and Faculty of Delhi Technological University

---

## 3. EXECUTIVE SUMMARY / ABSTRACT
University health dispensaries and medical centers serve as the first line of defense for physical well-being, primary clinical care, and acute emergency response for thousands of campus residents. However, high-density residential campuses like Delhi Technological University (DTU)—with over 15,000 on-campus students across 14+ hostel blocks and academic departments—face acute operational bottlenecks: uncontrolled outpatient queues, lack of visibility into doctor duty rosters, chaotic prescription filing, absent inter-departmental referral tracking, and hazardous delays during late-night hostel medical emergencies.

This project introduces the **DTU Health Center Portal**, a full-stack, cloud-synchronized healthcare management and telemedicine ecosystem. Built on a hybrid architecture combining **Google Cloud Firebase Firestore** (for real-time reactive sync across devices) and an ACID-compliant **SQLite 3 Relational DBMS** (3NF normalized clinical schema), the platform provides role-gated interfaces for students and medical officers. The system features:
1. **Quota-Enforced Appointment Scheduling:** Enforces a hard capacity limit (maximum 10 tokens per doctor session) to eliminate overcrowding and doctor burnout.
2. **Interactive Telehealth Video Consultation:** Browser-native WebRTC peer video stream, live in-call messaging, and prescription drafting for bedridden or quarantined students.
3. **Institutional Specialist Referral Pipeline:** Structured clinical handoffs between general physicians and specialized departments (Psychiatry, Orthopedics, Dental, Pathology, etc.).
4. **Instant Campus Ambulance SOS System:** Rapid single-tap emergency dispatch tied to DTU hostel blocks with synthesized audio sirens and real-time doctor alerts.
5. **Ultra-Modern Dual-Theme Glassmorphism UI:** Aesthetic Dark Glassmorphism interface (`#0a0c10`) with an instant, persistent toggle to high-contrast Light Mode (`☀️` / `🌙`).
6. **24×7 Cloud Persistence:** Ensures that campus health data and bookings remain permanently accessible even when local host machines are powered down.

---

## 4. PROBLEM STATEMENT
Manual and semi-manual health operations in collegiate campuses exhibit the following critical pain points:

1. **Unpredictable OPD Overcrowding:** Students visiting the campus health center during lecture breaks face long waiting lines without prior knowledge of doctor availability or remaining daily capacity.
2. **Absence of Capacity Controls:** Doctors are routinely overwhelmed with non-triaged walk-ins, degrading the quality of primary care.
3. **Barriers for Quarantined Hostellers:** Students confined to hostel rooms due to contagious ailments (e.g., viral conjunctivitis, high fever, mobility impairments) lack a direct digital teleconsultation channel with university doctors.
4. **Fragmented Referral Records:** Paper referral slips to campus specialists get lost or lack diagnostic history, leading to redundant diagnostic procedures.
5. **Campus SOS Response Gaps:** In late-night emergencies (e.g., acute respiratory distress, sports fractures), hostellers struggle to access contact details for campus ambulance drivers and health officers.
6. **Fragile Data Storage:** Conventional web prototypes rely entirely on browser local storage, which erases when cache is cleared and cannot sync between students' phones and doctors' laptops.

---

## 5. OBJECTIVES OF THE PROJECT
The primary objectives of this minor project are:
- **Design a Zero-Overcrowding Booking Module:** Implement slot-limited doctor availability sessions capped at 10 tokens per window, automatically locking upon saturation.
- **Implement Student Medical Identity Gating:** Enforce mandatory student profile completion (DTU Roll Number, Academic Branch, Blood Group, Emergency Contact) before medical access is permitted.
- **Deploy Real-Time Cross-Device Cloud Synchronization:** Integrate **Google Cloud Firebase Firestore** to guarantee seamless, instant data delivery between student smartphones and clinical workstations.
- **Establish a Relational Hospital Database (DBMS):** Build an ACID-compliant SQLite 3 relational database normalized to Third Normal Form (3NF) with foreign keys, triggers, constraints, and audit trails.
- **Provide a Telemedicine Consultation Room:** Construct an encrypted, peer-to-peer WebRTC consultation suite with camera preview, duration counter, in-call chat, and live prescription notes.
- **Digitalize Prescriptions & Pharmacy Stock:** Enable medical officers to author digital prescriptions with automated dosages and provide real-time dispensary inventory tracking.
- **Implement a Hostel-Targeted SOS Dispatch:** Build a one-tap campus ambulance alert system that notifies medical staff and calculates estimated response times.
- **Deliver an Ultra-Modern, Accessible UI:** Provide a sleek Dark Glassmorphism aesthetic with an instant, flicker-free Light Mode toggle.

---

## 6. SYSTEM ARCHITECTURE & DATA FLOW

### 6.1 Architectural Diagram
The project implements a decoupled, event-driven multi-tier architecture:

```
+-----------------------------------------------------------------------------------+
|                           PRESENTATION LAYER (CLIENT UI)                          |
|  - Ultra-Modern Dark Glassmorphism Design System (CSS3 Custom Properties)         |
|  - High-Contrast Light Mode Engine with Smooth 0.25s Micro-Transitions           |
|  - Dynamic Floating Pill Navbar with Instant Theme Controller (🌙 / ☀️)          |
|  - Role-Specific Views: Student OPD Portal & Doctor/Admin Clinical Dashboard      |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                         APPLICATION LOGIC & CONTROLLER LAYER                      |
|                                     (`js/app.js`)                                 |
|  - Session & Profile Access Guard (Student Gating vs Doctor Authority)            |
|  - Appointment Quota Validator (Hard Limit: Max 10 Students / Slot)               |
|  - WebRTC Video Stream & Device Controller (getUserMedia API)                     |
|  - Clinical Referral Slip & Digital Prescription PDF/Print Formatter              |
|  - Audio Synthesizer for Emergency Ambulance Sirens (Web Audio API)               |
+---------------------+---------------------------------------+---------------------+
                      |                                       |
                      v                                       v
+------------------------------------+   +------------------------------------------+
|      CLOUD REAL-TIME ENGINE        |   |      RELATIONAL HOSPITAL DBMS            |
|     (Google Firebase Firestore)    |   |           (SQLite 3 Engine)              |
|  - Project: `dtu-health-center`    |   |  - Database: `database/hospital.db`      |
|  - Live Bi-Directional Cloud Sync  |   |  - 3NF Normalized Schema (`schema.sql`)  |
|  - 24×7 Availability (Host Off)    |   |  - Server-Sent Events (SSE) `/api/events`|
|  - Collections: appointments,      |   |  - 11 Relational Tables with Foreign     |
|    slots, prescriptions, notices   |   |    Keys, Check Constraints & Triggers    |
+------------------------------------+   +------------------------------------------+
```

---

## 7. DUAL-DATABASE MANAGEMENT SYSTEM (DBMS)

To satisfy both high-speed reactive client experiences and rigorous academic database engineering standards, the system employs a **Dual-Database Architecture**:

### 7.1 Cloud NoSQL Layer (Google Firebase Firestore)
- **Project ID:** `dtu-health-center`
- **Role:** Real-time reactive data pipeline and 24×7 cloud persistence.
- **Behavior:** Ensures that even if the student’s laptop is shut down, all appointments, active checkup slots, broadcast notices, and prescriptions remain live on Google’s distributed cloud infrastructure.
- **Listeners:** Push notifications update doctor and student interfaces in `<10ms` without page reloads.

### 7.2 Relational DBMS Layer (SQLite 3 Normalization)
- **Engine:** SQLite 3 (`database/hospital.db`) via native `node:sqlite`.
- **Normalization:** Fully structured in **Third Normal Form (3NF)** with strict constraints (`CHECK booked_count <= max_capacity`, foreign keys with cascading integrity).
- **Core Tables:**
  1. `departments`: Campus clinical branches (General Medicine, Dentistry, Orthopedics, Psychiatry, etc.).
  2. `doctors`: Medical officer credentials, specializations, cabin locations.
  3. `students`: Verified university rolls, departments, blood groups, and emergency guardians.
  4. `doctor_slots`: Doctor availability sessions with capacity restrictions.
  5. `appointments`: Queue tickets with urgency indicators (Routine vs Urgent) and consultation mode (OPD vs Video).
  6. `prescriptions`: Formal medical orders with clinical diagnosis and follow-up directives.
  7. `prescription_medicines`: Normalized medication line items (1-to-many relationship).
  8. `referrals`: Inter-departmental specialist handoff slips.
  9. `pharmacy_medicines`: Dispensary stock quantities with low-inventory alerts.
  10. `campus_notices`: Public health bulletins and vaccination camp advisories.
  11. `emergency_sos_logs`: Timestamped hostel ambulance dispatch logs.

---

## 8. KEY FUNCTIONAL MODULES

### Module 1: Institutional Portal & Information Center (`index.html`)
- Displays official DTU branding with operational timings (Mon–Sat 9:00 AM – 5:00 PM; 24×7 Casualty).
- Directory of 10 campus clinical divisions and emergency hotlines (`011-27871018`, Ambulance `102/112`).
- Context-aware navigation bar adapting dynamically to user authentication status.

### Module 2: Authentication & Student Profile Gating (`login.html`, `student-profile.html`)
- Secure dual-role gateway supporting **Student** and **Doctor/Admin** credentials.
- **Mandatory Profile Gating:** Intercepts first-time student logins, requiring verified submission of Roll Number, Academic Branch, Blood Group, and Guardian Emergency Contact before unlocking booking capabilities.

### Module 3: Slot-Enforced OPD Appointment Booking (`book-appointment.html`)
- Doctors publish daily consultation slots with capped capacity (default: 10 students).
- Students submit clinical intake questionnaires stating symptoms, illness duration, and preferred mode (In-person OPD vs Telehealth Video).
- Automatic lockout triggers when capacity reaches 10/10 tokens, preventing waiting room overflow.

### Module 4: Clinical Queue & Admin Dashboard (`doctor-dashboard.html`)
- Live queue monitor rendering incoming patient cards with token numbers, urgency tags, and contact actions.
- Interactive controls to post new availability slots, broadcast health announcements, and mark consultations complete.
- Visual **Campus Health Analytics Engine** showcasing 12-month OPD footfall trends.

### Module 5: Telemedicine Video Consultation Room (`video-call.html`)
- Browser-based peer-to-peer telehealth room powered by the HTML5 `getUserMedia` API.
- Integrated consultation toolkit: live elapsed call timer, audio mute toggle, webcam switch, interactive in-call text chat, and synchronized digital prescription notepad.

### Module 6: Specialist Referral & Digital Prescription Suite (`referral.html`, `prescriptions.html`)
- Formal digital referral slips facilitating patient handoffs between General OPD and specialists (Dental, Orthopedic, Dermatology, Mental Health).
- Comprehensive prescription writer with automated dosages, instructions, doctor signatures, and one-click printable/PDF export.

### Module 7: 24×7 Campus Emergency SOS & Ambulance Dispatch (`emergency.html`)
- Dedicated hostel emergency dispatch selector (B.R. Ambedkar Hostel, Raman Hostel, Science Block, Type-IV Flats, etc.).
- Audio-visual alert pipeline activating simulated siren sound effects (Web Audio API synthesis) and dispatching notifications to all campus doctor terminals with a 3–5 minute arrival window.

### Module 8: Role-Restricted Dispensary Stock Tracker (`medicine-inventory.html`)
- Gated strictly to medical staff and campus pharmacists.
- Real-time stock counters with live status indicators (`In Stock`, `Low Stock`, `Out of Stock`) and one-click batch increment/decrement controls.

### Module 9: Dual-Theme Glassmorphism Engine (`css/style.css`, `js/app.js`)
- Deep Dark Glassmorphism palette (`#0a0c10`) with glowing crimson (`#e63946`) and warm amber (`#f5a623`) highlights.
- Instant, persistent toggle to clean, high-contrast Light Glass Mode (`#f3f5f9`).
- State stored in browser storage (`dtu_theme`) with immediate IIFE pre-loader preventing white flash on reload.

---

## 9. HARDWARE & SOFTWARE SPECIFICATIONS

### Software Specifications
- **Client Frontend:** HTML5, CSS3 (Modern Glassmorphism Design System), Vanilla JavaScript (ES6+)
- **Cloud Database:** Google Cloud Firebase Firestore (`dtu-health-center`)
- **Relational DBMS:** SQLite 3 (`node:sqlite`)
- **Real-Time Streaming:** Server-Sent Events (SSE) `/api/events` & HTML5 BroadcastChannel Bus
- **Multimedia APIs:** WebRTC / HTML5 MediaDevices API, Web Audio API
- **Supported Browsers:** Google Chrome, Brave, Mozilla Firefox, Microsoft Edge, Apple Safari
- **Deployment Platform:** Vercel Serverless / Node.js Runtime

### Hardware Specifications
- **Development & Client Host:** Intel Core i3 / AMD Ryzen 3 or higher (or ARM mobile equivalents)
- **System Memory:** Minimum 2 GB RAM (4 GB recommended)
- **Disk Footprint:** < 100 MB total project size (including SQLite relational database)
- **Peripherals:** Integrated Web Camera & Microphone (for Telehealth video consultation)

---

## 10. FEASIBILITY ANALYSIS
1. **Technical Feasibility:**  
   The application uses native web standards and official Google Firebase cloud SDKs, requiring zero heavyweight frontend frameworks (such as React or Angular) and zero compilation overhead. It executes uniformly across desktops, tablets, and smartphones.
2. **Operational Feasibility:**  
   The UI/UX is modeled after modern, highly readable consumer software with large typography, intuitive icon pills, and pre-filled form fields, eliminating the need for formal end-user training.
3. **Economic Feasibility:**  
   The system utilizes Google Firebase's generous Free Spark Tier and lightweight open-source SQLite 3 storage, resulting in **zero infrastructure or licensing costs** during evaluation and campus deployment.

---

## 11. FUTURE ENHANCEMENTS (PHASE 2 ROADMAP)
- **Automated SMS & WhatsApp Alerts:** Integration with university Twilio/SMS gateways to deliver instant token alerts and ambulance dispatches to students' personal mobile phones.
- **Biometric Health Kiosk Integration:** Direct connection with DTU campus dispensary IoT vitals kiosks (pulse oximeter, blood pressure, BMI sensors).
- **Predictive Campus Epidemic Forecaster:** Implementation of machine learning time-series regression to anticipate seasonal viral outbreaks (Dengue, Influenza) based on weekly OPD diagnostic patterns.

---

## 12. CONCLUSION
The **DTU Health Center Web Application** addresses a critical operational gap in campus healthcare infrastructure. By fusing **Google Firebase Cloud persistence**, an **ACID-compliant relational DBMS**, a **quota-controlled booking mechanism**, **peer telemedicine**, and **instant ambulance dispatch** within a world-class **Dark Glassmorphism interface**, this minor project presents a comprehensive, modern, and deployable healthcare prototype tailored for collegiate universities.
