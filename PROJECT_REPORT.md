# 🏥 DTU Health Center Web Application - Project Report

**Project Type:** College Minor Project Prototype  
**Institution:** Delhi Technological University (DTU), Delhi  
**Domain:** Healthcare Management & Telemedicine System  
**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (Local Storage for Mock Database)

---

## 1. Project Overview & Motivation

DTU Health Center is the primary healthcare dispensary for thousands of students and faculty members residing across campus hostels and departments. Currently, students face long queues, unpredictable doctor availability, and lack of digital records during medical emergencies.

This project is a **functional web prototype** designed to:
1. Provide a modern, interactive web portal (`www.dtuhealthcenter.dtu.ac.in` simulated prototype).
2. Allow doctors to announce weekly consultation sessions with a **fixed student cap (e.g., maximum 10 students per session)**.
3. Enable students to submit their emergency reason & symptoms through an interactive consultation form.
4. Facilitate **one-to-one video consultations** with integrated in-call chat and digital clinical notes.
5. Provide a seamless **doctor-to-doctor referral system** between DTU medical departments.
6. Offer an **instant ambulance SOS button** tailored specifically for campus hostels and blocks.
7. Provide a public **dispensary medicine stock tracker** and **health advisories board**.

---

## 2. Technology Stack & Design Decisions

To ensure the prototype is lightweight, easily explained in presentation/viva, and requires zero installation overhead:

| Component | Technology | Rationale |
|---|---|---|
| **Structure** | Plain HTML5 | Clean semantic markup (`<nav>`, `<main>`, `<form>`, `<section>`) without framework complexities. |
| **Styling** | Plain CSS3 (`style.css`) | Official DTU color palette: **Maroon (`#800020`)** and **Gold (`#C5A55A`)**. Responsive on desktop and mobile. |
| **Logic & State** | Vanilla JavaScript (`app.js`, `data.js`) | Client-side state persistence using browser `localStorage`. No Node.js or backend servers required to test. |
| **Video Simulation** | HTML5 `getUserMedia` API | Real-time live camera self-preview with fallback, interactive controls (Mute, Video off, Chat, End call). |

---

## 3. Directory & File Structure

```
dtu-health-center/
├── index.html              # Public landing page with DTU branding, services, and doctor profiles
├── login.html              # Multi-role login (Student & Doctor/Admin)
├── student-profile.html    # Mandatory first-time profile setup (DOB, Roll No, Branch, Blood Group)
├── student-dashboard.html  # Student portal with upcoming appointments, doctor notices, profile summary
├── book-appointment.html  # Slot-limited doctor session booking (Max 10 students capacity limit)
├── doctor-dashboard.html   # Doctor/Admin queue manager, slot publisher & notice broadcaster
├── video-call.html         # One-to-one telehealth room with live webcam, in-call chat & clinical notes
├── referral.html           # Inter-department specialist referral slip generator
├── prescriptions.html      # Digital prescription generator for doctors & history viewer for students
├── emergency.html          # Instant ambulance SOS dispatch & 24/7 emergency directory
├── health-tips.html        # Campus wellness guidelines, exam stress management & advice board
├── medicine-inventory.html # Real-time dispensary medicine stock viewer & inventory updater
├── css/
│   └── style.css           # Master stylesheet for all pages
└── js/
    ├── data.js             # Mock database (Doctors, Students, Medicines, Slots, Notices)
    └── app.js              # Core controller (Auth checks, localStorage helpers, dynamic navbar/footer)
```

---

## 4. Key Modules & Functional Workflows

### 4.1. Authentication & Student Profile Gating
- Two distinct roles: **Student** and **Doctor (Admin)**.
- When students log in for the first time, the system gates access until they complete their **Student Medical Profile** (Full Name, DTU Roll Number, Branch, Year, Blood Group, Emergency Contact, DTU Email).

### 4.2. Slot-Limited Appointment Booking (Max 10 Students)
- Doctors publish weekly checkup slots with a maximum student capacity (default 10).
- Students select an available slot and fill out a consultation questionnaire detailing:
  - Symptoms and why they need to see the doctor
  - Urgency level (Normal vs. Urgent)
  - Preferred mode (In-person OPD vs. Video Consultation)
- Once the capacity reaches 10/10, the slot automatically locks to prevent overcrowding.

