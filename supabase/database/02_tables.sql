-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 02: Normalized Table Definitions & Core Constraints
-- =============================================================================
-- Description: Creates all database tables with primary keys, column constraints,
--              defaults, check conditions, and referential actions.
-- Execution Order: 2 of 6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profiles Table (Base identity extending Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'student',
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT email_format_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE public.profiles IS 'Primary user identity table extending auth.users with RBAC role definitions.';

-- -----------------------------------------------------------------------------
-- 2. Medical Departments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '🏥',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.departments IS 'Hospital clinical divisions (OPD, Dental, Orthopedic, Psychiatry, etc.).';

-- -----------------------------------------------------------------------------
-- 3. Doctors Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id BIGINT REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience TEXT,
    photo TEXT DEFAULT '👨‍⚕️',
    phone TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.doctors IS 'Clinical medical practitioner records linked to user profiles.';

-- -----------------------------------------------------------------------------
-- 4. Students Table (DTU Student Medical Records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    roll_no TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL,
    year_of_study TEXT NOT NULL,
    date_of_birth DATE,
    blood_group public.blood_group_type,
    phone TEXT NOT NULL,
    dtu_email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT student_email_format_check CHECK (dtu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE public.students IS 'DTU student medical profile and university academic identification.';

-- -----------------------------------------------------------------------------
-- 5. Doctor Availability Slots Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_slots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    department TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_limit INT NOT NULL DEFAULT 10 CHECK (max_limit > 0 AND max_limit <= 25),
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time),
    CONSTRAINT slot_capacity_not_exceeded CHECK (booked_count <= max_limit)
);

COMMENT ON TABLE public.doctor_slots IS 'Weekly OPD appointment availability slots configured by doctors.';

-- -----------------------------------------------------------------------------
-- 6. Appointments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY DEFAULT ('APT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0')),
    slot_id BIGINT REFERENCES public.doctor_slots(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    branch TEXT,
    doctor_name TEXT NOT NULL,
    department TEXT NOT NULL,
    date DATE NOT NULL,
    time_window TEXT NOT NULL,
    mode public.consultation_mode NOT NULL DEFAULT 'Physical OPD Visit (Health Center)',
    reason TEXT NOT NULL,
    urgency public.appointment_urgency NOT NULL DEFAULT 'Normal / Routine',
    status public.appointment_status NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.appointments IS 'Patient consultation bookings and live outpatient queue encounters.';

-- -----------------------------------------------------------------------------
-- 7. Consultations Table (Digital Prescriptions & Test Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
    id TEXT PRIMARY KEY DEFAULT ('RX-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0')),
    appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    department TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
    tests TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.consultations IS 'Clinical diagnosis encounters, prescription medicine dosages, and lab test orders.';

-- -----------------------------------------------------------------------------
-- 8. Patient Records Table (Longitudinal Student Medical History)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_records (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    consultation_id TEXT REFERENCES public.consultations(id) ON DELETE SET NULL,
    record_type public.patient_record_type NOT NULL DEFAULT 'Consultation',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.patient_records IS 'Longitudinal student medical history tracking encounters, vaccinations, and chronic observations.';

-- -----------------------------------------------------------------------------
-- 9. Referrals Table (Inter-Department Clinical Referral Slips)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY DEFAULT ('REF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0')),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    from_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    from_doctor_name TEXT NOT NULL,
    from_dept TEXT NOT NULL,
    to_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    to_doctor_name TEXT NOT NULL,
    to_dept TEXT NOT NULL,
    priority public.referral_priority NOT NULL DEFAULT 'Routine OPD Referral',
    reason TEXT NOT NULL,
    tests TEXT,
    status public.referral_status NOT NULL DEFAULT 'Pending Consultation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.referrals IS 'Specialist medical referrals between hospital doctors for secondary opinion and diagnostics.';

-- -----------------------------------------------------------------------------
-- 10. Notifications Table (Campus Health Bulletins & Doctor Notices)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    department TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type public.notice_type NOT NULL DEFAULT 'announcement',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.notifications IS 'Doctor broadcast bulletins, health advisories, and campus vaccination drives.';

-- -----------------------------------------------------------------------------
-- 11. Emergency SOS Logs Table (Campus Ambulance Dispatch Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_sos_logs (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    campus_location TEXT NOT NULL,
    emergency_type TEXT NOT NULL,
    status public.emergency_status NOT NULL DEFAULT 'Triggered',
    dispatched_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT emergency_phone_format_check CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT emergency_location_non_empty CHECK (LENGTH(TRIM(campus_location)) >= 3),
    CONSTRAINT emergency_type_non_empty CHECK (LENGTH(TRIM(emergency_type)) >= 3)
);

COMMENT ON TABLE public.emergency_sos_logs IS 'Campus-wide emergency SOS ambulance requests with physical geolocation points.';

-- -----------------------------------------------------------------------------
-- 12. Medicine Inventory Table (Dispensary Pharmacy Stock)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medicine_inventory (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit TEXT NOT NULL DEFAULT 'Tablets',
    expiry TEXT,
    min_threshold INT NOT NULL DEFAULT 20,
    updated_by UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.medicine_inventory IS 'DTU Health Center internal pharmacy medicine stock and low-inventory alerts.';

-- -----------------------------------------------------------------------------
-- 13. Health Tips Table (Campus Wellness Articles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_tips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    title TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    category public.tip_category NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.health_tips IS 'Preventative medicine wellness articles authored by medical officers.';

-- -----------------------------------------------------------------------------
-- 14. Emergency Contacts Table (DTU 24/7 Helpline Directory)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    available TEXT NOT NULL DEFAULT '24/7',
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.emergency_contacts IS 'DTU campus emergency directory numbers (ambulance, security, local police, hospitals).';
