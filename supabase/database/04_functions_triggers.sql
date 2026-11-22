-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 04: Database Functions, Triggers & Security Enforcers
-- =============================================================================
-- Description: Contains security definer RBAC helper functions, automated profile
--              creation hooks for Supabase Auth, updated_at timestamp triggers,
--              slot capacity management, and privilege escalation guards.
-- Execution Order: 4 of 6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Automated Updated-At Timestamp Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables with an updated_at column
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON public.doctors;
CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_doctor_slots_updated_at ON public.doctor_slots;
CREATE TRIGGER trg_doctor_slots_updated_at
    BEFORE UPDATE ON public.doctor_slots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_consultations_updated_at ON public.consultations;
CREATE TRIGGER trg_consultations_updated_at
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_patient_records_updated_at ON public.patient_records;
CREATE TRIGGER trg_patient_records_updated_at
    BEFORE UPDATE ON public.patient_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_medicine_inventory_updated_at ON public.medicine_inventory;
CREATE TRIGGER trg_medicine_inventory_updated_at
    BEFORE UPDATE ON public.medicine_inventory
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_health_tips_updated_at ON public.health_tips;
CREATE TRIGGER trg_health_tips_updated_at
    BEFORE UPDATE ON public.health_tips
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. RBAC Role Extraction & Verification Helper Functions
-- -----------------------------------------------------------------------------
-- Safely extracts current user's role without recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Evaluates if the authenticated user has the 'doctor' role
CREATE OR REPLACE FUNCTION public.is_doctor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'doctor'
    );
$$;

-- Evaluates if the authenticated user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'admin'
    );
$$;

-- Evaluates if the authenticated user has the 'student' role
CREATE OR REPLACE FUNCTION public.is_student(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'student'
    );
$$;

-- Evaluates whether a doctor has an active, authorized clinical relationship with a patient.
-- Clinical access rules:
-- 1. Cancelled appointments and cancelled referrals NEVER grant clinical access.
-- 2. Valid statuses:
--    - Appointments: 'confirmed' or 'completed' within active care window (-90 days past to +30 days future).
--    - Referrals: 'Pending Consultation' or 'Consultation Completed' within active care window (last 90 days).
--    - Consultations: Authored by the doctor within active care window (last 90 days).
-- 3. Past patient records do NOT independently create permanent or indefinite access.
CREATE OR REPLACE FUNCTION public.doctor_has_clinical_relationship(doc_id UUID, stud_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        -- 1. Valid, active or completed appointment within active care window (-90 days past to +30 days future)
        -- Explicitly excludes 'cancelled' appointments
        SELECT 1 FROM public.appointments a 
        WHERE a.doctor_id = doc_id 
          AND a.student_id = stud_id
          AND a.status IN ('confirmed', 'completed')
          AND a.date >= (CURRENT_DATE - INTERVAL '90 days')
          AND a.date <= (CURRENT_DATE + INTERVAL '30 days')
        UNION ALL
        -- 2. Valid, active or completed inter-department referral within active care window (last 90 days)
        -- Explicitly excludes 'Cancelled' referrals
        SELECT 1 FROM public.referrals r 
        WHERE r.student_id = stud_id 
          AND (r.from_doctor_id = doc_id OR r.to_doctor_id = doc_id)
          AND r.status IN ('Pending Consultation', 'Consultation Completed')
          AND r.created_at >= (timezone('utc'::text, now()) - INTERVAL '90 days')
        UNION ALL
        -- 3. Digital prescription / consultation authored by this doctor within active care window (last 90 days)
        SELECT 1 FROM public.consultations c 
        WHERE c.doctor_id = doc_id 
          AND c.student_id = stud_id
          AND c.created_at >= (timezone('utc'::text, now()) - INTERVAL '90 days')
    );
$$;

-- -----------------------------------------------------------------------------
-- 3. Privilege Escalation Prevention Trigger
-- -----------------------------------------------------------------------------
-- Strictly forbids any user from modifying their own 'role' field via client API.
-- Role updates can only occur through the trusted Supabase Dashboard.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Allow database superusers and verified administrators to alter roles
        IF current_user IN ('postgres', 'supabase_admin') 
           OR auth.role() = 'service_role' 
           OR public.is_admin(auth.uid()) THEN
            RETURN NEW;
        END IF;

        -- Check if the action is performed by the authenticated user on their own row
        IF auth.uid() = OLD.id THEN
            RAISE EXCEPTION 'Security Violation: Users cannot alter their own privileged security role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- 4. Supabase Auth New User Lifecycle Hook
