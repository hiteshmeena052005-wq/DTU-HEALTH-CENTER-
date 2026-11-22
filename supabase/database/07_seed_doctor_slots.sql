-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 07: Master Seed Data - 10 Official Doctors, Active OPD Slots & Live Records
-- =============================================================================
-- Description: Completely populates all Supabase tables for the DTU Health Center:
--              1. Departments (10 clinical units)
--              2. 10 Official DTU Doctors in auth.users, profiles, and doctors
--              3. 10 Active OPD Checkup Slots in doctor_slots matching official schedule
--              4. Verified DTU Student (Rahul Meena) in auth.users, profiles, and students
--              5. Confirmed demonstration appointments in appointments
--              6. Digital consultation prescription in consultations
--              7. Inter-department clinical referral slip in referrals
--              8. Campus health advisory notice in notifications
--              9. Dispensary medicine inventory in medicine_inventory
--             10. Campus emergency contacts & health wellness tips
--
-- How to run: Open your Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run!
-- Password for all doctors:  doctor123
-- Password for student:      student123
-- =============================================================================

DO $$
DECLARE
    v_dept_id BIGINT;
    v_doc_id UUID;
    v_stud_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_existing_id UUID;
    v_slot1_id BIGINT;
    v_slot2_id BIGINT;
BEGIN

    -- 0. Ensure pgcrypto extension is active for password hashing
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- =========================================================================
    -- 1. SEED DEPARTMENTS (10 Clinical Units)
    -- =========================================================================
    INSERT INTO public.departments (name, icon, description) VALUES
        ('General Medicine (OPD)', '🩺', 'Primary outpatient care, morning and afternoon OPD consultations, seasonal triage and health ailments.'),
        ('General Medicine (Evening OPD)', '🌙', 'Evening outpatient care from 7 PM to 10 PM for campus students and hostel residents.'),
        ('Ophthalmology (Eye Specialist)', '👁️', 'Vision testing, computer vision strain checks, conjunctivitis and ophthalmic care (Mon, Wed, Fri 1 PM - 3 PM).'),
        ('Dental Care', '🦷', 'Dental screening, dental scaling, cavity prophylaxis and oral hygiene (Mon, Wed, Fri 1 PM - 3 PM).'),
        ('Sports Medicine & Physiotherapy', '🏃', 'Sports injury rehabilitation, MPT physical therapy and joint alignment (Mon to Sat 1 PM - 4 PM).'),
        ('Orthopedic', '🦴', 'Joint pain, ligament sprains, ergonomic cervical and orthopedic care (Mon, Wed, Fri 1 PM - 3 PM).'),
        ('Psychiatry', '🧠', 'Psychiatric clinical care, mental health assessments and medical consultations (Tue & Thu 1 PM - 4 PM).'),
        ('Gynecology', '👩‍⚕️', 'Women wellness clinic, menstrual health support and specialized clinical consultations (Tue & Thu 1 PM - 4 PM).'),
        ('Clinical Psychology & Counseling', '💬', 'Student exam stress counseling, psychotherapy and emotional wellness (Tue, Thu, Sat 12 PM - 4 PM).'),
        ('Pathology & Lab Diagnostics', '🔬', 'Clinical diagnostics, CBC blood investigations, dengue serology and laboratory testing.')
    ON CONFLICT (name) DO UPDATE 
    SET icon = EXCLUDED.icon,
        description = EXCLUDED.description;

    -- =========================================================================
    -- 2. SEED 10 OFFICIAL DTU DOCTORS & ACTIVE OPD SLOTS
    -- =========================================================================

    -- -------------------------------------------------------------------------
    -- 1. DR. RAVI BANSAL (General Physician - Afternoon OPD)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.ravibansal@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Ravi Bansal', 'full_name', 'Dr. Ravi Bansal')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000001'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.ravibansal@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Ravi Bansal","full_name":"Dr. Ravi Bansal"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'General Medicine (OPD)' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.ravibansal@dtu.ac.in', 'doctor', 'Dr. Ravi Bansal', '+91 9811223301')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Ravi Bansal', phone = '+91 9811223301', email = 'dr.ravibansal@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'General Medicine (OPD)', 'MBBS, MD (General Medicine)', '15+ Years', '👨‍⚕️', '+91 9811223301', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Ravi Bansal', 'General Medicine (OPD)', CURRENT_DATE + INTERVAL '1 day', '13:00:00', '17:00:00', 10, 1, 'Afternoon General OPD (Mon to Sat 1 PM - 5 PM)', true)
    RETURNING id INTO v_slot1_id;

    -- -------------------------------------------------------------------------
    -- 2. DR. RAJESH SINGHAI (General Physician - Morning OPD)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.rajeshsinghai@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Rajesh Singhai', 'full_name', 'Dr. Rajesh Singhai')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000002'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.rajeshsinghai@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Rajesh Singhai","full_name":"Dr. Rajesh Singhai"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'General Medicine (OPD)' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.rajeshsinghai@dtu.ac.in', 'doctor', 'Dr. Rajesh Singhai', '+91 9811223302')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Rajesh Singhai', phone = '+91 9811223302', email = 'dr.rajeshsinghai@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'General Medicine (OPD)', 'MBBS, MD', '14+ Years', '👨‍⚕️', '+91 9811223302', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Rajesh Singhai', 'General Medicine (OPD)', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '12:00:00', 10, 1, 'Morning General OPD Consultation (Mon to Sat 9 AM - 12 PM)', true)
    RETURNING id INTO v_slot2_id;

    -- -------------------------------------------------------------------------
    -- 3. DR. ARPANA BANSAL (Eye Specialist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.arpanabansal@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Arpana Bansal', 'full_name', 'Dr. Arpana Bansal')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000003'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.arpanabansal@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Arpana Bansal","full_name":"Dr. Arpana Bansal"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Ophthalmology (Eye Specialist)' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.arpanabansal@dtu.ac.in', 'doctor', 'Dr. Arpana Bansal', '+91 9811223303')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Arpana Bansal', phone = '+91 9811223303', email = 'dr.arpanabansal@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Ophthalmology (Eye Specialist)', 'MBBS, MS (Ophthalmology)', '12+ Years', '👩‍⚕️', '+91 9811223303', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Arpana Bansal', 'Ophthalmology (Eye Specialist)', CURRENT_DATE + INTERVAL '2 days', '13:00:00', '15:00:00', 10, 0, 'Eye testing, vision screening & computer strain (Mon, Wed, Fri 1 PM - 3 PM)', true);

    -- -------------------------------------------------------------------------
    -- 4. DR. BHARAT BHUSHAN SETHI (Dentist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.bharatsethi@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Bharat Bhushan Sethi', 'full_name', 'Dr. Bharat Bhushan Sethi')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000004'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.bharatsethi@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Bharat Bhushan Sethi","full_name":"Dr. Bharat Bhushan Sethi"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Dental Care' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.bharatsethi@dtu.ac.in', 'doctor', 'Dr. Bharat Bhushan Sethi', '+91 9811223304')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Bharat Bhushan Sethi', phone = '+91 9811223304', email = 'dr.bharatsethi@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Dental Care', 'BDS, MDS (Dental Surgery)', '16+ Years', '👨‍⚕️', '+91 9811223304', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Bharat Bhushan Sethi', 'Dental Care', CURRENT_DATE + INTERVAL '2 days', '13:00:00', '15:00:00', 10, 0, 'Dental examination, scaling & cavity treatment (Mon, Wed, Fri 1 PM - 3 PM)', true);

    -- -------------------------------------------------------------------------
    -- 5. DR. SUBODH MOR (Sports Medicine & Physiotherapist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.subodhmor@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Subodh Mor', 'full_name', 'Dr. Subodh Mor')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000005'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.subodhmor@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Subodh Mor","full_name":"Dr. Subodh Mor"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Sports Medicine & Physiotherapy' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.subodhmor@dtu.ac.in', 'doctor', 'Dr. Subodh Mor', '+91 9811223305')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Subodh Mor', phone = '+91 9811223305', email = 'dr.subodhmor@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Sports Medicine & Physiotherapy', 'BPT, MPT (Sports Medicine)', '11+ Years', '👨‍⚕️', '+91 9811223305', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Subodh Mor', 'Sports Medicine & Physiotherapy', CURRENT_DATE + INTERVAL '2 days', '13:00:00', '16:00:00', 10, 0, 'Sports injuries, physical rehabilitation & joint therapy (Mon to Sat 1 PM - 4 PM)', true);

    -- -------------------------------------------------------------------------
    -- 6. DR. DINESH BANSAL (Orthopedician)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.dineshbansal@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Dinesh Bansal', 'full_name', 'Dr. Dinesh Bansal')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000006'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.dineshbansal@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Dinesh Bansal","full_name":"Dr. Dinesh Bansal"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Orthopedic' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.dineshbansal@dtu.ac.in', 'doctor', 'Dr. Dinesh Bansal', '+91 9811223306')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Dinesh Bansal', phone = '+91 9811223306', email = 'dr.dineshbansal@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Orthopedic', 'MBBS, MS (Orthopedics)', '18+ Years', '👨‍⚕️', '+91 9811223306', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Dinesh Bansal', 'Orthopedic', CURRENT_DATE + INTERVAL '3 days', '13:00:00', '15:00:00', 10, 0, 'Orthopedic screening, sprains & bone alignment (Mon, Wed, Fri 1 PM - 3 PM)', true);

    -- -------------------------------------------------------------------------
    -- 7. DR. GAURAV GUPTA (Psychiatrist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.gauravgupta@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Gaurav Gupta', 'full_name', 'Dr. Gaurav Gupta')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000007'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.gauravgupta@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Gaurav Gupta","full_name":"Dr. Gaurav Gupta"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Psychiatry' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.gauravgupta@dtu.ac.in', 'doctor', 'Dr. Gaurav Gupta', '+91 9811223307')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Gaurav Gupta', phone = '+91 9811223307', email = 'dr.gauravgupta@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Psychiatry', 'MBBS, MD (Psychiatry)', '13+ Years', '👨‍⚕️', '+91 9811223307', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Gaurav Gupta', 'Psychiatry', CURRENT_DATE + INTERVAL '3 days', '13:00:00', '16:00:00', 10, 0, 'Psychiatric consultation & mental health care (Tue & Thu 1 PM - 4 PM)', true);

    -- -------------------------------------------------------------------------
    -- 8. DR. NISHA JHA (Gynaecologist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.nishajha@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Nisha Jha', 'full_name', 'Dr. Nisha Jha')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000008'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.nishajha@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Nisha Jha","full_name":"Dr. Nisha Jha"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Gynecology' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.nishajha@dtu.ac.in', 'doctor', 'Dr. Nisha Jha', '+91 9811223308')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Nisha Jha', phone = '+91 9811223308', email = 'dr.nishajha@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Gynecology', 'MBBS, DGO, MD (Gynecology)', '15+ Years', '👩‍⚕️', '+91 9811223308', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Nisha Jha', 'Gynecology', CURRENT_DATE + INTERVAL '3 days', '13:00:00', '16:00:00', 10, 0, 'Women wellness & gynecological consultation (Tue & Thu 1 PM - 4 PM)', true);

    -- -------------------------------------------------------------------------
    -- 9. DR. MOHIT GULIA (General Physician - Evening OPD)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.mohitgulia@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Mohit Gulia', 'full_name', 'Dr. Mohit Gulia')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000009'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.mohitgulia@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Mohit Gulia","full_name":"Dr. Mohit Gulia"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'General Medicine (Evening OPD)' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.mohitgulia@dtu.ac.in', 'doctor', 'Dr. Mohit Gulia', '+91 9811223309')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Mohit Gulia', phone = '+91 9811223309', email = 'dr.mohitgulia@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'General Medicine (Evening OPD)', 'MBBS, MD', '10+ Years', '👨‍⚕️', '+91 9811223309', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Mohit Gulia', 'General Medicine (Evening OPD)', CURRENT_DATE + INTERVAL '4 days', '19:00:00', '22:00:00', 10, 0, 'Evening General OPD consultation for hostelers (Mon to Sat 7 PM - 10 PM)', true);

    -- -------------------------------------------------------------------------
    -- 10. DR. ADITI BANSAL (Clinical Psychologist)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'dr.aditibansal@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_doc_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('doctor123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', 'Dr. Aditi Bansal', 'full_name', 'Dr. Aditi Bansal')
        WHERE id = v_doc_id;
    ELSE
        v_doc_id := 'd0000000-0000-0000-0000-000000000010'::uuid;
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_doc_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.aditibansal@dtu.ac.in', crypt('doctor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Dr. Aditi Bansal","full_name":"Dr. Aditi Bansal"}', now(), now());
    END IF;

    SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Clinical Psychology & Counseling' LIMIT 1;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_doc_id, 'dr.aditibansal@dtu.ac.in', 'doctor', 'Dr. Aditi Bansal', '+91 9811223310')
    ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = 'Dr. Aditi Bansal', phone = '+91 9811223310', email = 'dr.aditibansal@dtu.ac.in';

    INSERT INTO public.doctors (id, department_id, department_name, qualification, experience, photo, phone, is_available)
    VALUES (v_doc_id, v_dept_id, 'Clinical Psychology & Counseling', 'M.Phil, Ph.D (Clinical Psychology)', '9+ Years', '👩‍⚕️', '+91 9811223310', true)
    ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id, department_name = EXCLUDED.department_name, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience, is_available = true;

    DELETE FROM public.doctor_slots WHERE doctor_id = v_doc_id;
    INSERT INTO public.doctor_slots (doctor_id, doctor_name, department, date, start_time, end_time, max_limit, booked_count, note, is_active)
    VALUES (v_doc_id, 'Dr. Aditi Bansal', 'Clinical Psychology & Counseling', CURRENT_DATE + INTERVAL '4 days', '12:00:00', '16:00:00', 10, 0, 'Exam stress, psychotherapy & student counseling (Tue, Thu, Sat 12 PM - 4 PM)', true);

    -- =========================================================================
    -- 3. SEED VERIFIED SAMPLE STUDENT (Rahul Meena)
    -- =========================================================================
    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'rahul.meena@dtu.ac.in' LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
        v_stud_id := v_existing_id;
        UPDATE auth.users 
        SET encrypted_password = crypt('student123', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('role', 'student', 'name', 'Rahul Meena', 'full_name', 'Rahul Meena', 'roll_no', '2K22/CO/101', 'branch', 'Computer Science & Engineering', 'year', '3rd Year')
        WHERE id = v_stud_id;
    ELSE
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_stud_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul.meena@dtu.ac.in', crypt('student123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"student","name":"Rahul Meena","full_name":"Rahul Meena","roll_no":"2K22/CO/101","branch":"Computer Science & Engineering","year":"3rd Year"}', now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (v_stud_id, 'rahul.meena@dtu.ac.in', 'student', 'Rahul Meena', '+91 9876543210')
    ON CONFLICT (id) DO UPDATE SET role = 'student', full_name = 'Rahul Meena', phone = '+91 9876543210', email = 'rahul.meena@dtu.ac.in';

    INSERT INTO public.students (id, roll_no, branch, year_of_study, date_of_birth, blood_group, phone, dtu_email)
    VALUES (v_stud_id, '2K22/CO/101', 'Computer Science & Engineering', '3rd Year', '2003-05-14', 'B+', '+91 9876543210', 'rahul.meena@dtu.ac.in')
    ON CONFLICT (id) DO UPDATE SET roll_no = '2K22/CO/101', branch = 'Computer Science & Engineering', year_of_study = '3rd Year', blood_group = 'B+', phone = '+91 9876543210', dtu_email = 'rahul.meena@dtu.ac.in';

    -- =========================================================================
    -- 4. SEED DEMONSTRATION APPOINTMENTS
    -- =========================================================================
    DELETE FROM public.appointments WHERE student_id = v_stud_id;

    -- Appointment 1: Rahul with Dr. Rajesh Singhai (Morning OPD)
    INSERT INTO public.appointments (
        id, slot_id, student_id, doctor_id, student_name, student_email, roll_no, branch,
        doctor_name, department, date, time_window, mode, reason, urgency, status
    ) VALUES (
        'APT-2611-1001',
        v_slot2_id,
        v_stud_id,
        'd0000000-0000-0000-0000-000000000002'::uuid,
        'Rahul Meena',
        'rahul.meena@dtu.ac.in',
        '2K22/CO/101',
        'Computer Science & Engineering',
        'Dr. Rajesh Singhai',
        'General Medicine (OPD)',
        CURRENT_DATE + INTERVAL '1 day',
        '09:00 AM - 12:00 PM',
        'Physical OPD Visit (Health Center)',
        'Seasonal flu, mild fever and sore throat since yesterday night',
        'Normal / Routine',
        'confirmed'
    ) ON CONFLICT (id) DO UPDATE SET status = 'confirmed';

    -- Appointment 2: Rahul with Dr. Ravi Bansal (Afternoon OPD)
    INSERT INTO public.appointments (
        id, slot_id, student_id, doctor_id, student_name, student_email, roll_no, branch,
        doctor_name, department, date, time_window, mode, reason, urgency, status
    ) VALUES (
        'APT-2611-1002',
        v_slot1_id,
        v_stud_id,
        'd0000000-0000-0000-0000-000000000001'::uuid,
        'Rahul Meena',
        'rahul.meena@dtu.ac.in',
        '2K22/CO/101',
        'Computer Science & Engineering',
        'Dr. Ravi Bansal',
        'General Medicine (OPD)',
        CURRENT_DATE + INTERVAL '1 day',
        '01:00 PM - 05:00 PM',
        'Physical OPD Visit (Health Center)',
        'Follow-up evaluation for seasonal allergy and chest congestion',
        'Normal / Routine',
        'confirmed'
    ) ON CONFLICT (id) DO UPDATE SET status = 'confirmed';

    -- Sync booked_count on both slots
    IF v_slot1_id IS NOT NULL THEN
        UPDATE public.doctor_slots SET booked_count = 1 WHERE id = v_slot1_id;
    END IF;
    IF v_slot2_id IS NOT NULL THEN
        UPDATE public.doctor_slots SET booked_count = 1 WHERE id = v_slot2_id;
    END IF;

    -- =========================================================================
    -- 5. SEED DIGITAL CONSULTATION PRESCRIPTION (Dr. Ravi Bansal -> Rahul Meena)
    -- =========================================================================
    DELETE FROM public.consultations WHERE student_id = v_stud_id;

    INSERT INTO public.consultations (
        id, appointment_id, student_id, doctor_id, student_name, student_email,
        doctor_name, department, diagnosis, medicines, tests, follow_up_date, notes
    ) VALUES (
        'RX-2611-1001',
        'APT-2611-1002',
        v_stud_id,
        'd0000000-0000-0000-0000-000000000001'::uuid,
        'Rahul Meena',
        'rahul.meena@dtu.ac.in',
        'Dr. Ravi Bansal',
        'General Medicine (OPD)',
        'Acute viral nasopharyngitis with mild pyrexia',
        '[
            {"name": "Paracetamol 650mg", "dosage": "1 tab TDS after meals", "duration": "3 Days"},
            {"name": "Cetirizine 10mg", "dosage": "1 tab OD at bedtime", "duration": "5 Days"},
            {"name": "Pantoprazole 40mg", "dosage": "1 tab OD before breakfast", "duration": "5 Days"}
        ]'::jsonb,
        'None required currently. Monitor temperature daily.',
        CURRENT_DATE + INTERVAL '4 days',
        'Take warm saline gargles twice daily. Maintain adequate oral hydration with warm fluids.'
    ) ON CONFLICT (id) DO UPDATE 
    SET diagnosis = EXCLUDED.diagnosis, medicines = EXCLUDED.medicines;

    -- =========================================================================
    -- 6. SEED INTER-DEPARTMENT REFERRAL (Dr. Ravi Bansal -> Dr. Dinesh Bansal)
    -- =========================================================================
    DELETE FROM public.referrals WHERE student_id = v_stud_id;

    INSERT INTO public.referrals (
        id, student_id, student_name, roll_no, from_doctor_id, from_doctor_name,
        from_dept, to_doctor_id, to_doctor_name, to_dept, priority, reason, tests, status
    ) VALUES (
        'REF-2611-1001',
        v_stud_id,
        'Rahul Meena',
        '2K22/CO/101',
        'd0000000-0000-0000-0000-000000000001'::uuid,
        'Dr. Ravi Bansal',
        'General Medicine (OPD)',
        'd0000000-0000-0000-0000-000000000006'::uuid,
        'Dr. Dinesh Bansal',
        'Orthopedic',
        'Routine OPD Referral',
        'Complaining of persistent lower back stiffness and cervical strain after prolonged coding lab sessions.',
        'Lumbosacral spine posture evaluation',
        'Consultation Completed'
    ) ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- 7. SEED CAMPUS HEALTH BULLETINS & ANNOUNCEMENTS
    -- =========================================================================
    DELETE FROM public.notifications WHERE title LIKE '%Flu Vaccination Drive%';

    INSERT INTO public.notifications (
        doctor_id, author_name, department, title, content, type, is_active
    ) VALUES (
        'd0000000-0000-0000-0000-000000000001'::uuid,
        'Dr. Ravi Bansal',
        'General Medicine (OPD)',
        'Annual Seasonal Flu Vaccination Drive at DTU Health Center',
        'Annual seasonal influenza vaccination drive will be conducted at DTU Health Center OPD Block from 10:00 AM to 4:00 PM. All students and campus hostellers are advised to bring their DTU Student ID card.',
        'vaccination_drive',
        true
    );

    -- =========================================================================
    -- 8. SEED MEDICINE INVENTORY (Matching js/data.js)
    -- =========================================================================
    INSERT INTO public.medicine_inventory (name, category, stock, unit, expiry, min_threshold) VALUES
        ('Paracetamol 650mg', 'Analgesic / Fever', 120, 'Tablets', '2027-04', 30),
        ('Cetirizine 10mg', 'Antihistamine / Allergy', 85, 'Tablets', '2026-12', 25),
        ('Amoxicillin 500mg', 'Antibiotic', 45, 'Capsules', '2026-09', 20),
        ('Pantoprazole 40mg', 'Antacid / Acidity', 90, 'Tablets', '2027-02', 20),
        ('Ibuprofen 400mg', 'Pain Relief', 60, 'Tablets', '2026-11', 20),
        ('ORS Sachet', 'Electrolyte / Dehydration', 150, 'Packs', '2027-08', 40),
        ('Betadine Ointment', 'Antiseptic', 35, 'Tubes', '2026-10', 15),
        ('Azithromycin 500mg', 'Antibiotic', 40, 'Tablets', '2026-08', 15),
        ('Bandage Roll (Cotton)', 'First Aid', 75, 'Rolls', '2028-01', 25),
        ('Dextromethorphan Syrup', 'Cough Syrup', 28, 'Bottles', '2026-07', 10),
        ('Volini Pain Spray', 'Pain Relief', 22, 'Cans', '2027-01', 10),
        ('Vitamin C Chewable', 'Supplements', 110, 'Tablets', '2027-05', 30)
    ON CONFLICT (name) DO UPDATE 
    SET stock = EXCLUDED.stock,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        expiry = EXCLUDED.expiry;

    -- =========================================================================
    -- 9. SEED CAMPUS EMERGENCY CONTACTS
    -- =========================================================================
    INSERT INTO public.emergency_contacts (name, phone, available, location) VALUES
        ('DTU Health Center Emergency', '011-27871018', '24/7', 'Near Admin Block'),
        ('Government Ambulance Service', '102 / 112', '24/7', 'Delhi Central Dispatch'),
        ('DTU Main Gate Security Post', '011-27871024', '24/7', 'Main Gate No. 1'),
        ('Nearest Govt Hospital (BJRM Jahangirpuri)', '011-27192222', '24/7', 'Jahangirpuri, Delhi'),
        ('Rohini Sector 16 Police Station', '100 / 112', '24/7', 'Rohini, Delhi')
    ON CONFLICT (name) DO NOTHING;

    -- =========================================================================
    -- 10. SEED CAMPUS HEALTH TIPS & WELLNESS ARTICLES
    -- =========================================================================
    INSERT INTO public.health_tips (title, content, author, category) VALUES
        (
            'Beat the Exam Season Stress',
            'Practice deep breathing and 7 hours of consistent sleep during exams. Visit DTU Counseling center if feeling overwhelmed.',
            'Dr. Aditi Bansal (Clinical Psychologist)',
            'Mental Health'
        ),
        (
            'Preventing Seasonal Viral & Flu on Campus',
            'Wash hands regularly before eating at college canteen, drink clean water and avoid sudden exposure to severe air pollution without masks.',
            'Dr. Ravi Bansal (General Physician)',
            'General Wellness'
        ),
        (
            'Posture Health for Coding & Long Lab Hours',
            'Keep your laptop screen at eye level and take a 5-minute walking stretch every 45 minutes to protect your cervical spine and lower back.',
            'Dr. Subodh Mor (Sports Medicine / MPT)',
            'Ergonomics'
        ),
        (
            'Healthy Hydration in Hostels',
            'Drink at least 2.5 to 3 liters of purified water daily. Use hostel RO dispensers and keep water bottles sanitised.',
            'DTU Health Team',
            'Lifestyle'
        )
    ON CONFLICT (title) DO NOTHING;

END $$;
