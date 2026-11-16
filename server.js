// DTU Health Center - Full-Stack Real-Time Database & Web Server
// Powered by Node.js Native SQLite 3 (node:sqlite) + JSON Dual Engine
// 100% Native - Zero external npm packages required

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 5000;
const DB_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DB_DIR, 'database.json');
const SQLITE_FILE = path.join(DB_DIR, 'dtu_health.db');
const PUBLIC_DIR = __dirname;

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ==========================================
// 🗄️ SQLITE 3 RELATIONAL DATABASE ENGINE
// ==========================================

let sqlite = null;

try {
    sqlite = new DatabaseSync(SQLITE_FILE);
    initSqliteSchema(sqlite);
    console.log(`🗄️ [SQLITE] Connected to SQLite 3 Relational Database: ${SQLITE_FILE}`);
} catch (e) {
    console.warn(`⚠️ [SQLITE] Initialization error: ${e.message}. Operating in JSON mode.`);
    sqlite = null;
}

function initSqliteSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY,
            name TEXT,
            email TEXT,
            dtu_email TEXT,
            roll_no TEXT,
            branch TEXT,
            year TEXT,
            dob TEXT,
            blood_group TEXT,
            phone TEXT
        );

        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY,
            name TEXT,
            department TEXT,
            qualification TEXT,
            experience TEXT,
            photo TEXT,
            email TEXT,
            phone TEXT,
            available INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS slots (
            id INTEGER PRIMARY KEY,
            doctor_id INTEGER,
            doctor_name TEXT,
            department TEXT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            max_limit INTEGER DEFAULT 10,
            booked_count INTEGER DEFAULT 0,
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            slot_id INTEGER,
            student_email TEXT,
            student_name TEXT,
            roll_no TEXT,
            branch TEXT,
            doctor_name TEXT,
            department TEXT,
            date TEXT,
            time TEXT,
            mode TEXT,
            reason TEXT,
            urgency TEXT,
            status TEXT DEFAULT 'confirmed',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            id TEXT PRIMARY KEY,
            patient_name TEXT,
            roll_no TEXT,
            doctor_name TEXT,
            department TEXT,
            diagnosis TEXT,
            medicines TEXT,
            advice TEXT,
            date TEXT
        );

        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            patient_name TEXT,
            roll_no TEXT,
            referring_doctor TEXT,
            specialist_dept TEXT,
            hospital_name TEXT,
            clinical_notes TEXT,
            urgency TEXT,
            date TEXT
        );

        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY,
            title TEXT,
            content TEXT,
            doctor_name TEXT,
            department TEXT,
            date TEXT,
            type TEXT
        );

        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY,
            name TEXT,
            category TEXT,
            stock INTEGER,
            unit TEXT,
            expiry TEXT
        );

        CREATE TABLE IF NOT EXISTS emergencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT,
            roll_no TEXT,
            phone TEXT,
            location TEXT,
            details TEXT,
            timestamp TEXT
        );
    `);

    // Seed SQLite tables if empty from database.json
    seedSqliteFromJSON(db);
}

function seedSqliteFromJSON(db) {
    try {
        const docCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get();
        if (docCount.count === 0 && fs.existsSync(JSON_FILE)) {
            const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
            
            if (raw.doctors) {
                const stmt = db.prepare('INSERT OR REPLACE INTO doctors (id, name, department, qualification, experience, photo, email, phone, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                raw.doctors.forEach(d => stmt.run(d.id, d.name, d.department, d.qualification, d.experience, d.photo, d.email, d.phone, d.available ? 1 : 0));
            }

            if (raw.slots) {
                const stmt = db.prepare('INSERT OR REPLACE INTO slots (id, doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                raw.slots.forEach(s => stmt.run(s.id, s.doctorId, s.doctorName, s.department, s.date, s.startTime, s.endTime, s.maxLimit || 10, s.bookedCount || 0, s.note || ''));
            }

            if (raw.students) {
                const stmt = db.prepare('INSERT OR REPLACE INTO students (id, name, email, dtu_email, roll_no, branch, year, dob, blood_group, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                raw.students.forEach(st => stmt.run(st.id, st.name, st.email, st.dtuEmail, st.rollNo, st.branch, st.year, st.dob, st.bloodGroup, st.phone));
            }

            if (raw.medicines) {
                const stmt = db.prepare('INSERT OR REPLACE INTO medicines (id, name, category, stock, unit, expiry) VALUES (?, ?, ?, ?, ?, ?)');
                raw.medicines.forEach(m => stmt.run(m.id, m.name, m.category, m.stock, m.unit, m.expiry));
            }

            if (raw.notices) {
                const stmt = db.prepare('INSERT OR REPLACE INTO notices (id, title, content, doctor_name, department, date, type) VALUES (?, ?, ?, ?, ?, ?, ?)');
                raw.notices.forEach(n => stmt.run(n.id, n.title, n.content, n.doctorName, n.department, n.date, n.type));
            }
            console.log('🌱 [SQLITE] Initial DTU medical datasets seeded successfully into SQLite tables.');
        }
    } catch (e) {
        console.warn('SQLite seed note:', e.message);
    }
}

// JSON Read / Write Helpers
function readJsonDatabase() {
    try {
        if (!fs.existsSync(JSON_FILE)) {
            return { students: [], doctors: [], appointments: [], slots: [], prescriptions: [], referrals: [], notices: [], medicines: [], emergencies: [] };
        }
        return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    } catch (e) {
        return { students: [], doctors: [], appointments: [], slots: [], prescriptions: [], referrals: [], notices: [], medicines: [], emergencies: [] };
    }
}

function writeJsonDatabase(data) {
    try {
        fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

// ==========================================
// ⚡ REAL-TIME SERVER-SENT EVENTS (SSE) BUS
// ==========================================
let sseClients = [];

function broadcastEvent(type, payload = {}) {
    const data = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    const message = `event: message\ndata: ${data}\n\n`;

    sseClients.forEach(client => {
        try {
            client.write(message);
        } catch (e) {}
    });
}

// Parse Body Helper
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
}

// ==========================================
// 🌐 HTTP SERVER & API CONTROLLER
// ==========================================
const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // ⚡ SSE REAL-TIME STREAM ENDPOINT
    // ==========================================
    if (pathname === '/api/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        res.write(`event: connected\ndata: {"status":"connected","engine":"SQLite 3 + SSE Bus"}\n\n`);
        sseClients.push(res);
        console.log(`🔌 [SSE CONNECT] Client connected to Real-Time stream (Total active clients: ${sseClients.length})`);

        req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
            console.log(`🔌 [SSE DISCONNECT] Client disconnected (Remaining clients: ${sseClients.length})`);
        });
        return;
    }

    // ==========================================
    // 🗄️ REST API DATABASE ENDPOINTS
    // ==========================================
    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        // GET /api/status
        if (pathname === '/api/status' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'online',
                databaseEngine: 'SQLite 3 Relational Database Engine (node:sqlite) + JSON Dual-Store',
                sqliteFile: 'data/dtu_health.db',
                jsonFile: 'data/database.json',
                realTimeEngine: 'Server-Sent Events (SSE) Bus',
                connectedClients: sseClients.length,
                message: 'DTU Health Center Relational Database Online'
            }));
            return;
        }

        // ======================================
        // APPOINTMENTS API
        // ======================================
        if (pathname === '/api/appointments') {
            if (req.method === 'GET') {
                let list = [];
                if (sqlite) {
                    try {
                        list = sqlite.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
                    } catch (e) {
                        list = readJsonDatabase().appointments || [];
                    }
                } else {
                    list = readJsonDatabase().appointments || [];
                }
                res.writeHead(200);
                res.end(JSON.stringify(list));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const aptId = body.id || 'APT-' + Date.now().toString().slice(-4);
                body.id = aptId;

                // 1. Persist to SQLite
                if (sqlite) {
                    try {
                        const stmt = sqlite.prepare(`
                            INSERT OR REPLACE INTO appointments 
                            (id, slot_id, student_email, student_name, roll_no, branch, doctor_name, department, date, time, mode, reason, urgency, status, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        stmt.run(
                            body.id,
                            body.slotId || null,
                            body.studentEmail || '',
                            body.studentName || '',
                            body.rollNo || '',
                            body.branch || '',
                            body.doctorName || '',
                            body.department || '',
                            body.date || '',
                            body.time || '',
                            body.mode || 'Physical OPD',
                            body.reason || '',
                            body.urgency || 'Normal',
                            body.status || 'confirmed',
                            body.createdAt || new Date().toISOString()
                        );

                        // Update slot booked count in SQLite
                        if (body.slotId || body.doctorName) {
                            sqlite.prepare(`
                                UPDATE slots 
                                SET booked_count = MIN(max_limit, booked_count + 1) 
                                WHERE id = ? OR doctor_name = ?
                            `).run(body.slotId || -1, body.doctorName || '');
                        }
                    } catch (e) {
                        console.error('SQLite appointment insert error:', e.message);
                    }
                }

                // 2. Persist to JSON
                const db = readJsonDatabase();
                db.appointments = db.appointments || [];
                const exists = db.appointments.some(a => a.id === body.id);
                if (!exists) {
                    db.appointments.unshift(body);
                }
                if (db.slots) {
                    const targetSlot = db.slots.find(s => (body.slotId && s.id == body.slotId) || (body.doctorName && s.doctorName === body.doctorName));
                    if (targetSlot) {
                        targetSlot.bookedCount = Math.min(targetSlot.maxLimit || 10, (targetSlot.bookedCount || 0) + 1);
                    }
                }
                writeJsonDatabase(db);

                console.log(`📝 [DB SQLITE + JSON INSERT] Appointment: ${body.studentName} (${body.rollNo}) -> ${body.doctorName}`);

                // 3. Broadcast Real-Time SSE to all open tabs
                broadcastEvent('APPOINTMENT_BOOKED', { appointment: body, slotId: body.slotId });

                res.writeHead(201);
                res.end(JSON.stringify({ success: true, appointment: body }));
                return;
            }
        }

        // ======================================
        // CANCEL APPOINTMENT API (Frees slot)
        // ======================================
        if (pathname === '/api/appointments/cancel' && req.method === 'POST') {
            const body = await parseBody(req);
            const aptId = body.id;
            const slotId = body.slotId;
            const docName = body.doctorName;

            // 1. Delete from SQLite
            if (sqlite) {
                try {
                    sqlite.prepare('DELETE FROM appointments WHERE id = ?').run(aptId);

                    // Recalculate and update slot count in SQLite
                    const remainingApts = sqlite.prepare(`
                        SELECT COUNT(*) as count FROM appointments 
                        WHERE slot_id = ? OR doctor_name = ?
                    `).get(slotId || -1, docName || '');

                    sqlite.prepare(`
                        UPDATE slots 
                        SET booked_count = ? 
                        WHERE id = ? OR doctor_name = ?
                    `).run(remainingApts.count, slotId || -1, docName || '');

                    console.log(`📉 [SQLITE CANCEL] Appointment ${aptId} deleted. Slot count reset to ${remainingApts.count}.`);
                } catch (e) {
                    console.error('SQLite cancel error:', e.message);
                }
            }

            // 2. Delete from JSON
            const db = readJsonDatabase();
            const targetApt = (db.appointments || []).find(a => a.id === aptId);
            const effectiveSlotId = slotId || (targetApt ? targetApt.slotId : null);
            const effectiveDocName = docName || (targetApt ? targetApt.doctorName : null);

            db.appointments = (db.appointments || []).filter(a => a.id !== aptId);

            if (db.slots) {
                const targetSlot = db.slots.find(s => 
                    (effectiveSlotId && s.id == effectiveSlotId) || 
                    (effectiveDocName && s.doctorName === effectiveDocName)
                );
                if (targetSlot) {
                    const activeRemaining = db.appointments.filter(a => 
                        (a.slotId && a.slotId == targetSlot.id) || 
                        (a.doctorName && a.doctorName === targetSlot.doctorName)
                    ).length;
                    targetSlot.bookedCount = Math.max(0, activeRemaining);
                }
            }
            writeJsonDatabase(db);

            console.log(`❌ [DB CANCEL] Appointment ${aptId} cancelled & deleted from database`);

            // 3. Broadcast Real-Time SSE
            broadcastEvent('APPOINTMENT_CANCELLED', { id: aptId, slotId: effectiveSlotId, doctorName: effectiveDocName });

            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Appointment cancelled & slot freed up' }));
            return;
        }

        // ======================================
        // SLOTS API (Doctor Availability)
        // ======================================
        if (pathname === '/api/slots') {
            if (req.method === 'GET') {
                let slots = [];
                if (sqlite) {
                    try {
                        slots = sqlite.prepare('SELECT * FROM slots ORDER BY date ASC').all();
                        // Format keys for frontend compatibility
                        slots = slots.map(s => ({
                            id: s.id,
                            doctorId: s.doctor_id,
                            doctorName: s.doctor_name,
                            department: s.department,
                            date: s.date,
                            startTime: s.start_time,
                            endTime: s.end_time,
                            maxLimit: s.max_limit,
                            bookedCount: s.booked_count,
                            note: s.note
                        }));
                    } catch (e) {
                        slots = readJsonDatabase().slots || [];
                    }
                } else {
                    slots = readJsonDatabase().slots || [];
                }
                res.writeHead(200);
                res.end(JSON.stringify(slots));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const slotId = body.id || Date.now();
                body.id = slotId;

                if (sqlite) {
                    try {
                        const stmt = sqlite.prepare(`
                            INSERT OR REPLACE INTO slots 
                            (id, doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        stmt.run(
                            body.id,
                            body.doctorId || 1,
                            body.doctorName || 'Dr. Rajesh Sharma',
                            body.department || 'General Medicine (OPD)',
                            body.date || '',
                            body.startTime || '10:00 AM',
                            body.endTime || '01:00 PM',
                            body.maxLimit || 10,
                            body.bookedCount || 0,
                            body.note || ''
                        );
                    } catch (e) {
                        console.error('SQLite slot insert error:', e.message);
                    }
                }

                const db = readJsonDatabase();
                db.slots = db.slots || [];
                db.slots.unshift(body);
                writeJsonDatabase(db);

                broadcastEvent('SLOT_ADDED', { slot: body });

                res.writeHead(201);
                res.end(JSON.stringify({ success: true, slot: body }));
                return;
            }
        }

        // ======================================
        // NOTICES API
        // ======================================
        if (pathname === '/api/notices') {
            if (req.method === 'GET') {
                let notices = [];
                if (sqlite) {
                    try {
                        notices = sqlite.prepare('SELECT * FROM notices ORDER BY id DESC').all();
                        notices = notices.map(n => ({
                            id: n.id,
                            title: n.title,
                            content: n.content,
                            doctorName: n.doctor_name,
                            department: n.department,
                            date: n.date,
                            type: n.type
                        }));
                    } catch (e) {
                        notices = readJsonDatabase().notices || [];
                    }
                } else {
                    notices = readJsonDatabase().notices || [];
                }
                res.writeHead(200);
                res.end(JSON.stringify(notices));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                body.id = body.id || Date.now();

                if (sqlite) {
                    try {
                        sqlite.prepare(`
                            INSERT OR REPLACE INTO notices (id, title, content, doctor_name, department, date, type)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `).run(body.id, body.title, body.content, body.doctorName, body.department, body.date, body.type || 'announcement');
                    } catch (e) {}
                }

                const db = readJsonDatabase();
                db.notices = db.notices || [];
                db.notices.unshift(body);
                writeJsonDatabase(db);

                broadcastEvent('NOTICE_ADDED', { notice: body });

                res.writeHead(201);
                res.end(JSON.stringify({ success: true, notice: body }));
                return;
            }
        }

        // ======================================
        // PRESCRIPTIONS API
        // ======================================
        if (pathname === '/api/prescriptions') {
            if (req.method === 'GET') {
                let rxList = [];
                if (sqlite) {
                    try {
                        rxList = sqlite.prepare('SELECT * FROM prescriptions ORDER BY date DESC').all();
                        rxList = rxList.map(r => ({
                            id: r.id,
                            patientName: r.patient_name,
                            rollNo: r.roll_no,
                            doctorName: r.doctor_name,
                            department: r.department,
                            diagnosis: r.diagnosis,
                            medicines: r.medicines ? JSON.parse(r.medicines) : [],
                            advice: r.advice,
                            date: r.date
                        }));
                    } catch (e) {
                        rxList = readJsonDatabase().prescriptions || [];
                    }
                } else {
                    rxList = readJsonDatabase().prescriptions || [];
                }
                res.writeHead(200);
                res.end(JSON.stringify(rxList));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                body.id = body.id || 'RX-' + Date.now().toString().slice(-4);

                if (sqlite) {
                    try {
                        sqlite.prepare(`
                            INSERT OR REPLACE INTO prescriptions 
                            (id, patient_name, roll_no, doctor_name, department, diagnosis, medicines, advice, date)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            body.id,
                            body.patientName || '',
                            body.rollNo || '',
                            body.doctorName || '',
                            body.department || '',
                            body.diagnosis || '',
                            JSON.stringify(body.medicines || []),
                            body.advice || '',
                            body.date || new Date().toISOString()
                        );
                    } catch (e) {}
                }

                const db = readJsonDatabase();
                db.prescriptions = db.prescriptions || [];
                db.prescriptions.unshift(body);
                writeJsonDatabase(db);

                broadcastEvent('PRESCRIPTION_ADDED', { prescription: body });

                res.writeHead(201);
                res.end(JSON.stringify({ success: true, prescription: body }));
                return;
            }
        }

        // ======================================
        // MEDICINES (DISPENSARY STOCK) API
        // ======================================
        if (pathname === '/api/medicines') {
            if (req.method === 'GET') {
                let meds = [];
                if (sqlite) {
                    try {
                        meds = sqlite.prepare('SELECT * FROM medicines ORDER BY name ASC').all();
                    } catch (e) {
                        meds = readJsonDatabase().medicines || [];
                    }
                } else {
                    meds = readJsonDatabase().medicines || [];
                }
                res.writeHead(200);
                res.end(JSON.stringify(meds));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const id = parseInt(body.id);
                const stock = parseInt(body.stock);

                if (sqlite) {
                    try {
                        sqlite.prepare('UPDATE medicines SET stock = ? WHERE id = ?').run(stock, id);
                    } catch (e) {}
                }

                const db = readJsonDatabase();
                const item = (db.medicines || []).find(m => m.id === id);
                if (item) item.stock = stock;
                writeJsonDatabase(db);

                broadcastEvent('MEDICINE_STOCK_UPDATED', { id, stock });

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, id, stock }));
                return;
            }
        }

        // ======================================
        // EMERGENCY SOS API
        // ======================================
        if (pathname === '/api/emergency') {
            if (req.method === 'POST') {
                const body = await parseBody(req);
                if (sqlite) {
                    try {
                        sqlite.prepare(`
                            INSERT INTO emergencies (student_name, roll_no, phone, location, details, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(
                            body.studentName || 'Student',
                            body.rollNo || '',
                            body.phone || '',
                            body.location || 'DTU Campus',
                            body.details || '',
                            new Date().toISOString()
                        );
                    } catch (e) {}
                }

                const db = readJsonDatabase();
                db.emergencies = db.emergencies || [];
                db.emergencies.unshift(body);
                writeJsonDatabase(db);

                console.log(`🚨 [SOS DISPATCH] Emergency alert from ${body.location} (${body.studentName})`);
                broadcastEvent('EMERGENCY_SOS', body);

                res.writeHead(201);
                res.end(JSON.stringify({ success: true, message: 'Ambulance dispatched' }));
                return;
            }
        }

        // ======================================
        // 🔍 DATABASE INSPECTOR API (For Viva / Admin Viewer)
        // ======================================
        if (pathname === '/api/database/stats' && req.method === 'GET') {
            const stats = {
                engine: 'SQLite 3 (Relational) + JSON Dual-Engine',
                sqliteActive: sqlite !== null,
                sqlitePath: SQLITE_FILE,
                jsonPath: JSON_FILE,
                connectedClients: sseClients.length,
                tables: {}
            };

            if (sqlite) {
                try {
                    ['students', 'doctors', 'slots', 'appointments', 'prescriptions', 'notices', 'medicines', 'emergencies'].forEach(tbl => {
                        const row = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tbl}`).get();
                        stats.tables[tbl] = row ? row.count : 0;
                    });
                } catch (e) {
                    stats.tablesError = e.message;
                }
            } else {
                const db = readJsonDatabase();
                Object.keys(db).forEach(k => {
                    stats.tables[k] = Array.isArray(db[k]) ? db[k].length : 0;
                });
            }

            res.writeHead(200);
            res.end(JSON.stringify(stats));
            return;
        }

        if (pathname === '/api/database/table' && req.method === 'GET') {
            const tableName = parsedUrl.searchParams.get('name') || 'appointments';
            const allowed = ['students', 'doctors', 'slots', 'appointments', 'prescriptions', 'referrals', 'notices', 'medicines', 'emergencies'];
            
            if (!allowed.includes(tableName)) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid table name' }));
                return;
            }

            let rows = [];
            if (sqlite) {
                try {
                    rows = sqlite.prepare(`SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT 100`).all();
                } catch (e) {
                    rows = (readJsonDatabase()[tableName] || []);
                }
            } else {
                rows = (readJsonDatabase()[tableName] || []);
            }

            res.writeHead(200);
            res.end(JSON.stringify({ table: tableName, count: rows.length, rows }));
            return;
        }

        // RESET DATABASE TO CLEAN SEEDS
        if (pathname === '/api/reset' && req.method === 'POST') {
            if (sqlite) {
                try {
                    sqlite.prepare('DELETE FROM appointments').run();
                    sqlite.prepare('UPDATE slots SET booked_count = 0').run();
                    sqlite.prepare('DELETE FROM prescriptions').run();
                    sqlite.prepare('DELETE FROM referrals').run();
                    sqlite.prepare('DELETE FROM emergencies').run();
                } catch (e) {}
            }

            const db = readJsonDatabase();
            db.appointments = [];
            db.prescriptions = [];
            db.referrals = [];
            db.emergencies = [];
            if (db.slots) db.slots.forEach(s => s.bookedCount = 0);
            writeJsonDatabase(db);

            broadcastEvent('DATABASE_RESET', {});
            console.log('🧹 [DB RESET] Database reset to initial clean state');

            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Database reset to clean state' }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'API Endpoint Not Found' }));
        return;
    }

    // ==========================================
    // 🌐 STATIC FILE SERVER (HTML, CSS, JS)
    // ==========================================
    let reqFile = pathname;
    if (reqFile === '/' || reqFile === '') {
        reqFile = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, reqFile);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h2>404 - Page Not Found</h2><p><a href="/">Return to DTU Health Center</a></p>');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(`🏥 DTU HEALTH CENTER - FULL-STACK PROPER DATABASE ONLINE`);
    console.log(`🗄️ Relational Database: SQLite 3 Engine (data/dtu_health.db)`);
    console.log(`📁 File Backup: data/database.json`);
    console.log(`⚡ Real-Time Bus: Server-Sent Events (SSE) stream on /api/events`);
    console.log(`🌐 Local Web URL: http://localhost:${PORT}`);
    console.log(`🔍 Database Viewer: http://localhost:${PORT}/database-viewer.html`);
    console.log(`================================================================`);
});
