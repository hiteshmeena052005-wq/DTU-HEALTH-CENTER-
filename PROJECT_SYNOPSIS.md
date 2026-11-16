# 🎓 PROJECT SYNOPSIS

## 1. PROJECT TITLE
**DEVELOPMENT OF A DIGITAL HEALTHCARE & TELEMEDICINE WEB PORTAL FOR UNIVERSITY HEALTH CENTER (DTU HEALTH CENTER)**

---

## 2. PROJECT DETAILS
- **Academic Degree:** Bachelor of Technology (B.Tech)
- **Course:** Minor Project
- **Institution:** Delhi Technological University (DTU), Shahbad Daulatpur, Bawana Road, Delhi-110042
- **Academic Year:** 2026–2027

---

## 3. INTRODUCTION & BACKGROUND
University health centers play a critical role in providing primary medical care, first-aid, outpatient consultations, and emergency dispatch services to on-campus students, resident scholars, faculty, and non-teaching staff. 

In large residential universities like Delhi Technological University (DTU), which accommodates over 15,000 students across multiple hostel blocks and academic departments, traditional manual health center operations suffer from long waiting queues, unorganized patient records, lack of visibility regarding doctor availability, and communication delays during late-night hostel emergencies.

This project introduces a centralized, responsive web-based healthcare management prototype designed specifically to streamline and digitalize outpatient appointments, remote telemedicine consultations, specialist referrals, and hostel emergency responses at the DTU Health Center.

---

## 4. PROBLEM STATEMENT
1. **Unpredictable Waiting Times & Overcrowding:** Students visiting the physical OPD during academic hours frequently encounter overcrowding and long queues without prior knowledge of doctor availability.
2. **Lack of Controlled Appointment Quotas:** Without a systematic cap on daily patient intakes, medical officers face burnout, resulting in reduced consultation quality.
3. **Inaccessibility for Quarantined or Bedridden Students:** Hostellers suffering from contagious viral infections or mild mobility impairments lack a direct one-to-one digital consultation channel with campus doctors.
4. **Disjointed Specialist Referrals:** Physical referral slips between general physicians and specialized departments (e.g., Dental, Orthopedics, Mental Health) often get lost or lack clinical notes.
5. **Campus-Specific Emergency Response Gaps:** In urgent hostel scenarios (e.g., late-night fractures, acute asthma attacks), students struggle to obtain direct contact with the campus ambulance and security response teams.

---

## 5. OBJECTIVES OF THE PROJECT
1. **Digitalize Appointment Scheduling:** Implement a slot-limited booking module allowing campus physicians to publish weekly checkup slots with a strict quota (e.g., maximum 10 students per session) to prevent overcrowding.
2. **Student Medical Profile Gating:** Ensure that students must verify essential university credentials (DTU Roll Number, Academic Branch, Blood Group, Emergency Contact) before booking medical appointments.
3. **Integrated Telemedicine Consultation:** Provide an encrypted, browser-based video consultation interface equipped with camera preview, live chat, and instant clinical note generation.
4. **Specialist Doctor Referral Pipeline:** Formulate a digital referral workflow enabling OPD doctors to transfer patient history, clinical findings, and suggested diagnostic tests to specialist departments.
5. **Instant Campus Ambulance SOS System:** Implement a dedicated hostel-level emergency dispatch alert connecting students to campus security and the DTU ambulance hotline with calculated ETAs.
6. **Role-Based Security:** Restrict internal pharmacy inventory tracking and slot creation strictly to medical staff (Doctor/Admin role).

---

## 6. SYSTEM ARCHITECTURE & DESIGN METHODOLOGY

### 6.1 Architecture Overview
The system follows a modular client-server web architecture implemented as a client-side prototype. It separates concerns between the presentation layer (HTML5/CSS3), business logic controller (`app.js`), and data layer (`data.js` coupled with browser `localStorage`).

```
+-------------------------------------------------------------+
|                     PRESENTATION LAYER                      |
| (Responsive HTML5 & CSS3 with DTU Maroon/Gold Institutional UI) |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   APPLICATION LOGIC LAYER                    |
|                        (`app.js`)                           |
|  - Role Authentication (Student vs Doctor/Admin)             |
|  - Slot Capacity Check (Max 10 Students Threshold)          |
|  - Video Stream Controller (HTML5 getUserMedia API)         |
|  - Referral & Prescription Document Generators              |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      PERSISTENCE LAYER                      |
|                  (`localStorage` & `data.js`)               |
|  - Student Profiles, Doctor Records, Appointments           |
|  - Digital Prescriptions, Hospital Referrals, Drug Stock    |
+-------------------------------------------------------------+
```

---

## 7. MODULE DESCRIPTION

### Module 1: Institutional Landing & Information Portal (`index.html`)
- Displays official DTU branding (Maroon `#800020` & Gold `#C5A55A`).
- Showcases healthcare services, operating hours, emergency helplines, and profiles of medical officers across 10 departments.
- Dynamically adapts navigation based on active login state.

