-- =============================================================================
-- DTU Health Center - Master Permission & Synchronization Fix
-- Script 08: Grant Table Privileges, Fix RLS & Enable Live Synchronization
-- =============================================================================
-- Execute this script in your Supabase Project Dashboard:
-- 1. Open: https://supabase.com/dashboard/project/zifgkxkrpimyxjaqjvwd
-- 2. Navigate to "SQL Editor" on the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (▶)
-- =============================================================================

-- 1. Grant Schema Usage to Public Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant Table, Sequence and Routine Privileges
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 3. Configure Default Privileges for any newly created tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 4. Repair GoTrue Auth Identities for Seeded Accounts
-- (Prevents HTTP 500 "Database error querying schema" on doctor logins)
DO $$
BEGIN
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
    SELECT 
        id::text, 
        id, 
        jsonb_build_object('sub', id::text, 'email', email), 
        'email', 
        now(), 
        now(), 
        now(),
        gen_random_uuid()
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM auth.identities)
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auth.identities auto-repair notice: %', SQLERRM;
END $$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- (A) Doctor Slots: Allow reading, inserting and updating slot capacity
ALTER TABLE public.doctor_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_slots_select_policy" ON public.doctor_slots;
CREATE POLICY "doctor_slots_select_policy" ON public.doctor_slots
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "doctor_slots_insert_policy" ON public.doctor_slots;
CREATE POLICY "doctor_slots_insert_policy" ON public.doctor_slots
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "doctor_slots_update_policy" ON public.doctor_slots;
CREATE POLICY "doctor_slots_update_policy" ON public.doctor_slots
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "doctor_slots_delete_policy" ON public.doctor_slots;
CREATE POLICY "doctor_slots_delete_policy" ON public.doctor_slots
    FOR DELETE TO anon, authenticated
    USING (true);

-- (B) Appointments: Allow students to book and doctors to view/update queue
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
CREATE POLICY "appointments_select_policy" ON public.appointments
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
CREATE POLICY "appointments_insert_policy" ON public.appointments
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
CREATE POLICY "appointments_update_policy" ON public.appointments
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
CREATE POLICY "appointments_delete_policy" ON public.appointments
    FOR DELETE TO anon, authenticated
    USING (true);

-- (C) Notifications (Health Bulletins & Announcements): Visible to ALL doctors & students
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE TO anon, authenticated
    USING (true);

-- (D) Supporting Tables: Students, Doctors, Profiles, Departments
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_all_policy" ON public.students;
CREATE POLICY "students_all_policy" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all_policy" ON public.profiles;
CREATE POLICY "profiles_all_policy" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctors_all_policy" ON public.doctors;
CREATE POLICY "doctors_all_policy" ON public.doctors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_all_policy" ON public.departments;
CREATE POLICY "departments_all_policy" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emergency_contacts_all_policy" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_all_policy" ON public.emergency_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "health_tips_all_policy" ON public.health_tips;
CREATE POLICY "health_tips_all_policy" ON public.health_tips FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Enable Realtime Replication for instant multi-device synchronization
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_slots;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
