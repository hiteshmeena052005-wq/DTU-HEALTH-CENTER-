-- ============================================================================
-- 🏥 DTU HEALTH CENTER - INITIAL DBMS DATASET SEEDS
-- ============================================================================

-- DEPARTMENTS
INSERT OR IGNORE INTO departments (department_id, name, icon, block_location) VALUES
(1, 'General Medicine (OPD)', '🏥', 'Ground Floor, Room 1-4'),
(2, 'Dental', '🦷', 'First Floor, Room 12'),
(3, 'Orthopedic', '🦴', 'Ground Floor, Room 6'),
(4, 'Dermatology', '🧴', 'First Floor, Room 15'),
(5, 'Psychiatry & Counseling', '🧠', 'Admin Block, Room 22'),
(6, 'ENT', '👂', 'Ground Floor, Room 8'),
(7, 'Ophthalmology', '👁️', 'First Floor, Room 14'),
(8, 'Gynecology', '🩺', 'First Floor, Room 11'),
(9, 'Physiotherapy', '💪', 'Basement Wellness Center'),
(10, 'Pathology & Lab', '🔬', 'Ground Floor, Room 9');

-- DOCTORS
INSERT OR IGNORE INTO doctors (doctor_id, name, email, phone, qualification, experience, department_id, department_name, photo, is_available) VALUES
(1, 'Dr. Rajesh Sharma', 'dr.sharma@dtu.ac.in', '+91 9811223344', 'MBBS, MD (Medicine)', '12+ Years', 1, 'General Medicine (OPD)', '👨‍⚕️', 1),
(2, 'Dr. Priya Verma', 'dr.priya@dtu.ac.in', '+91 9811223345', 'BDS, MDS', '8+ Years', 2, 'Dental', '👩‍⚕️', 1),
(3, 'Dr. Amit Kumar', 'dr.amit@dtu.ac.in', '+91 9811223346', 'MBBS, MS (Ortho)', '15+ Years', 3, 'Orthopedic', '👨‍⚕️', 1),
(4, 'Dr. Sunita Gupta', 'dr.sunita@dtu.ac.in', '+91 9811223347', 'MD (Psychiatry), DPM', '10+ Years', 5, 'Psychiatry & Counseling', '👩‍⚕️', 1),
(5, 'Dr. Vikram Singh', 'dr.vikram@dtu.ac.in', '+91 9811223348', 'MBBS, DVD, MD', '9+ Years', 4, 'Dermatology', '👨‍⚕️', 1),
(6, 'Dr. Neha Agarwal', 'dr.neha@dtu.ac.in', '+91 9811223349', 'MBBS, MS (ENT)', '7+ Years', 6, 'ENT', '👩‍⚕️', 1);

-- STUDENTS
INSERT OR IGNORE INTO students (student_id, roll_no, name, email, dtu_email, branch, year, dob, blood_group, phone) VALUES
(1, '2K22/CO/101', 'Rahul Meena', 'rahul.22co101@dtu.ac.in', 'rahul.22co101@dtu.ac.in', 'Computer Science & Engineering', '3rd Year', '2003-05-14', 'B+', '+91 9876543210');

-- DOCTOR SLOTS
INSERT OR IGNORE INTO doctor_slots (slot_id, doctor_id, doctor_name, department, slot_date, start_time, end_time, max_capacity, booked_count, notes, status) VALUES
(1, 1, 'Dr. Rajesh Sharma', 'General Medicine (OPD)', '2026-11-18', '10:00 AM', '01:00 PM', 10, 0, 'OPD physical checkup slots available for students with fever/cough', 'OPEN'),
(2, 2, 'Dr. Priya Verma', 'Dental', '2026-11-19', '11:00 AM', '02:00 PM', 10, 0, 'Dental examination & cavity screening', 'OPEN'),
(3, 4, 'Dr. Sunita Gupta', 'Psychiatry & Counseling', '2026-11-20', '02:00 PM', '05:00 PM', 10, 0, 'One-on-one stress and anxiety management session', 'OPEN');

-- PHARMACY MEDICINES
INSERT OR IGNORE INTO pharmacy_medicines (medicine_id, name, category, stock_quantity, unit, expiry_date) VALUES
(1, 'Paracetamol 650mg', 'Analgesic / Fever', 120, 'Tablets', '2027-04'),
(2, 'Cetirizine 10mg', 'Antihistamine / Allergy', 85, 'Tablets', '2026-12'),
(3, 'Amoxicillin 500mg', 'Antibiotic', 45, 'Capsules', '2026-09'),
(4, 'Pantoprazole 40mg', 'Antacid / Acidity', 90, 'Tablets', '2027-02'),
(5, 'Ibuprofen 400mg', 'Pain Relief', 60, 'Tablets', '2026-11'),
(6, 'ORS Sachet', 'Electrolyte / Dehydration', 150, 'Packs', '2027-08'),
(7, 'Betadine Ointment', 'Antiseptic', 35, 'Tubes', '2026-10'),
(8, 'Azithromycin 500mg', 'Antibiotic', 40, 'Tablets', '2026-08'),
(9, 'Bandage Roll (Cotton)', 'First Aid', 75, 'Rolls', '2028-01'),
(10, 'Dextromethorphan Syrup', 'Cough Syrup', 28, 'Bottles', '2026-07'),
(11, 'Volini Pain Spray', 'Pain Relief', 22, 'Cans', '2027-01'),
(12, 'Vitamin C Chewable', 'Supplements', 110, 'Tablets', '2027-05');

-- CAMPUS HEALTH NOTICES
INSERT OR IGNORE INTO campus_notices (notice_id, title, content, doctor_name, department, notice_type, posted_date) VALUES
(1, 'Flu Vaccination Drive at Health Center', 'Annual seasonal influenza vaccination drive will be conducted on 20th Nov from 10:00 AM to 4:00 PM. All students are advised to bring DTU ID.', 'Dr. Rajesh Sharma', 'General Medicine', 'announcement', '16 Nov 2026');