### Module 2: Authentication & Student Profile Gating (`login.html`, `student-profile.html`)
- Dual-role login portal for Students and Doctors (Administrators).
- Enforces mandatory verification of university credentials (Roll No, Branch, DOB, Blood Group) before granting access to medical booking services.

### Module 3: Slot-Restricted Consultation Booking (`book-appointment.html`)
- Doctors broadcast scheduled sessions with a hard limit of 10 students per slot.
- Students submit a clinical consultation questionnaire detailing symptoms, severity, and preferred consultation mode (Physical OPD vs. Online Video).
- Automatic lockout triggers once 10/10 capacity is reached.

### Module 4: Doctor / Administrator Operations Portal (`doctor-dashboard.html`)
- Live queue monitor showing pending patient appointments with symptoms and urgency tags.
- Tools to publish weekly checkup slots and broadcast campus-wide public health notices.

### Module 5: Telemedicine Video Consultation Room (`video-call.html`)
- Browser-based peer consultation leveraging the HTML5 `getUserMedia` API for self-video stream.
- Includes call duration timer, microphone/camera toggles, in-call interactive messaging, and real-time prescription draft panel.

### Module 6: Specialist Referral & Digital Prescription System (`referral.html`, `prescriptions.html`)
- Generates clinical referral slips transferring cases between OPD physicians and specialty departments (Dental, Orthopedic, Psychiatry, ENT, etc.).
- Produces printable and downloadable digital prescription records featuring diagnosis, medication orders, dosages, and follow-up dates.

### Module 7: Instant Hostel Ambulance SOS Dispatch (`emergency.html`)
- Features a single-tap campus emergency dispatch button with a hostel block selector (B.R. Ambedkar Hostel, Raman Hostel, Science Block, etc.).
- Simulates emergency dispatch alerting campus security and ambulance drivers with an estimated 3-5 minute response window.

### Module 8: Role-Restricted Dispensary Stock Tracker (`medicine-inventory.html`)
- Accessible strictly to Doctors and Administrators.
- Real-time stock status monitoring with one-click quantity adjustment (`+10` / `-10`) for campus pharmacy supplies.

---

## 8. HARDWARE & SOFTWARE REQUIREMENTS

### Software Requirements
- **Frontend Technologies:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage / State Management:** Browser LocalStorage API
- **Multimedia Protocols:** HTML5 WebRTC / `navigator.mediaDevices.getUserMedia`
- **Supported Web Browsers:** Google Chrome, Microsoft Edge, Mozilla Firefox, Safari
- **Operating System:** Platform independent (Windows 10/11, macOS, Linux, Android, iOS)

### Hardware Requirements
- **Processor:** Intel Core i3 / AMD Ryzen 3 or higher (or equivalent mobile processor)
- **RAM:** Minimum 2 GB (4 GB recommended)
- **Storage:** 50 MB free disk space
- **Peripherals:** Integrated or external Web Camera & Microphone (for Telehealth video consultation)

---

## 9. FEASIBILITY ANALYSIS

1. **Technical Feasibility:**  
   The prototype uses standard, universal web technologies without dependency on third-party frameworks or external npm packages. It executes natively in all modern web browsers.

2. **Operational Feasibility:**  
   The user interface is intuitive and requires zero training for students and campus doctors. Pre-filled forms and clear navigation minimize operational friction.

3. **Economic Feasibility:**  
   Zero infrastructure cost during prototyping. Production scaling can utilize open-source stacks (Node.js/PostgreSQL) and existing university intranet servers.

---

## 10. EXPECTED OUTCOMES
- A fully functional, responsive healthcare web portal prototype customized for Delhi Technological University.
- Elimination of physical queues through slot quotas and transparent doctor schedules.
- Seamless digital health record tracking accessible to students anytime via their university credentials.
- Significantly enhanced campus emergency response times during hostel medical crises.

---

## 11. FUTURE ENHANCEMENTS (PHASE 2 SCOPE)
- **Full-Stack Database Migration:** Transitioning client-side `localStorage` to a scalable PostgreSQL/MongoDB backend with Node.js/Express.
- **WebRTC Peer-to-Peer Streaming:** Implementation of STUN/TURN signaling servers for multi-user telehealth sessions.
- **Automated SMS/Email Alerts:** Integration with Twilio/DTU SMTP gateways to send instant slot booking and ambulance confirmation SMS to students' registered mobile numbers.
- **Epidemic & Health Analytics Dashboard:** Machine learning integration to forecast seasonal outbreaks (e.g., Dengue, viral conjunctivitis) based on OPD diagnostic trends.

---

## 12. CONCLUSION
The proposed **DTU Health Center Web Application** bridges the gap between campus healthcare providers and students. By combining quota-based scheduling, remote video consultations, institutional doctor referrals, and rapid ambulance alerts, this minor project demonstrates an effective, modern, and scalable healthcare delivery model tailored for university campuses.