-- -----------------------------------------------------------------------------
-- Automatically creates a public.profiles entry whenever a user signs up via auth.users.
-- Security Rule: ALL new user registrations default strictly to 'student' role.
-- Never relies on client-controlled or app metadata flags for privilege assignment.
-- Doctor and Admin roles MUST be explicitly granted post-signup through trusted administrative provisioning.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_assigned_role public.user_role;
    v_roll_no TEXT;
    v_branch TEXT;
    v_year TEXT;
    v_blood TEXT;
BEGIN
    -- Extract full name from auth metadata or derive from email
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' '))
    );

    v_phone := NEW.raw_user_meta_data->>'phone';

    -- Strict Security Enforcement against Privilege Escalation:
    -- Every public registration is forced to 'student' role.
    -- Metadata flags are NEVER trusted to grant doctor or admin privileges at signup time.
    v_assigned_role := 'student'::public.user_role;

    -- Insert into public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        phone,
        avatar_url
    ) VALUES (
        NEW.id,
        NEW.email,
        v_assigned_role,
        v_full_name,
        v_phone,
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;

    -- If registered as a student, optionally initialize student profile row safely
    IF v_assigned_role = 'student' THEN
        BEGIN
            v_roll_no := COALESCE(
                NEW.raw_user_meta_data->>'roll_no', 
                '2K' || TO_CHAR(NOW(), 'YY') || '/DTU/' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6)
            );
            v_branch := COALESCE(NEW.raw_user_meta_data->>'branch', 'General Engineering');
            v_year := COALESCE(NEW.raw_user_meta_data->>'year', '1st Year');
            v_blood := NEW.raw_user_meta_data->>'blood_group';

            INSERT INTO public.students (
                id,
                roll_no,
                branch,
                year_of_study,
                date_of_birth,
                blood_group,
                phone,
                dtu_email
            ) VALUES (
                NEW.id,
                v_roll_no,
                v_branch,
                v_year,
                CASE 
                    WHEN NEW.raw_user_meta_data->>'dob' IS NOT NULL 
                    THEN (NEW.raw_user_meta_data->>'dob')::date 
                    ELSE NULL 
                END,
                CASE 
                    WHEN v_blood IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') 
                    THEN v_blood::public.blood_group_type 
                    ELSE NULL 
                END,
                COALESCE(v_phone, '0000000000'),
                NEW.email
            ) ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            -- Ensures auth user creation is never blocked by optional profile seeding
            RAISE WARNING 'Automatic student profile initialization skipped: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- Register trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. Doctor Slot Capacity Management Trigger (Atomic Locking & Strict Rejection)
-- -----------------------------------------------------------------------------
-- Strictly prevents overscheduling race conditions and maintains atomic booked_count.
-- Uses consistent row-level FOR UPDATE locking ordered by slot ID to evaluate capacity
-- and prevent deadlocks during concurrent bookings, cancellations, and reassignments.
CREATE OR REPLACE FUNCTION public.sync_slot_capacity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_max INT;
    v_booked INT;
    v_active BOOLEAN;