### 4.3. Telehealth One-to-One Video Consultation
- Browser-based video consultation interface using HTML5 camera stream.
- In-call communication features:
  - Live call timer
  - Audio mute/unmute and camera toggle
  - Live interactive chatbox with simulated doctor responses
  - Integrated clinical notes tab where doctors can type prescription drafts during the call.

### 4.4. Doctor-to-Doctor Referral System
- Allows General OPD physicians to transfer students directly to specialized DTU departments:
  - Dental, Orthopedic, Dermatology, Psychiatry & Counseling, ENT, Ophthalmology, Physiotherapy, Pathology.
- Creates an official clinical referral record with priority levels, clinical findings, and suggested diagnostic tests.

### 4.5. Instant Ambulance SOS Dispatch
- Specially designed for student hostels and campus blocks (e.g., B.R. Ambedkar Hostel, Raman Hostel, Science Block, Sports Ground).
- One-click trigger provides an immediate estimated response time (3-5 minutes) and direct phone connection to campus security and ambulance drivers.

### 4.6. Dispensary Stock & Health Advisories
- Medicine inventory tracking with live availability badges (Available, Low Stock, Out of Stock).
- Doctors can adjust stock levels (+/- 10) directly.
- Campus wellness articles categorized into Mental Health, Exam Stress, Ergonomics, and Lifestyle.

### 4.7. Full-Stack Database Engine & Real-Time Sync
- **Relational Database Engine:** Persistent **SQLite 3** relational database (`data/dtu_health.db`) using native `node:sqlite`.
- **Relational Tables & Schema:**
  - `students`: Roll number, branch, blood group, medical history
  - `doctors`: Doctor qualifications, OPD departments, contact details
  - `slots`: Doctor availability sessions with capacity gating (`max_limit`, `booked_count`)
  - `appointments`: Patient queue with urgency levels and status
  - `prescriptions`: Digital Rx orders with dosage and medicines
  - `medicines`: Dispensary stock with expiry tracking
  - `notices`: Broadcast health advisories
- **Dual-Storage Engine:** SQLite 3 binary file + readable `data/database.json` dual-persistence.
- **Real-Time Push Architecture:** HTTP **Server-Sent Events (SSE)** stream (`/api/events`) combined with the HTML5 **BroadcastChannel** bus. When an appointment is booked or cancelled, changes push in real time (<10ms) to all active doctor and student screens without manual refresh.
- **Live Database Inspector:** Dedicated `database-viewer.html` module displaying live table rows, SQL record counts, and schema inspection for academic viva demonstration.

---

## 5. Viva & Presentation Guide (Expected Questions & Answers)

**Q1: What database architecture does the system use?**  
*Answer:* We implemented a full **Relational Database Engine using SQLite 3** (`data/dtu_health.db`) powered by Node.js native `node:sqlite`, coupled with a dual JSON document store. It features structured relational tables (`students`, `doctors`, `appointments`, `slots`, `prescriptions`, `medicines`) with primary keys and atomic SQL transactions.

**Q2: How do real-time updates happen across devices and tabs without page reload?**  
*Answer:* We use a hybrid real-time architecture: **Server-Sent Events (SSE)** via `/api/events` pushes live database mutations from the backend, while a client-side **BroadcastChannel bus** syncs open browser tabs with zero network latency. When a student books or cancels, the doctor's screen reflects the change instantly.

**Q3: How is data preserved and can the database be inspected during viva?**  
*Answer:* All data is permanently written to disk in `data/dtu_health.db`. The system includes a built-in **Database Inspector (`database-viewer.html`)** where examiners can inspect all SQL tables, view live record counts, and watch rows update in real time.

**Q4: How is the slot restriction (max 10 students) enforced?**  
*Answer:* Each doctor slot object stores `maxLimit: 10` and `bookedCount`. Upon submission, `book-appointment.html` validates whether `bookedCount < maxLimit`. If full, it displays a "Slot Closed" state and prevents further submissions. Furthermore, backend SQL queries clamp capacity using `MIN(max_limit, booked_count + 1)` and auto-reconcile with active appointments upon cancellation.

**Q5: How does the video call feature function?**  
*Answer:* It uses HTML5 `navigator.mediaDevices.getUserMedia` to stream live webcam video on the local tile while simulating the remote doctor feed with realistic controls, live duration counters, and a synchronized in-call messaging panel.
