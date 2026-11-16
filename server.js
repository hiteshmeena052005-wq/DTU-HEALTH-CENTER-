// ============================================================================
// 🏥 DTU HEALTH CENTER - BACKEND SERVER LINKED TO HOSPITAL DBMS
// Powered by Node.js Native SQLite 3 Database (database/hospital.db)
// 100% Native - Zero external npm packages required
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const hospitalDB = require('./database/hospital_db');

const PORT = process.env.PORT || 5000;
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

        res.write(`event: connected\ndata: {"status":"connected","engine":"Hospital DBMS (SQLite 3)"}\n\n`);
        sseClients.push(res);
        console.log(`🔌 [SSE CONNECT] Client connected to live stream (Active clients: ${sseClients.length})`);

        req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
        });
        return;
    }

    // ==========================================
    // 🗄️ REST API HOSPITAL DATABASE ENDPOINTS
    // ==========================================
    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        // GET /api/status
        if (pathname === '/api/status' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'online',
                database: 'Hospital Relational DBMS (database/hospital.db)',
                engine: 'SQLite 3 Relational Engine',
                realTime: 'Server-Sent Events (SSE) Bus',
                connectedClients: sseClients.length,
                message: 'DTU Health Center Hospital DBMS Online'
            }));
            return;
        }

        // 1. APPOINTMENTS API
        if (pathname === '/api/appointments') {
            if (req.method === 'GET') {
                const list = hospitalDB.getAppointments();
                res.writeHead(200);
                res.end(JSON.stringify(list));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const result = hospitalDB.bookAppointment(body);
                if (result.success) {
                    broadcastEvent('APPOINTMENT_BOOKED', { appointment: body, id: result.id });
                    res.writeHead(201);
                    res.end(JSON.stringify({ success: true, appointment: body }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, error: result.error }));
                }
                return;
            }
        }

        // 2. CANCEL APPOINTMENT API
        if (pathname === '/api/appointments/cancel' && req.method === 'POST') {
            const body = await parseBody(req);
            const result = hospitalDB.cancelAppointment(body.id, body.slotId, body.doctorName);
            broadcastEvent('APPOINTMENT_CANCELLED', { id: body.id, slotId: body.slotId, doctorName: body.doctorName });
            res.writeHead(200);
            res.end(JSON.stringify(result));
            return;
        }

        // 3. SLOTS API
        if (pathname === '/api/slots') {
            if (req.method === 'GET') {
                const slots = hospitalDB.getSlots();
                res.writeHead(200);
                res.end(JSON.stringify(slots));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const result = hospitalDB.createSlot(body);
                broadcastEvent('SLOT_ADDED', { slot: body });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, slot: body }));
                return;
            }
        }

        // 4. PRESCRIPTIONS & CLINICAL NOTES API
        if (pathname === '/api/prescriptions') {
            if (req.method === 'GET') {
                const list = hospitalDB.getPrescriptions();
                res.writeHead(200);
                res.end(JSON.stringify(list));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const result = hospitalDB.issuePrescription(body);
                broadcastEvent('PRESCRIPTION_ADDED', { prescription: body, id: result.id });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, prescription: body }));
                return;
            }
        }

        // 5. REFERRALS API
        if (pathname === '/api/referrals') {
            if (req.method === 'GET') {
                const list = hospitalDB.getReferrals();
                res.writeHead(200);
                res.end(JSON.stringify(list));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const result = hospitalDB.createReferral(body);
                broadcastEvent('REFERRAL_ADDED', { referral: body, id: result.id });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, referral: body }));
                return;
            }
        }

        // 6. MEDICINES (DISPENSARY INVENTORY) API
        if (pathname === '/api/medicines') {
            if (req.method === 'GET') {
                const meds = hospitalDB.getMedicines();
                res.writeHead(200);
                res.end(JSON.stringify(meds));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                hospitalDB.updateMedicineStock(body.id, body.stock);
                broadcastEvent('MEDICINE_STOCK_UPDATED', { id: body.id, stock: body.stock });
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
                return;
            }
        }

        // 7. NOTICES API
        if (pathname === '/api/notices') {
            if (req.method === 'GET') {
                const notices = hospitalDB.getNotices();
                res.writeHead(200);
                res.end(JSON.stringify(notices));
                return;
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                hospitalDB.createNotice(body);
                broadcastEvent('NOTICE_ADDED', { notice: body });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true }));
                return;
            }
        }

        // 8. EMERGENCY SOS API
        if (pathname === '/api/emergency' && req.method === 'POST') {
            const body = await parseBody(req);
            hospitalDB.logEmergencySOS(body);
            broadcastEvent('EMERGENCY_SOS', body);
            res.writeHead(201);
            res.end(JSON.stringify({ success: true, message: 'Ambulance dispatched' }));
            return;
        }

        // 9. RESET DATABASE
        if (pathname === '/api/reset' && req.method === 'POST') {
            hospitalDB.resetDatabase();
            broadcastEvent('DATABASE_RESET', {});
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Database reset to clean seeds' }));
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
    console.log(`🏥 DTU HEALTH CENTER - HOSPITAL DBMS ONLINE`);
    console.log(`🗄️ Relational Database: database/hospital.db (SQLite 3 Schema)`);
    console.log(`📜 Schema DDL: database/schema.sql`);
    console.log(`🌱 Seed Data: database/seed.sql`);
    console.log(`⚡ Real-Time Bus: Server-Sent Events (SSE) /api/events`);
    console.log(`🌐 Local Web URL: http://localhost:${PORT}`);
    console.log(`================================================================`);
});
