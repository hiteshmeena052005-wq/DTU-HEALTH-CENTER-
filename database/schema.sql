-- ============================================================================
-- 🏥 DELHI TECHNOLOGICAL UNIVERSITY (DTU) HEALTH CENTER
-- RELATIONAL DATABASE MANAGEMENT SYSTEM (HOSPITAL DBMS) SCHEMA
-- Standard: 3NF Normalized Relational SQL Schema
-- Engine: SQLite 3 / ANSI SQL Compatible
-- ============================================================================

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10),
    block_location VARCHAR(100) DEFAULT 'DTU Health Center Admin Block'
);

-- 2. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    experience VARCHAR(50) NOT NULL,
    department_id INTEGER REFERENCES departments(department_id),
    department_name VARCHAR(100) NOT NULL,
    photo VARCHAR(10) DEFAULT '👨‍⚕️',
    is_available INTEGER DEFAULT 1
);

-- 3. STUDENTS TABLE (Verified university medical records)
CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    dtu_email VARCHAR(100) UNIQUE NOT NULL,
    branch VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. DOCTOR AVAILABILITY SESSIONS / SLOTS
CREATE TABLE IF NOT EXISTS doctor_slots (
    slot_id INTEGER PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    doctor_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    slot_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    max_capacity INTEGER DEFAULT 10,
    booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= max_capacity),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'OPEN'
);

-- 5. APPOINTMENTS QUEUE (Clinical consultation bookings)
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id VARCHAR(50) PRIMARY KEY,
    slot_id INTEGER REFERENCES doctor_slots(slot_id),
    student_email VARCHAR(100) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    branch VARCHAR(100),
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    doctor_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    consultation_mode VARCHAR(50) DEFAULT 'Physical OPD',
    symptoms_reason TEXT NOT NULL,
    urgency_level VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(30) DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. DIGITAL PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id),
    student_name VARCHAR(100) NOT NULL,
    student_email VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    provisional_diagnosis TEXT NOT NULL,
    diagnostic_tests TEXT DEFAULT 'None',
    follow_up_date VARCHAR(50) DEFAULT 'SOS',
    doctor_notes TEXT,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRESCRIPTION MEDICATION ORDERS (Normalized 1-to-many items)
CREATE TABLE IF NOT EXISTS prescription_medicines (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id VARCHAR(50) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    duration VARCHAR(50) NOT NULL
);

-- 8. SPECIALIST REFERRAL SLIPS TABLE
CREATE TABLE IF NOT EXISTS referrals (
    referral_id VARCHAR(50) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    from_doctor VARCHAR(100) NOT NULL,
    from_department VARCHAR(100) NOT NULL,
    to_doctor VARCHAR(100) NOT NULL,
    to_department VARCHAR(100) NOT NULL,
    priority_level VARCHAR(50) DEFAULT 'Routine OPD Referral',
    clinical_reason TEXT NOT NULL,
    investigations_required TEXT,
    status VARCHAR(50) DEFAULT 'Pending Specialist Visit',
    referred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. PHARMACY / DISPENSARY MEDICINE INVENTORY
CREATE TABLE IF NOT EXISTS pharmacy_medicines (
    medicine_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    unit VARCHAR(50) DEFAULT 'Tablets',
    expiry_date VARCHAR(20) NOT NULL
);

-- 10. CAMPUS PUBLIC HEALTH ADVISORIES / NOTICES
CREATE TABLE IF NOT EXISTS campus_notices (
    notice_id INTEGER PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    notice_type VARCHAR(50) DEFAULT 'announcement',
    posted_date VARCHAR(50) NOT NULL
);

-- 11. 24/7 CAMPUS AMBULANCE SOS DISPATCH LOGS
CREATE TABLE IF NOT EXISTS emergency_sos_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    hostel_location VARCHAR(100) NOT NULL,
    symptoms_condition TEXT,
    dispatch_status VARCHAR(50) DEFAULT 'Ambulance Dispatched',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_name);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_email);
CREATE INDEX IF NOT EXISTS idx_prescriptions_student ON prescriptions(student_email);
CREATE INDEX IF NOT EXISTS idx_referrals_student ON referrals(roll_no);
CREATE INDEX IF NOT EXISTS idx_slots_doctor ON doctor_slots(doctor_id);
