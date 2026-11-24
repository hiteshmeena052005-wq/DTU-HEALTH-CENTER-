// =============================================================================
// DTU Health Center - Supabase Database & Authentication Service
// =============================================================================
// Seamlessly connects the DTU Health Center frontend dashboards to Supabase
// tables, enforcing fine-grained RLS, real-time WebSocket subscriptions,
// and safe client-side error handling with graceful offline memory fallbacks.
// =============================================================================

const SupabaseService = (function () {

    function getClient() {
        if (window.DTU_SUPABASE && typeof window.DTU_SUPABASE.getClient === 'function') {
            return window.DTU_SUPABASE.getClient();
        }
        return null;
    }

    function isLive() {
        return Boolean(window.DTU_SUPABASE && window.DTU_SUPABASE.isConfigured() && getClient());
    }

    function isUUIDString(val) {
        return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val)));
    }

    function to24HourTime(timeStr) {
        if (!timeStr) return '09:00:00';
        const str = String(timeStr).trim();
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) {
            return str.length === 5 ? str + ':00' : str;
        }
        const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (!match) return '09:00:00';
        let h = parseInt(match[1]);
        const m = match[2];
        const ampm = (match[3] || '').toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}:00`;
    }

    function to12HourTime(timeStr) {
        if (!timeStr) return '';
        const str = String(timeStr).trim();
        if (/AM|PM/i.test(str)) return str;
        const parts = str.split(':');
        if (parts.length < 2) return str;
        let h = parseInt(parts[0]);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }

    function resolveDoctorUUID(idOrName) {
        if (isUUIDString(idOrName)) return String(idOrName);
        if (typeof getDoctorUUID === 'function') return getDoctorUUID(idOrName);
        return "d0000000-0000-0000-0000-000000000001";
    }

    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & SESSION MANAGEMENT
    // -------------------------------------------------------------------------

    async function signUpStudent({ email, password, fullName, phone, rollNo, branch, year, bloodGroup, dob }) {
        const client = getClient();
        if (!client) {
            throw new Error("Supabase is not configured. Please configure your Supabase URL & Anon Key.");
        }

        const { data, error } = await client.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    name: fullName.trim(),
                    phone: phone ? phone.trim() : '',
                    roll_no: rollNo ? rollNo.trim().toUpperCase() : '',
                    branch: branch || 'Computer Science & Engineering',
                    year: year || '1st Year',
                    blood_group: bloodGroup || 'B+',
                    dob: dob || null
                }
            }
        });

        if (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('rate limit')) {
                throw new Error('Supabase Free Email Rate Limit Exceeded (3 emails/hr max).\n\nQuick Fix in Supabase Dashboard:\nGo to Authentication -> Providers -> Email -> Turn OFF "Confirm email".\nThis removes email rate limits and allows instant registration!');
            }
            if (msg.includes('invalid') || msg.includes('address')) {
                throw new Error(`Email "${email}" was flagged by Supabase mail verification.\n\nQuick Fix in Supabase Dashboard:\nGo to Authentication -> Providers -> Email -> Turn OFF "Confirm email".\nThis allows all email addresses (including @dtu.ac.in) to register immediately!`);
            }
            throw error;
        }

        return data;
    }

    async function signInUser({ email, password, expectedRole }) {
        const client = getClient();
        if (!client) {
            throw new Error("Supabase is not configured. Please configure your Supabase URL & Anon Key.");
        }

        const { data, error } = await client.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });

        if (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('not confirmed') || msg.includes('unconfirmed')) {
                throw new Error('Email is unconfirmed in Supabase.\n\nQuick Fix in Supabase Dashboard:\n1. Go to Authentication -> Users -> Click "..." next to your email -> Click "Confirm user".\n2. Then go to Authentication -> Providers -> Email -> Turn OFF "Confirm email" so all future students can sign in instantly without verification!');
            }
            if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
                throw new Error('Invalid email or password. Please check your spelling or register a new student account.');
            }
            throw error;
        }

        const authUser = data.user;
        if (!authUser) throw new Error("Authentication failed: No user returned.");

        // Fetch user profile from public.profiles
        const { data: profile, error: profileErr } = await client
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (profileErr) {
            console.warn("Could not load user profile row:", profileErr.message);
        }

        const userRole = (profile && profile.role) || (authUser.user_metadata && authUser.user_metadata.role) || 'student';

        // Enforce role check if signing in on a specific portal tab
        if (expectedRole && userRole !== expectedRole) {
            await client.auth.signOut();
            throw new Error(`Role mismatch: This account has role "${userRole}". Please log in through the ${userRole === 'doctor' ? 'Doctor' : 'Student'} tab.`);
        }

        let detailedData = {};
        if (userRole === 'student') {
            const { data: studentRow } = await client
                .from('students')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (studentRow) {
                detailedData = {
                    rollNo: studentRow.roll_no,
                    branch: studentRow.branch,
                    year: studentRow.year_of_study,
                    bloodGroup: studentRow.blood_group,
                    dob: studentRow.date_of_birth,
                    phone: studentRow.phone,
                    dtuEmail: studentRow.dtu_email
                };
                localStorage.setItem('studentProfile', JSON.stringify({
                    name: (profile && profile.full_name) || authUser.email.split('@')[0],
                    email: authUser.email,
                    ...detailedData
                }));
            }
        } else if (userRole === 'doctor') {
            const { data: doctorRow } = await client
                .from('doctors')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (doctorRow) {
                detailedData = {
                    department: doctorRow.department_name,
                    qualification: doctorRow.qualification,
                    experience: doctorRow.experience,
                    photo: doctorRow.photo || '👨‍⚕️',
                    phone: doctorRow.phone
                };
            }
        }

        const sessionUser = {
            id: authUser.id,
            role: userRole,
            email: authUser.email,
            name: (profile && profile.full_name) || authUser.user_metadata.full_name || authUser.email.split('@')[0],
            ...detailedData
        };

        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        localStorage.setItem('userRole', userRole);

        return sessionUser;
    }

    async function signOutUser() {
        const client = getClient();
        if (client) {
            try {
                await client.auth.signOut();
            } catch (e) {
                console.warn("Supabase signout warning:", e.message);
            }
        }
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        localStorage.removeItem('studentProfile');
        localStorage.removeItem('dtu_supabase_auth_token');
        window.location.href = 'login.html';
    }

    async function getActiveSession() {
        const client = getClient();
        if (!client) return null;
        try {
            const { data: { session } } = await client.auth.getSession();
            return session;
        } catch (e) {
            return null;
        }
    }

    async function resetPasswordForEmail(email) {
        const client = getClient();
        if (!client || !isLive()) {
            return { success: true, simulated: true };
        }
        const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
        const pathname = (typeof window !== 'undefined' && window.location) ? window.location.pathname.replace(/\/+$/, '') : '';
        const redirectTo = origin + pathname + '?mode=reset-password';

        const { data, error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: redirectTo
        });

        if (error) throw error;
        return { success: true, data };
    }

    async function updateUserPassword(newPassword) {
        const client = getClient();
        if (!client || !isLive()) {
            return { success: true, simulated: true };
        }
        const { data, error } = await client.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return { success: true, data };
    }

    // -------------------------------------------------------------------------
    // 2. DEPARTMENTS & DOCTORS
    // -------------------------------------------------------------------------

    async function getDepartments() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('departments')
                .select('*')
                .order('id', { ascending: true });
            if (!error && data && data.length > 0) return data;
        }
        return (typeof departments !== 'undefined' ? departments : []);
    }

    async function getDoctors() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('doctors')
                .select('*, profiles:id(full_name, phone, avatar_url, email)')
                .order('created_at', { ascending: true });
            if (!error && data && data.length > 0) {
                return data.map(d => ({
                    id: d.id,
                    name: (d.profiles && d.profiles.full_name) || 'DTU Doctor',
                    email: (d.profiles && d.profiles.email) || '',
                    department: d.department_name,
                    qualification: d.qualification,
                    experience: d.experience,
                    photo: d.photo || '👨‍⚕️',
                    phone: d.phone,
                    available: d.is_available
                }));
            }
        }
        return (typeof doctors !== 'undefined' ? doctors : []);
    }

    // -------------------------------------------------------------------------
    // 3. DOCTOR AVAILABILITY SLOTS
    // -------------------------------------------------------------------------

    async function getSlots(doctorId, doctorName) {
        const client = getClient();
        if (client && isLive()) {
            let query = client
                .from('doctor_slots')
                .select('*')
                .eq('is_active', true)
                .order('date', { ascending: true });

            const isUUID = doctorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(doctorId));
            if (isUUID) {
                query = query.eq('doctor_id', doctorId);
            } else if (doctorName) {
                query = query.eq('doctor_name', doctorName);
            }

            const { data, error } = await query;
            if (!error && data) {
                return data.map(s => ({
                    id: s.id,
                    doctorId: s.doctor_id,
                    doctorName: s.doctor_name,
                    department: s.department,
                    date: s.date,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    maxLimit: s.max_limit,
                    bookedCount: s.booked_count,
                    note: s.note,
                    isActive: s.is_active
                }));
            }
        }
        return (typeof getSlots === 'function' ? getSlots(doctorName || doctorId) : []);
    }

    async function createSlot(slotData) {
        const client = getClient();
        if (client && isLive()) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const doctorUuid = resolveDoctorUUID(currentUser.id || slotData.doctorId || slotData.doctorName);
            const { data, error } = await client
                .from('doctor_slots')
                .insert({
                    doctor_id: doctorUuid,
                    doctor_name: slotData.doctorName,
                    department: slotData.department,
                    date: slotData.date,
                    start_time: to24HourTime(slotData.startTimeRaw || slotData.startTime),
                    end_time: to24HourTime(slotData.endTimeRaw || slotData.endTime),
                    max_limit: slotData.maxLimit || 10,
                    note: slotData.note || '',
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        // Memory fallback
        if (typeof saveSlot === 'function') {
            await saveSlot(slotData);
        }
        return slotData;
    }

    // -------------------------------------------------------------------------
    // 4. APPOINTMENTS
    // -------------------------------------------------------------------------

    async function getAppointments() {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            let query = client.from('appointments').select('*');

            if (currentUser && currentUser.role === 'student') {
                if (isUUIDString(currentUser.id)) {
                    query = query.eq('student_id', currentUser.id);
                } else if (currentUser.email) {
                    query = query.eq('student_email', currentUser.email);
                }
            } else if (currentUser && currentUser.role === 'doctor') {
                const docUuid = resolveDoctorUUID(currentUser.id || currentUser.uuid || currentUser.name);
                const docName = (currentUser.name || '').replace(/^Dr\.?\s*/i, '').trim();
                if (docName) {
                    query = query.or(`doctor_id.eq.${docUuid},doctor_name.ilike.%${encodeURIComponent(docName)}%`);
                } else {
                    query = query.eq('doctor_id', docUuid);
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (!error && data) {
                const mapped = data.map(a => ({
                    id: a.id,
                    slotId: a.slot_id,
                    studentId: a.student_id,
                    doctorId: a.doctor_id,
                    studentName: a.student_name,
                    studentEmail: a.student_email,
                    rollNo: a.roll_no,
                    branch: a.branch,
                    doctorName: a.doctor_name,
                    department: a.department,
                    date: a.date,
                    time: a.time_window,
                    mode: a.mode,
                    reason: a.reason,
                    urgency: a.urgency,
                    status: a.status,
                    createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
                }));
                if (window._dtuMemoryDB) {
                    window._dtuMemoryDB.appointments = mapped;
                }
                return mapped;
            }
        }
        return (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];
    }

    async function bookAppointment(aptData) {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            let studentUuid = null;
            try {
                const { data: authData } = await client.auth.getUser();
                if (authData && authData.user) {
                    studentUuid = authData.user.id;
                }
            } catch (e) {}

            if (!studentUuid && currentUser && isUUIDString(currentUser.id)) {
                studentUuid = currentUser.id;
            }
            if (!studentUuid) {
                studentUuid = "a0000000-0000-0000-0000-000000000001";
            }

            const slotIdInt = (aptData.slotId && !isNaN(parseInt(aptData.slotId))) ? parseInt(aptData.slotId) : null;
            let doctorUuid = null;
            let currentBooked = 0;
            let maxLimit = 10;

            // Verify live slot capacity directly from database before booking
            if (slotIdInt) {
                try {
                    const { data: slotRow, error: slotErr } = await client
                        .from('doctor_slots')
                        .select('doctor_id, doctor_name, department, booked_count, max_limit, is_active')
                        .eq('id', slotIdInt)
                        .single();

                    if (slotRow) {
                        currentBooked = slotRow.booked_count || 0;
                        maxLimit = slotRow.max_limit || 10;
                        if (currentBooked >= maxLimit) {
                            throw new Error(`This slot is fully booked (${currentBooked}/${maxLimit} students). Please pick another doctor or consultation session.`);
                        }
                        if (slotRow.doctor_id) doctorUuid = slotRow.doctor_id;
                    }
                } catch (slotCheckErr) {
                    if (slotCheckErr.message && slotCheckErr.message.includes('fully booked')) {
                        throw slotCheckErr;
                    }
                    console.warn("Slot pre-check notice:", slotCheckErr.message);
                }
            }

            if (!doctorUuid || !isUUIDString(doctorUuid)) {
                doctorUuid = resolveDoctorUUID(aptData.doctorId || aptData.doctorName);
            }

            // Ensure student record exists in public.students table
            try {
                await client.from('students').upsert({
                    id: studentUuid,
                    roll_no: aptData.rollNo || currentUser.rollNo || '2K23/CO/001',
                    branch: aptData.branch || currentUser.branch || 'General Engineering',
                    year_of_study: currentUser.year || '1st Year',
                    phone: currentUser.phone || '+91 9876543210',
                    dtu_email: aptData.studentEmail || currentUser.email || 'student@dtu.ac.in'
                }, { onConflict: 'id', ignoreDuplicates: true });
            } catch (e) {
                console.warn("Auto-upsert student skipped:", e.message);
            }

            const generatedId = aptData.id || ('APT-' + Date.now().toString().slice(-4));
            const appointmentPayload = {
                id: generatedId,
                slot_id: slotIdInt,
                student_id: studentUuid,
                doctor_id: doctorUuid,
                student_name: aptData.studentName || currentUser.name || 'DTU Student',
                student_email: aptData.studentEmail || currentUser.email || 'student@dtu.ac.in',
                roll_no: aptData.rollNo || currentUser.rollNo || '2K23/CO/001',
                branch: aptData.branch || currentUser.branch || 'General Engineering',
                doctor_name: aptData.doctorName,
                department: aptData.department,
                date: aptData.date,
                time_window: aptData.time,
                mode: aptData.mode || 'Physical OPD Visit (Health Center)',
                reason: aptData.reason,
                urgency: aptData.urgency || 'Normal / Routine',
                status: 'confirmed'
            };

            const { data: insertedData, error: insertError } = await client
                .from('appointments')
                .insert(appointmentPayload)
                .select()
                .single();

            if (insertError) {
                console.error("Supabase booking insert error:", insertError);
                throw insertError;
            }

            // Increment booked_count on slot if not handled by DB trigger
            if (slotIdInt) {
                try {
                    const newCount = Math.min(maxLimit, currentBooked + 1);
                    await client.from('doctor_slots').update({ booked_count: newCount }).eq('id', slotIdInt);
                } catch (slotUpdateErr) {
                    console.warn("Slot booked_count update warning:", slotUpdateErr.message);
                }
            }

            // Format confirmed appointment
            const confirmedApt = {
                id: (insertedData && insertedData.id) || generatedId,
                slotId: slotIdInt,
                studentId: studentUuid,
                doctorId: doctorUuid,
                studentName: appointmentPayload.student_name,
                studentEmail: appointmentPayload.student_email,
                rollNo: appointmentPayload.roll_no,
                branch: appointmentPayload.branch,
                doctorName: appointmentPayload.doctor_name,
                department: appointmentPayload.department,
                date: appointmentPayload.date,
                time: appointmentPayload.time_window,
                mode: appointmentPayload.mode,
                reason: appointmentPayload.reason,
                urgency: appointmentPayload.urgency,
                status: 'confirmed',
                createdAt: new Date().toLocaleDateString()
            };

            // Update in-memory DB & persist
            if (window._dtuMemoryDB) {
                if (!window._dtuMemoryDB.appointments) window._dtuMemoryDB.appointments = [];
                window._dtuMemoryDB.appointments.unshift(confirmedApt);
                if (slotIdInt && window._dtuMemoryDB.slots) {
                    const targetSlot = window._dtuMemoryDB.slots.find(s => s.id == slotIdInt);
                    if (targetSlot) {
                        targetSlot.bookedCount = Math.min(targetSlot.maxLimit || 10, (targetSlot.bookedCount || 0) + 1);
                    }
                }
                if (typeof saveClientStore === 'function') {
                    saveClientStore(window._dtuMemoryDB);
                }
            }

            broadcastDataChange('APPOINTMENT_BOOKED', { appointment: confirmedApt, slotId: slotIdInt });
            return confirmedApt;
        }

        // Memory fallback
        if (typeof saveAppointment === 'function') {
            await saveAppointment(aptData);
        }
        return aptData;
    }

    async function cancelAppointment(appointmentId) {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId)
                .select();

            if (error) throw error;
            return data;
        }

        // Memory fallback
        if (typeof cancelAppointmentAndFreeSlot === 'function') {
            await cancelAppointmentAndFreeSlot(appointmentId);
        }
        return true;
    }

    async function completeAppointment(appointmentId) {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', appointmentId)
                .select();

            if (error) throw error;
            return data;
        }

        // Memory fallback
        let list = (window._dtuMemoryDB && window._dtuMemoryDB.appointments) || [];
        const apt = list.find(a => a.id === appointmentId);
        if (apt) apt.status = 'completed';
        return true;
    }

    // -------------------------------------------------------------------------
    // 5. CONSULTATIONS & PRESCRIPTIONS
    // -------------------------------------------------------------------------

    async function getPrescriptions() {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive() && currentUser) {
            let query = client.from('consultations').select('*');

            if (currentUser.role === 'student') {
                if (currentUser.id) {
                    query = query.eq('student_id', currentUser.id);
                } else if (currentUser.email) {
                    query = query.eq('student_email', currentUser.email);
                }
            } else if (currentUser.role === 'doctor') {
                if (currentUser.id) {
                    query = query.eq('doctor_id', currentUser.id);
                } else if (currentUser.name) {
                    query = query.eq('doctor_name', currentUser.name);
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (!error && data) {
                return data.map(c => {
                    let parsedMeds = [];
                    if (Array.isArray(c.medicines)) {
                        parsedMeds = c.medicines;
                    } else if (typeof c.medicines === 'string') {
                        try { parsedMeds = JSON.parse(c.medicines); } catch (e) { parsedMeds = [{ name: c.medicines, dosage: 'As directed', duration: 'As directed' }]; }
                    }

                    return {
                        id: c.id,
                        appointmentId: c.appointment_id,
                        studentId: c.student_id,
                        doctorId: c.doctor_id,
                        studentName: c.student_name,
                        studentEmail: c.student_email,
                        doctorName: c.doctor_name,
                        department: c.department,
                        diagnosis: c.diagnosis,
                        medicines: parsedMeds,
                        tests: c.tests || '',
                        followUp: c.follow_up_date || '',
                        notes: c.notes || '',
                        date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                    };
                });
            }
        }
        return (typeof getPrescriptions === 'function' ? getPrescriptions() : []);
    }

    async function createPrescription(rxData) {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            const doctorUuid = resolveDoctorUUID(currentUser.id || rxData.doctorId || rxData.doctorName);
            let studentUuid = rxData.studentId;
            if (!isUUIDString(studentUuid)) {
                studentUuid = "a0000000-0000-0000-0000-000000000001";
            }

            const { data, error } = await client
                .from('consultations')
                .insert({
                    appointment_id: rxData.appointmentId || null,
                    student_id: studentUuid,
                    doctor_id: doctorUuid,
                    student_name: rxData.studentName,
                    student_email: rxData.studentEmail || 'student@dtu.ac.in',
                    doctor_name: currentUser.name || rxData.doctorName || 'Dr. Ravi Bansal',
                    department: currentUser.department || rxData.department || 'General Medicine (OPD)',
                    diagnosis: rxData.diagnosis,
                    medicines: rxData.medicines || [],
                    tests: rxData.tests || '',
                    follow_up_date: rxData.followUp && rxData.followUp !== 'SOS' ? rxData.followUp : null,
                    notes: rxData.notes || ''
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        // Memory fallback
        if (typeof savePrescription === 'function') {
            await savePrescription(rxData);
        }
        return rxData;
    }

    // -------------------------------------------------------------------------
    // 6. REFERRALS
    // -------------------------------------------------------------------------

    async function getReferrals() {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive() && currentUser && currentUser.id) {
            let query = client.from('referrals').select('*');

            if (currentUser.role === 'student') {
                if (isUUIDString(currentUser.id)) {
                    query = query.eq('student_id', currentUser.id);
                }
            } else if (currentUser.role === 'doctor') {
                const docUuid = resolveDoctorUUID(currentUser.id || currentUser.name);
                query = query.or(`from_doctor_id.eq.${docUuid},to_doctor_id.eq.${docUuid}`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (!error && data) {
                return data.map(r => ({
                    id: r.id,
                    studentId: r.student_id,
                    studentName: r.student_name,
                    rollNo: r.roll_no,
                    fromDoctor: r.from_doctor_name,
                    fromDept: r.from_dept,
                    toDoctor: r.to_doctor_name,
                    toDept: r.to_dept,
                    priority: r.priority,
                    reason: r.reason,
                    tests: r.tests,
                    status: r.status,
                    date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                }));
            }
        }
        return (typeof getReferrals === 'function' ? getReferrals() : []);
    }

    async function createReferral(refData) {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            const fromDocUuid = resolveDoctorUUID(currentUser.id || refData.fromDoctorId || refData.fromDoctor);
            const toDocUuid = resolveDoctorUUID(refData.toDoctorId || refData.toDoctor);
            let studentUuid = refData.studentId;
            if (!isUUIDString(studentUuid)) {
                studentUuid = "a0000000-0000-0000-0000-000000000001";
            }

            const { data, error } = await client
                .from('referrals')
                .insert({
                    student_id: studentUuid,
                    student_name: refData.studentName,
                    roll_no: refData.rollNo || '2K22/CO/101',
                    from_doctor_id: fromDocUuid,
                    from_doctor_name: currentUser.name || refData.fromDoctor || 'Dr. Ravi Bansal',
                    from_dept: currentUser.department || refData.fromDept || 'General Medicine (OPD)',
                    to_doctor_id: toDocUuid,
                    to_doctor_name: refData.toDoctorName || refData.toDoctor,
                    to_dept: refData.toDept,
                    priority: refData.priority || 'Routine OPD Referral',
                    reason: refData.reason,
                    tests: refData.tests || '',
                    status: 'Pending Consultation'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        // Memory fallback
        if (typeof saveReferral === 'function') {
            await saveReferral(refData);
        }
        return refData;
    }

    // -------------------------------------------------------------------------
    // 7. NOTICES & HEALTH ADVISORIES
    // -------------------------------------------------------------------------

    async function getNotices() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('notifications')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map(n => ({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    doctorName: n.author_name,
                    department: n.department,
                    type: n.type,
                    date: n.created_at ? new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                }));
                if (window._dtuMemoryDB) {
                    window._dtuMemoryDB.notices = mapped;
                    if (typeof saveClientStore === 'function') saveClientStore(window._dtuMemoryDB);
                }
                return mapped;
            } else if (error) {
                console.warn("Supabase getNotices error:", error.message);
            }
        }
        return (window._dtuMemoryDB && window._dtuMemoryDB.notices) || [];
    }

    async function createNotice(noticeData) {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            let docUuid = null;
            try {
                const { data: authData } = await client.auth.getUser();
                if (authData && authData.user) {
                    docUuid = authData.user.id;
                }
            } catch (e) {}

            if (!docUuid) {
                docUuid = resolveDoctorUUID(currentUser.id || noticeData.doctorId || noticeData.doctorName);
            }

            const noticePayload = {
                doctor_id: docUuid,
                author_name: currentUser.name || noticeData.doctorName || 'Dr. Ravi Bansal',
                department: currentUser.department || noticeData.department || 'General Medicine (OPD)',
                title: noticeData.title,
                content: noticeData.content,
                type: noticeData.type || 'announcement',
                is_active: true
            };

            const { data, error } = await client
                .from('notifications')
                .insert(noticePayload)
                .select()
                .single();

            if (error) {
                console.error("Supabase notice insert error:", error);
                throw error;
            }

            const formattedNotice = {
                id: data.id,
                title: data.title,
                content: data.content,
                doctorName: data.author_name,
                department: data.department,
                type: data.type,
                date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString()
            };

            if (window._dtuMemoryDB) {
                if (!window._dtuMemoryDB.notices) window._dtuMemoryDB.notices = [];
                window._dtuMemoryDB.notices.unshift(formattedNotice);
                if (typeof saveClientStore === 'function') saveClientStore(window._dtuMemoryDB);
            }

            broadcastDataChange('NOTICE_ADDED', { notice: formattedNotice });
            return formattedNotice;
        }

        // Memory fallback
        if (typeof saveNotice === 'function') {
            await saveNotice(noticeData);
        }
        return noticeData;
    }

    // -------------------------------------------------------------------------
    // 8. EMERGENCY SOS ALERTS & DIRECTORY
    // -------------------------------------------------------------------------

    async function triggerSOS(sosData) {
        const client = getClient();
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (client && isLive()) {
            const { data, error } = await client
                .from('emergency_sos_logs')
                .insert({
                    student_id: currentUser.id || null,
                    student_name: sosData.studentName || currentUser.name || 'Campus Emergency',
                    phone: sosData.phone,
                    campus_location: sosData.campusLocation || sosData.location,
                    emergency_type: sosData.emergencyType || 'Medical Emergency',
                    status: 'Triggered'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        // Broadcast fallback
        if (typeof triggerEmergencySOS === 'function') {
            await triggerEmergencySOS(sosData);
        }
        return sosData;
    }

    async function getEmergencyContacts() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('emergency_contacts')
                .select('*')
                .order('id', { ascending: true });
            if (!error && data && data.length > 0) return data;
        }
        return (typeof emergencyContacts !== 'undefined' ? emergencyContacts : []);
    }

    // -------------------------------------------------------------------------
    // 9. MEDICINES & HEALTH TIPS
    // -------------------------------------------------------------------------

    async function getMedicines() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('medicine_inventory')
                .select('*')
                .order('name', { ascending: true });
            if (!error && data && data.length > 0) return data;
        }
        return (window._dtuMemoryDB && window._dtuMemoryDB.medicines) || [];
    }

    async function updateMedicineStock(id, newStock) {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('medicine_inventory')
                .update({ stock: parseInt(newStock) })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        }

        let list = (window._dtuMemoryDB && window._dtuMemoryDB.medicines) || [];
        const item = list.find(m => m.id == id);
        if (item) item.stock = parseInt(newStock);
        return true;
    }

    async function getHealthTips() {
        const client = getClient();
        if (client && isLive()) {
            const { data, error } = await client
                .from('health_tips')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data && data.length > 0) return data;
        }
        return (typeof healthTips !== 'undefined' ? healthTips : []);
    }

    // -------------------------------------------------------------------------
    // 10. REAL-TIME SUBSCRIPTIONS
    // -------------------------------------------------------------------------

    function subscribeRealtime(table, callback) {
        const client = getClient();
        if (!client || !isLive()) return null;

        const channel = client
            .channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
                if (typeof callback === 'function') {
                    callback(payload);
                }
            })
            .subscribe();

        return channel;
    }

    const service = {
        isLive,
        signUpStudent,
        signInUser,
        signOutUser,
        resetPasswordForEmail,
        updateUserPassword,
        getActiveSession,
        getDepartments,
        getDoctors,
        getSlots,
        createSlot,
        getAppointments,
        bookAppointment,
        cancelAppointment,
        completeAppointment,
        getPrescriptions,
        createPrescription,
        getReferrals,
        createReferral,
        getNotices,
        createNotice,
        triggerSOS,
        getEmergencyContacts,
        getMedicines,
        updateMedicineStock,
        getHealthTips,
        subscribeRealtime
    };

    if (typeof window !== 'undefined') {
        window.SupabaseService = service;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = service;
    }

    return service;
})();
