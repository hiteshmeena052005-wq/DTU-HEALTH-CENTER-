-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 06: Baseline Seed Data & Reference Lookups
-- =============================================================================
-- Description: Populates clinical departments, dispensary pharmacy inventory,
--              emergency campus directory, and wellness articles matching the
--              exact frontend datasets from the DTU Health Center project.
-- Execution Order: 6 of 6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed Medical Departments (Matching departments in js/data.js)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. Seed Medicine Inventory (Matching medicines in js/data.js)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. Seed Campus Emergency Contacts Directory (Matching js/data.js)
-- -----------------------------------------------------------------------------
INSERT INTO public.emergency_contacts (name, phone, available, location) VALUES
    ('DTU Health Center Emergency', '011-27871018', '24/7', 'Near Admin Block'),
    ('Government Ambulance Service', '102 / 112', '24/7', 'Delhi Central Dispatch'),
    ('DTU Main Gate Security Post', '011-27871024', '24/7', 'Main Gate No. 1'),
    ('Nearest Govt Hospital (BJRM Jahangirpuri)', '011-27192222', '24/7', 'Jahangirpuri, Delhi'),
    ('Rohini Sector 16 Police Station', '100 / 112', '24/7', 'Rohini, Delhi')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Seed Campus Health Tips & Articles (Matching healthTips in js/data.js)
-- -----------------------------------------------------------------------------
INSERT INTO public.health_tips (title, content, author, category) VALUES
    (
        'Beat the Exam Season Stress',
        'Practice deep breathing and 7 hours of consistent sleep during exams. Visit DTU Counseling center if feeling overwhelmed.',
        'Dr. Sunita Gupta (Psychiatry)',
        'Mental Health'
    ),
    (
        'Preventing Seasonal Viral & Flu on Campus',
        'Wash hands regularly before eating at college canteen, drink clean water and avoid sudden exposure to severe air pollution without masks.',
        'Dr. Rajesh Sharma (General Medicine)',
        'General Wellness'
    ),
    (
        'Posture Health for Coding & Long Lab Hours',
        'Keep your laptop screen at eye level and take a 5-minute walking stretch every 45 minutes to protect your cervical spine and lower back.',
        'Dr. Amit Kumar (Orthopedic)',
        'Ergonomics'
    ),
    (
        'Healthy Hydration in Hostels',
        'Drink at least 2.5 to 3 liters of purified water daily. Use hostel RO dispensers and keep water bottles sanitised.',
        'DTU Health Team',
        'Lifestyle'
    )
ON CONFLICT (title) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Helper Procedure for Admin: Authorize and Provision a Doctor Record
-- -----------------------------------------------------------------------------
-- The Project Owner can execute this function in the Supabase SQL Editor or via
-- the service_role key to link an existing Supabase Auth user as an authorized DTU doctor.
-- SECURITY RESTRICTION: Revoked from PUBLIC, anon, and authenticated roles.
CREATE OR REPLACE FUNCTION public.admin_assign_doctor_role(
    p_user_email TEXT,
    p_department_name TEXT,
    p_qualification TEXT,
    p_experience TEXT,
    p_phone TEXT,
    p_photo TEXT DEFAULT '👨‍⚕️'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_dept_id BIGINT;
BEGIN
    -- Security Enforcement: Allow execution ONLY by database superusers (Supabase SQL Editor),
    -- service_role key, or verified database administrators.
    IF current_user NOT IN ('postgres', 'supabase_admin')
       AND COALESCE(auth.role(), '') IS DISTINCT FROM 'service_role'
       AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: Only authorized database administrators or service_role can provision doctor roles.';
    END IF;

    -- 1. Locate auth user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(TRIM(p_user_email));
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % does not exist in Supabase Auth. Create user first in Auth dashboard.', p_user_email;
    END IF;

    -- 2. Locate department id
    SELECT id INTO v_dept_id FROM public.departments WHERE name = p_department_name;
    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Department % does not exist. Check public.departments.', p_department_name;
    END IF;

    -- 3. Upgrade user role to doctor in profiles
    UPDATE public.profiles
    SET role = 'doctor'
    WHERE id = v_user_id;

    -- 4. Create or update doctor record
    INSERT INTO public.doctors (
        id,
        department_id,
        department_name,
        qualification,
        experience,
        photo,
        phone,
        is_available
    ) VALUES (
        v_user_id,
        v_dept_id,
        p_department_name,
        p_qualification,
        p_experience,
        p_photo,
        p_phone,
        true
    ) ON CONFLICT (id) DO UPDATE 
    SET department_id = EXCLUDED.department_id,
        department_name = EXCLUDED.department_name,
        qualification = EXCLUDED.qualification,
        experience = EXCLUDED.experience,
        phone = EXCLUDED.phone;
END;
$$;

-- Restrict execution permissions strictly to postgres superuser and service_role; revoke from public, anon, and authenticated
REVOKE ALL ON FUNCTION public.admin_assign_doctor_role(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_doctor_role(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO postgres, service_role;

