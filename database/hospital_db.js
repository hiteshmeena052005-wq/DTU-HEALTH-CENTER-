// ============================================================================
// 🏥 DTU HEALTH CENTER - HOSPITAL DBMS CONTROLLER
// Powered by Node.js Native SQLite 3 (node:sqlite)
// ============================================================================

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = __dirname;
const DB_FILE = path.join(DB_DIR, 'hospital.db');
const SCHEMA_FILE = path.join(DB_DIR, 'schema.sql');
const SEED_FILE = path.join(DB_DIR, 'seed.sql');

let db = null;

try {
    db = new DatabaseSync(DB_FILE);
    // Initialize Schema & Seeds
    if (fs.existsSync(SCHEMA_FILE)) {
        const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
        db.exec(schema);
    }
    if (fs.existsSync(SEED_FILE)) {
        const seeds = fs.readFileSync(SEED_FILE, 'utf8');
        db.exec(seeds);
    }
    console.log(`🗄️ [DBMS READY] Hospital Relational Database connected: ${DB_FILE}`);
} catch (e) {
    console.error(`❌ [DBMS ERROR] Database initialization failed: ${e.message}`);
}

const hospitalDB = {
    // -------------------------------------------------------------
    // 1. APPOINTMENTS MANAGEMENT
    // -------------------------------------------------------------
    getAppointments() {
        if (!db) return [];
        try {
            return db.prepare(`
                SELECT 
                    appointment_id AS id,
                    slot_id AS slotId,
                    student_email AS studentEmail,
                    student_name AS studentName,
                    roll_no AS rollNo,
                    branch,
                    doctor_name AS doctorName,
                    department,
                    appointment_date AS date,
                    appointment_time AS time,
                    consultation_mode AS mode,
                    symptoms_reason AS reason,
                    urgency_level AS urgency,
                    status,
                    created_at AS createdAt
                FROM appointments
                WHERE status != 'cancelled'
                ORDER BY created_at DESC
            `).all();
        } catch (e) {
            console.error('getAppointments error:', e.message);
            return [];
        }
    },

    bookAppointment(apt) {
        if (!db) return { success: false, error: 'Database offline' };
        try {
            const aptId = apt.id || 'APT-' + Date.now().toString().slice(-4);
            const slotId = apt.slotId || null;
            const docName = apt.doctorName || '';

            // 1. Check slot capacity
            if (slotId || docName) {
                const slot = db.prepare(`
                    SELECT slot_id, max_capacity, booked_count 
                    FROM doctor_slots 
                    WHERE slot_id = ? OR doctor_name = ?
                `).get(slotId || -1, docName);

                if (slot && slot.booked_count >= slot.max_capacity) {
                    return { success: false, error: 'Slot has reached maximum capacity of 10 students' };
                }
            }

            // 2. Insert into appointments table
            db.prepare(`
                INSERT INTO appointments (
                    appointment_id, slot_id, student_email, student_name, roll_no, branch,
                    doctor_id, doctor_name, department, appointment_date, appointment_time,
                    consultation_mode, symptoms_reason, urgency_level, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                aptId,
                slotId,
                apt.studentEmail || 'student@dtu.ac.in',
                apt.studentName || 'Student',
                apt.rollNo || '2K22/CO/101',
                apt.branch || 'DTU',
                apt.doctorId || 1,
                docName,
                apt.department || 'General Medicine (OPD)',
                apt.date || new Date().toISOString().split('T')[0],
                apt.time || '10:00 AM - 01:00 PM',
                apt.mode || 'Physical OPD',
                apt.reason || 'Routine consultation',
                apt.urgency || 'Normal',
                'confirmed',
                new Date().toISOString()
            );

            // 3. Atomically update slot capacity
            if (slotId || docName) {
                db.prepare(`
                    UPDATE doctor_slots 
                    SET booked_count = MIN(max_capacity, booked_count + 1)
                    WHERE slot_id = ? OR doctor_name = ?
                `).run(slotId || -1, docName);
            }

            console.log(`📝 [DBMS INSERT] Appointment booked in SQL table: ${apt.studentName} -> ${docName}`);
            return { success: true, id: aptId };
        } catch (e) {
            console.error('bookAppointment error:', e.message);
            return { success: false, error: e.message };
        }
    },

    cancelAppointment(aptId, slotId, doctorName) {
        if (!db) return { success: false, error: 'Database offline' };
        try {
            // Fetch appointment details before deleting
            const target = db.prepare('SELECT slot_id, doctor_name FROM appointments WHERE appointment_id = ?').get(aptId);
            const effSlotId = slotId || (target ? target.slot_id : null);
            const effDocName = doctorName || (target ? target.doctor_name : null);

            // Delete appointment record
            db.prepare('DELETE FROM appointments WHERE appointment_id = ?').run(aptId);

            // Recount active appointments and update slot capacity
            if (effSlotId || effDocName) {
                const activeCount = db.prepare(`
                    SELECT COUNT(*) as count FROM appointments 
                    WHERE (slot_id = ? OR doctor_name = ?) AND status != 'cancelled'
                `).get(effSlotId || -1, effDocName || '');

                db.prepare(`
                    UPDATE doctor_slots 
                    SET booked_count = MAX(0, ?) 
                    WHERE slot_id = ? OR doctor_name = ?
                `).run(activeCount.count, effSlotId || -1, effDocName || '');

                console.log(`📉 [DBMS CANCEL] Appointment ${aptId} cancelled. Slot capacity updated to ${activeCount.count}/10.`);
            }

            return { success: true };
        } catch (e) {
            console.error('cancelAppointment error:', e.message);
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 2. DOCTOR AVAILABILITY SLOTS
    // -------------------------------------------------------------
    getSlots() {
        if (!db) return [];
        try {
            // Reconcile slots count with actual active appointments
            const slots = db.prepare('SELECT * FROM doctor_slots ORDER BY slot_date ASC').all();
            slots.forEach(s => {
                const active = db.prepare(`
                    SELECT COUNT(*) as c FROM appointments 
                    WHERE (slot_id = ? OR doctor_name = ?) AND status != 'cancelled'
                `).get(s.slot_id, s.doctor_name);
                if (s.booked_count !== active.c) {
                    db.prepare('UPDATE doctor_slots SET booked_count = ? WHERE slot_id = ?').run(active.c, s.slot_id);
                    s.booked_count = active.c;
                }
            });

            return slots.map(s => ({
                id: s.slot_id,
                doctorId: s.doctor_id,
                doctorName: s.doctor_name,
                department: s.department,
                date: s.slot_date,
                startTime: s.start_time,
                endTime: s.end_time,
                maxLimit: s.max_capacity,
                bookedCount: s.booked_count,
                note: s.notes,
                status: s.status
            }));
        } catch (e) {
            console.error('getSlots error:', e.message);
            return [];
        }
    },

    createSlot(s) {
        if (!db) return { success: false };
        try {
            const slotId = s.id || Date.now();
            db.prepare(`
                INSERT OR REPLACE INTO doctor_slots (
                    slot_id, doctor_id, doctor_name, department, slot_date,
                    start_time, end_time, max_capacity, booked_count, notes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                slotId,
                s.doctorId || 1,
                s.doctorName || 'Dr. Rajesh Sharma',
                s.department || 'General Medicine (OPD)',
                s.date || '',
                s.startTime || '10:00 AM',
                s.endTime || '01:00 PM',
                s.maxLimit || 10,
                0,
                s.note || '',
                'OPEN'
            );
            console.log(`📅 [DBMS INSERT] Slot posted in SQL: ${s.doctorName} (${s.date})`);
            return { success: true, slotId };
        } catch (e) {
            console.error('createSlot error:', e.message);
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 3. DIGITAL PRESCRIPTIONS & CLINICAL NOTES
    // -------------------------------------------------------------
    getPrescriptions() {
        if (!db) return [];
        try {
            const rxList = db.prepare('SELECT * FROM prescriptions ORDER BY issued_at DESC').all();
            const medStmt = db.prepare('SELECT medicine_name as name, dosage, duration FROM prescription_medicines WHERE prescription_id = ?');

            return rxList.map(r => {
                const meds = medStmt.all(r.prescription_id);
                return {
                    id: r.prescription_id,
                    appointmentId: r.appointment_id,
                    studentName: r.student_name,
                    studentEmail: r.student_email,
                    doctorName: r.doctor_name,
                    department: r.department,
                    diagnosis: r.provisional_diagnosis,
                    medicines: meds,
                    tests: r.diagnostic_tests,
                    followUp: r.follow_up_date,
                    notes: r.doctor_notes,
                    date: r.issued_at ? r.issued_at.split('T')[0] : ''
                };
            });
        } catch (e) {
            console.error('getPrescriptions error:', e.message);
            return [];
        }
    },

    issuePrescription(rx) {
        if (!db) return { success: false };
        try {
            const rxId = rx.id || 'RX-' + Date.now().toString().slice(-4);
            
            // 1. Insert into prescriptions table
            db.prepare(`
                INSERT OR REPLACE INTO prescriptions (
                    prescription_id, appointment_id, student_name, student_email,
                    doctor_name, department, provisional_diagnosis, diagnostic_tests,
                    follow_up_date, doctor_notes, issued_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                rxId,
                rx.appointmentId || null,
                rx.studentName || 'Student',
                rx.studentEmail || 'student@dtu.ac.in',
                rx.doctorName || 'Dr. Rajesh Sharma',
                rx.department || 'General Medicine',
                rx.diagnosis || 'Clinical consultation diagnosis',
                rx.tests || 'None',
                rx.followUp || 'SOS',
                rx.notes || '',
                new Date().toISOString()
            );

            // 2. Insert medication line items
            if (Array.isArray(rx.medicines)) {
                const itemStmt = db.prepare(`
                    INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, duration)
                    VALUES (?, ?, ?, ?)
                `);
                rx.medicines.forEach(m => {
                    itemStmt.run(rxId, m.name || '', m.dosage || '', m.duration || '');
                });
            }

            console.log(`💊 [DBMS INSERT] Digital Prescription ${rxId} issued for ${rx.studentName}`);
            return { success: true, id: rxId };
        } catch (e) {
            console.error('issuePrescription error:', e.message);
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 4. SPECIALIST REFERRALS
    // -------------------------------------------------------------
    getReferrals() {
        if (!db) return [];
        try {
            return db.prepare(`
                SELECT 
                    referral_id AS id,
                    student_name AS studentName,
                    roll_no AS rollNo,
                    from_doctor AS fromDoctor,
                    from_department AS fromDept,
                    to_doctor AS toDoctor,
                    to_department AS toDept,
                    priority_level AS priority,
                    clinical_reason AS reason,
                    investigations_required AS tests,
                    status,
                    referred_at AS date
                FROM referrals
                ORDER BY referred_at DESC
            `).all();
        } catch (e) {
            console.error('getReferrals error:', e.message);
            return [];
        }
    },

    createReferral(ref) {
        if (!db) return { success: false };
        try {
            const refId = ref.id || 'REF-' + Date.now().toString().slice(-4);
            db.prepare(`
                INSERT OR REPLACE INTO referrals (
                    referral_id, student_name, roll_no, from_doctor, from_department,
                    to_doctor, to_department, priority_level, clinical_reason,
                    investigations_required, status, referred_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                refId,
                ref.studentName || 'Student',
                ref.rollNo || '2K22/CO/101',
                ref.fromDoctor || 'Dr. Rajesh Sharma',
                ref.fromDept || 'General Medicine (OPD)',
                ref.toDoctor || 'Specialist',
                ref.toDept || 'Specialty Dept',
                ref.priority || 'Routine OPD Referral',
                ref.reason || '',
                ref.tests || 'None',
                ref.status || 'Pending Specialist Visit',
                new Date().toISOString()
            );

            console.log(`🔄 [DBMS INSERT] Patient ${ref.studentName} referred to ${ref.toDoctor}`);
            return { success: true, id: refId };
        } catch (e) {
            console.error('createReferral error:', e.message);
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 5. PHARMACY MEDICINE INVENTORY
    // -------------------------------------------------------------
    getMedicines() {
        if (!db) return [];
        try {
            return db.prepare('SELECT medicine_id AS id, name, category, stock_quantity AS stock, unit, expiry_date AS expiry FROM pharmacy_medicines ORDER BY name ASC').all();
        } catch (e) {
            return [];
        }
    },

    updateMedicineStock(id, newStock) {
        if (!db) return { success: false };
        try {
            db.prepare('UPDATE pharmacy_medicines SET stock_quantity = ? WHERE medicine_id = ?').run(parseInt(newStock), parseInt(id));
            console.log(`📦 [DBMS UPDATE] Medicine ID ${id} stock updated to ${newStock}`);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 6. CAMPUS HEALTH NOTICES
    // -------------------------------------------------------------
    getNotices() {
        if (!db) return [];
        try {
            return db.prepare('SELECT notice_id AS id, title, content, doctor_name AS doctorName, department, notice_type AS type, posted_date AS date FROM campus_notices ORDER BY notice_id DESC').all();
        } catch (e) {
            return [];
        }
    },

    createNotice(n) {
        if (!db) return { success: false };
        try {
            const id = n.id || Date.now();
            db.prepare(`
                INSERT OR REPLACE INTO campus_notices (notice_id, title, content, doctor_name, department, notice_type, posted_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, n.title, n.content, n.doctorName, n.department, n.type || 'announcement', n.date || new Date().toLocaleDateString());
            return { success: true, id };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 7. EMERGENCY SOS DISPATCH LOGS
    // -------------------------------------------------------------
    logEmergencySOS(sos) {
        if (!db) return { success: false };
        try {
            db.prepare(`
                INSERT INTO emergency_sos_logs (student_name, roll_no, contact_phone, hostel_location, symptoms_condition, dispatch_status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                sos.studentName || 'Student',
                sos.rollNo || '2K22/CO/101',
                sos.phone || '+91 9876543210',
                sos.location || 'DTU Campus',
                sos.details || 'Campus Medical Emergency',
                'Ambulance Dispatched',
                new Date().toISOString()
            );
            console.log(`🚨 [DBMS INSERT] Emergency SOS logged: Location ${sos.location}`);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // -------------------------------------------------------------
    // 8. RESET TEST DATA
    // -------------------------------------------------------------
    resetDatabase() {
        if (!db) return { success: false };
        try {
            db.prepare('DELETE FROM appointments').run();
            db.prepare('DELETE FROM prescriptions').run();
            db.prepare('DELETE FROM prescription_medicines').run();
            db.prepare('DELETE FROM referrals').run();
            db.prepare('DELETE FROM emergency_sos_logs').run();
            db.prepare('UPDATE doctor_slots SET booked_count = 0').run();
            console.log('🧹 [DBMS RESET] Hospital database reset to clean initial seeds.');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};

module.exports = hospitalDB;