BEGIN
    -- Scenario A: INSERT (New confirmed appointment)
    IF (TG_OP = 'INSERT') THEN
        IF NEW.slot_id IS NOT NULL AND NEW.status = 'confirmed' THEN
            -- Acquire row lock on target slot to prevent concurrent overbooking
            SELECT max_limit, booked_count, is_active 
            INTO v_max, v_booked, v_active
            FROM public.doctor_slots 
            WHERE id = NEW.slot_id 
            FOR UPDATE;

            IF v_max IS NULL THEN
                RAISE EXCEPTION 'Cannot book appointment: Designated doctor slot % does not exist.', NEW.slot_id;
            END IF;

            IF NOT v_active THEN
                RAISE EXCEPTION 'Cannot book appointment: This doctor consultation slot is no longer active.';
            END IF;

            IF v_booked >= v_max THEN
                RAISE EXCEPTION 'Cannot book appointment: Slot capacity has reached the maximum student limit (%/%).', v_booked, v_max;
            END IF;

            -- Atomically increment capacity
            UPDATE public.doctor_slots 
            SET booked_count = booked_count + 1 
            WHERE id = NEW.slot_id;
        END IF;
        RETURN NEW;

    -- Scenario B: UPDATE (Slot reassignment or status changes)
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Case B1: Slot Reassignment (Moved from slot A to slot B)
        IF OLD.slot_id IS DISTINCT FROM NEW.slot_id THEN
            -- Deadlock-free locking: Lock all affected slot IDs in strict ascending primary key order
            PERFORM 1 FROM public.doctor_slots 
            WHERE id IN (OLD.slot_id, NEW.slot_id) 
            ORDER BY id 
            FOR UPDATE;

            -- Decrement old slot if it was previously confirmed
            IF OLD.slot_id IS NOT NULL AND OLD.status = 'confirmed' THEN
                UPDATE public.doctor_slots 
                SET booked_count = GREATEST(0, booked_count - 1) 
                WHERE id = OLD.slot_id;
            END IF;

            -- Increment new slot if confirmed (with capacity check)
            IF NEW.slot_id IS NOT NULL AND NEW.status = 'confirmed' THEN
                SELECT max_limit, booked_count, is_active 
                INTO v_max, v_booked, v_active
                FROM public.doctor_slots 
                WHERE id = NEW.slot_id;

                IF v_max IS NULL THEN
                    RAISE EXCEPTION 'Target doctor slot % does not exist.', NEW.slot_id;
                END IF;

                IF NOT v_active THEN
                    RAISE EXCEPTION 'Target doctor consultation slot is no longer active.';
                END IF;

                IF v_booked >= v_max THEN
                    RAISE EXCEPTION 'Target slot capacity has reached the maximum student limit (%/%).', v_booked, v_max;
                END IF;

                UPDATE public.doctor_slots 
                SET booked_count = booked_count + 1 
                WHERE id = NEW.slot_id;
            END IF;

        -- Case B2: Same slot, status changed to 'cancelled' (Cancellation)
        ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND NEW.slot_id IS NOT NULL THEN
            PERFORM 1 FROM public.doctor_slots WHERE id = NEW.slot_id FOR UPDATE;

            UPDATE public.doctor_slots 
            SET booked_count = GREATEST(0, booked_count - 1) 
            WHERE id = NEW.slot_id;

        -- Case B3: Same slot, status changed from 'cancelled' to 'confirmed' (Reactivation)
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'confirmed' AND NEW.slot_id IS NOT NULL THEN
            SELECT max_limit, booked_count, is_active 
            INTO v_max, v_booked, v_active
            FROM public.doctor_slots 
            WHERE id = NEW.slot_id 
            FOR UPDATE;

            IF v_max IS NULL OR NOT v_active THEN
                RAISE EXCEPTION 'Cannot reactivate appointment: Slot is inactive or does not exist.';
            END IF;

            IF v_booked >= v_max THEN
                RAISE EXCEPTION 'Cannot reactivate appointment: Slot has reached maximum capacity (%/%).', v_booked, v_max;
            END IF;

            UPDATE public.doctor_slots 
            SET booked_count = booked_count + 1 
            WHERE id = NEW.slot_id;
        END IF;

        RETURN NEW;

    -- Scenario C: DELETE (Appointment row deleted)
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.slot_id IS NOT NULL AND OLD.status = 'confirmed' THEN
            PERFORM 1 FROM public.doctor_slots WHERE id = OLD.slot_id FOR UPDATE;

            UPDATE public.doctor_slots 
            SET booked_count = GREATEST(0, booked_count - 1) 
            WHERE id = OLD.slot_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_slot_capacity_insert_update ON public.appointments;
CREATE TRIGGER trg_sync_slot_capacity_insert_update
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.sync_slot_capacity();

DROP TRIGGER IF EXISTS trg_sync_slot_capacity_delete ON public.appointments;
CREATE TRIGGER trg_sync_slot_capacity_delete
    AFTER DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.sync_slot_capacity();

