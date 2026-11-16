// DTU Health Center - Full-Stack Database & Web Server
// Built with 100% Native Node.js (Zero external npm packages needed)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const PUBLIC_DIR = __dirname;

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

// Database Read Helper
function readDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return { students: [], doctors: [], appointments: [], slots: [], prescriptions: [], referrals: [], notices: [], medicines: [], emergencies: [] };
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('⚠️ Database read error:', e.message);
        return { students: [], doctors: [], appointments: [], slots: [], prescriptions: [], referrals: [], notices: [], medicines: [], emergencies: [] };
    }
}

// Database Write Helper (Persists directly to disk)
function writeDatabase(db) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('❌ Database write error:', e.message);
        return false;
    }
}

// Parse JSON Body Helper
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

// HTTP Server
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
    // 🗄️ REST API DATABASE ENDPOINTS
    // ==========================================

    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        // GET /api/status
        if (pathname === '/api/status' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'online', database: 'data/database.json', message: 'DTU Health Center DB Connected' }));
            return;
        }

        // APPOINTMENTS API
        if (pathname === '/api/appointments') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.appointments || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.appointments = db.appointments || [];
                db.appointments.unshift(body);

                // Increment slot count
                if (body.slotId) {
                    const slot = (db.slots || []).find(s => s.id == body.slotId);
                    if (slot) {
                        slot.bookedCount = (slot.bookedCount || 0) + 1;
                    }
                }

                writeDatabase(db);
                console.log(`📝 [DB INSERT] Appointment Booked: ${body.studentName} (${body.rollNo}) -> ${body.doctorName}`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, appointment: body }));
                return;
            }
        }

        // SLOTS API (Doctor Availability)
        if (pathname === '/api/slots') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.slots || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.slots = db.slots || [];
                db.slots.unshift(body);
                writeDatabase(db);
                console.log(`📅 [DB INSERT] New Doctor Slot Published: ${body.doctorName} (Max: ${body.maxLimit})`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, slot: body }));
                return;
            }
        }

        // NOTICES API (Announcements)
        if (pathname === '/api/notices') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.notices || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.notices = db.notices || [];
                db.notices.unshift(body);
                writeDatabase(db);
                console.log(`📢 [DB INSERT] Campus Health Notice: "${body.title}" by ${body.doctorName}`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, notice: body }));
                return;
            }
        }

        // PRESCRIPTIONS API
        if (pathname === '/api/prescriptions') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.prescriptions || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.prescriptions = db.prescriptions || [];
                db.prescriptions.unshift(body);
                writeDatabase(db);
                console.log(`💊 [DB INSERT] Digital Rx Issued: ${body.id} for ${body.studentName} (${body.diagnosis})`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, prescription: body }));
                return;
            }
        }

        // REFERRALS API
        if (pathname === '/api/referrals') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.referrals || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.referrals = db.referrals || [];
                db.referrals.unshift(body);
                writeDatabase(db);
                console.log(`🔄 [DB INSERT] Specialist Referral: ${body.studentName} referred to ${body.toDoctor}`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, referral: body }));
                return;
            }
        }

        // MEDICINES INVENTORY API
        if (pathname === '/api/medicines') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.medicines || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.medicines = db.medicines || [];

                // Check if updating existing
                if (body.id && body.stock !== undefined) {
                    const target = db.medicines.find(m => m.id == body.id);
                    if (target) {
                        target.stock = body.stock;
                    }
                } else {
                    db.medicines.push(body);
                }
                writeDatabase(db);
                console.log(`📦 [DB UPDATE] Dispensary Medicine Stock updated`);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, medicines: db.medicines }));
                return;
            }
        }

        // EMERGENCY SOS API
        if (pathname === '/api/emergency') {
            const db = readDatabase();
            if (req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.emergencies || []));
                return;
            }
            if (req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDatabase();
                db.emergencies = db.emergencies || [];
                db.emergencies.unshift(body);
                writeDatabase(db);
                console.log(`🚨 [DB ALERT - SOS] AMBULANCE REQUESTED FROM ${body.location} (${body.emergencyType})`);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, alert: body }));
                return;
            }
        }

        // RESET DATABASE API
        if (pathname === '/api/reset' && req.method === 'POST') {
            const db = readDatabase();
            db.appointments = [];
            db.prescriptions = [];
            db.referrals = [];
            db.emergencies = [];
            if (db.slots) {
                db.slots.forEach(s => s.bookedCount = 0);
            }
            writeDatabase(db);
            console.log(`🧹 [DB RESET] Test appointments & queues cleared to clean state`);
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

    // Prevent directory traversal
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
    console.log(`🏥 DTU HEALTH CENTER - BACKEND & DATABASE ONLINE`);
    console.log(`📁 Database File: data/database.json (Disk Persistent)`);
    console.log(`🌐 Local Web URL: http://localhost:${PORT}`);
    console.log(`⚡ REST API Base: http://localhost:${PORT}/api/`);
    console.log(`================================================================`);
});