-- -----------------------------------------------------------------------------
-- 6. Appointment Update Security Validation Trigger
-- -----------------------------------------------------------------------------
-- Enforces that students can ONLY cancel their own confirmed appointments and
-- cannot alter reason, urgency, names, emails, roll numbers, doctor details, booking fields,
-- or ownership. Doctors can only update status to 'completed' or 'cancelled' on appointments
-- assigned to them, and cannot alter patient identity or booking schedule fields.
CREATE OR REPLACE FUNCTION public.validate_appointment_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role public.user_role;
BEGIN
    v_caller_id := auth.uid();
    v_caller_role := public.get_user_role(v_caller_id);

    -- Service role and database administrators bypass update constraints
    IF current_user IN ('postgres', 'supabase_admin') 
       OR auth.role() = 'service_role' 
       OR v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- IMMUTABLE FIELDS: Ownership and PK can NEVER be transferred
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
        RAISE EXCEPTION 'Security Violation: Appointment student ownership cannot be modified.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Security Violation: Appointment ID is immutable.';
    END IF;

    -- STUDENT CONSTRAINTS:
    IF v_caller_role = 'student' THEN
        IF OLD.student_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Security Violation: You can only cancel your own appointments.';
        END IF;

        -- Students can ONLY transition from 'confirmed' to 'cancelled'
        IF NOT (OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
            RAISE EXCEPTION 'Security Violation: Students are only permitted to cancel confirmed appointments.';
        END IF;

        -- Students must not modify reason, urgency, names, emails, roll numbers, doctor details, or booking fields
        IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id 
           OR NEW.slot_id IS DISTINCT FROM OLD.slot_id 
           OR NEW.student_name IS DISTINCT FROM OLD.student_name
           OR NEW.student_email IS DISTINCT FROM OLD.student_email
           OR NEW.roll_no IS DISTINCT FROM OLD.roll_no
           OR NEW.branch IS DISTINCT FROM OLD.branch
           OR NEW.doctor_name IS DISTINCT FROM OLD.doctor_name
           OR NEW.department IS DISTINCT FROM OLD.department
           OR NEW.date IS DISTINCT FROM OLD.date 
           OR NEW.time_window IS DISTINCT FROM OLD.time_window 
           OR NEW.mode IS DISTINCT FROM OLD.mode
           OR NEW.reason IS DISTINCT FROM OLD.reason
           OR NEW.urgency IS DISTINCT FROM OLD.urgency THEN
            RAISE EXCEPTION 'Security Violation: Students cannot modify booking details, patient identity, clinical parameters, reason, or urgency.';
        END IF;

        RETURN NEW;
    END IF;

    -- DOCTOR CONSTRAINTS:
    IF v_caller_role = 'doctor' THEN
        -- Doctor must be the assigned clinician for this appointment
        IF OLD.doctor_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Security Violation: Doctors can only update appointments assigned to them.';
        END IF;

        -- Doctor can only transition status to 'completed' or 'cancelled'
        IF NEW.status NOT IN ('completed', 'cancelled') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Doctors can only transition appointment status to completed or cancelled.';
        END IF;

        -- Prevent doctors from modifying patient identity, booking details, or unrelated fields
        IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
           OR NEW.slot_id IS DISTINCT FROM OLD.slot_id
           OR NEW.student_id IS DISTINCT FROM OLD.student_id
           OR NEW.student_name IS DISTINCT FROM OLD.student_name
           OR NEW.student_email IS DISTINCT FROM OLD.student_email
           OR NEW.roll_no IS DISTINCT FROM OLD.roll_no
           OR NEW.branch IS DISTINCT FROM OLD.branch
           OR NEW.doctor_name IS DISTINCT FROM OLD.doctor_name
           OR NEW.department IS DISTINCT FROM OLD.department
           OR NEW.date IS DISTINCT FROM OLD.date
           OR NEW.time_window IS DISTINCT FROM OLD.time_window
           OR NEW.mode IS DISTINCT FROM OLD.mode
           OR NEW.reason IS DISTINCT FROM OLD.reason
           OR NEW.urgency IS DISTINCT FROM OLD.urgency THEN
            RAISE EXCEPTION 'Security Violation: Doctors cannot modify patient identity, booking details, clinical urgency, or booking notes.';
        END IF;

        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Security Violation: Unauthorized appointment update.';
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_update ON public.appointments;
CREATE TRIGGER trg_validate_appointment_update
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_update();

-- -----------------------------------------------------------------------------
-- 7. Emergency SOS Anti-Abuse Cooldown Trigger
-- -----------------------------------------------------------------------------
-- Enforces data integrity, phone formatting, location validation, and a concurrency-safe
-- 60-second cooldown per contact phone number using PostgreSQL advisory transaction locks.
CREATE OR REPLACE FUNCTION public.validate_emergency_sos_submission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.phone := TRIM(NEW.phone);
    NEW.campus_location := TRIM(NEW.campus_location);
    NEW.emergency_type := TRIM(NEW.emergency_type);

    -- Format validation
    IF NEW.phone !~ '^\+?[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'Invalid emergency contact phone number format.';
    END IF;

    IF LENGTH(NEW.campus_location) < 3 THEN
        RAISE EXCEPTION 'Campus location must be specified for ambulance dispatch.';
    END IF;

    IF LENGTH(NEW.emergency_type) < 3 THEN
        RAISE EXCEPTION 'Emergency type description must be specified.';
    END IF;

    -- Concurrency-Safe Rate-Limiting Cooldown:
    -- Acquire transaction-level advisory lock on the phone hash to serialize concurrent submissions
    PERFORM pg_advisory_xact_lock(hashtext('emergency_sos_' || NEW.phone));

    -- Block rapid repeat submissions from the same contact within 60 seconds
    IF EXISTS (
        SELECT 1 FROM public.emergency_sos_logs
        WHERE phone = NEW.phone 
          AND created_at > (timezone('utc'::text, now()) - INTERVAL '60 seconds')
    ) THEN
        RAISE EXCEPTION 'An emergency SOS alert from this contact number was recently dispatched. The response team is en route.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_emergency_sos ON public.emergency_sos_logs;
CREATE TRIGGER trg_validate_emergency_sos
    BEFORE INSERT ON public.emergency_sos_logs
    FOR EACH ROW EXECUTE FUNCTION public.validate_emergency_sos_submission();
