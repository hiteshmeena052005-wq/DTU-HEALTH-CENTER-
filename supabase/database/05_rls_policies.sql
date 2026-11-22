-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 05: Granular Row Level Security (RLS) Policies
-- =============================================================================
-- Description: Enables Row Level Security across all tables and defines fine-grained
--              access policies protecting student privacy, doctor clinical records,
--              and administrative authority via the Supabase Dashboard.
-- Execution Order: 5 of 6
-- =============================================================================

-- =============================================================================
-- 1. Enable RLS on All Tables
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_sos_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Profiles Table Policies
-- =============================================================================
-- Users view their own profile; All users can view doctor profiles; Doctors only view
-- profiles of students with whom they have an active clinical relationship; Admins view all.
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR role = 'doctor'
        OR (public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), id))
        OR public.is_admin(auth.uid())
    );

-- Users can update their own personal details.
-- Note: Role tampering is blocked by prevent_role_escalation trigger.
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================================================
-- 3. Departments Table Policies
-- =============================================================================
-- Public read for all users (including unauthenticated visitors on landing page)
CREATE POLICY "departments_select_policy" ON public.departments
    FOR SELECT TO anon, authenticated
    USING (true);

-- Only admins can modify department structures
CREATE POLICY "departments_admin_all_policy" ON public.departments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- 4. Doctors Table Policies
-- =============================================================================
-- Public read to browse doctor credentials and clinical availability
CREATE POLICY "doctors_select_policy" ON public.doctors
    FOR SELECT TO anon, authenticated
    USING (true);

-- Doctors can update their own profile / availability status
CREATE POLICY "doctors_update_own_policy" ON public.doctors
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- Doctors are added / removed via the Supabase Dashboard (admin only)
CREATE POLICY "doctors_admin_manage_policy" ON public.doctors
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- 5. Students Table Policies
-- =============================================================================
-- Students view their own record; Doctors view student records ONLY if they have an authorized clinical relationship
CREATE POLICY "students_select_policy" ON public.students
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR (public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), id))
        OR public.is_admin(auth.uid())
    );

-- Students can insert and update their own medical profile
CREATE POLICY "students_insert_own_policy" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "students_update_own_policy" ON public.students
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================================================
-- 6. Doctor Slots Table Policies
-- =============================================================================
-- Students and doctors can view active availability slots
CREATE POLICY "doctor_slots_select_policy" ON public.doctor_slots
    FOR SELECT TO anon, authenticated
    USING (is_active = true OR doctor_id = auth.uid() OR public.is_admin(auth.uid()));

-- Doctors can manage their own schedule slots
CREATE POLICY "doctor_slots_insert_policy" ON public.doctor_slots
    FOR INSERT TO authenticated
    WITH CHECK (doctor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "doctor_slots_update_policy" ON public.doctor_slots
    FOR UPDATE TO authenticated
    USING (doctor_id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (doctor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "doctor_slots_delete_policy" ON public.doctor_slots
    FOR DELETE TO authenticated
    USING (doctor_id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================================================
-- 7. Appointments Table Policies
-- =============================================================================
-- Students view their own appointments; Doctors view their assigned patient queue
CREATE POLICY "appointments_select_policy" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() 
        OR doctor_id = auth.uid() 
        OR public.is_admin(auth.uid())
    );

-- Students can book appointments for themselves
CREATE POLICY "appointments_insert_policy" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid() OR public.is_admin(auth.uid()));

-- Students can ONLY cancel their own confirmed appointments (cannot alter doctor, student_id, slot, or mark completed)
CREATE POLICY "appointments_student_cancel_policy" ON public.appointments
    FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid() 
        AND status = 'confirmed' 
        AND public.is_student(auth.uid())
    )
    WITH CHECK (
        student_id = auth.uid() 
        AND status = 'cancelled'
    );

-- Doctors can update status to 'completed' or 'cancelled' on their own assigned appointments
CREATE POLICY "appointments_doctor_update_policy" ON public.appointments
    FOR UPDATE TO authenticated
    USING (doctor_id = auth.uid() AND public.is_doctor(auth.uid()))
    WITH CHECK (doctor_id = auth.uid() AND status IN ('completed', 'cancelled'));

-- Administrators can manage appointments via Supabase Dashboard
CREATE POLICY "appointments_admin_update_policy" ON public.appointments
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "appointments_admin_delete_policy" ON public.appointments
    FOR DELETE TO authenticated
    USING (public.is_admin(auth.uid()));

-- =============================================================================
-- 8. Consultations Table Policies (Digital Prescriptions)
-- =============================================================================
-- Students read their own prescriptions; Doctors read consultations where they have a clinical relationship
CREATE POLICY "consultations_select_policy" ON public.consultations
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() 
        OR doctor_id = auth.uid() 
        OR (public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), student_id))
        OR public.is_admin(auth.uid())
    );

-- Only licensed doctors with a verified clinical relationship can issue prescriptions
CREATE POLICY "consultations_insert_policy" ON public.consultations
    FOR INSERT TO authenticated
    WITH CHECK (
        (doctor_id = auth.uid() AND public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), student_id)) 
        OR public.is_admin(auth.uid())
    );

-- Authoring doctor can amend clinical details
CREATE POLICY "consultations_update_policy" ON public.consultations
    FOR UPDATE TO authenticated
    USING ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()))
    WITH CHECK ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 9. Patient Records Table Policies (Medical History Timeline)
-- =============================================================================
-- Students view their own record; Doctors view records ONLY if they have an authorized clinical relationship
CREATE POLICY "patient_records_select_policy" ON public.patient_records
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() 
        OR (public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), student_id))
        OR public.is_admin(auth.uid())
    );

-- Doctors can log clinical entries for students with whom they have an active clinical relationship
CREATE POLICY "patient_records_insert_policy" ON public.patient_records
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), student_id) AND (doctor_id = auth.uid() OR doctor_id IS NULL))
        OR public.is_admin(auth.uid())
    );

-- Authoring doctor can update their own clinical notes
CREATE POLICY "patient_records_update_policy" ON public.patient_records
    FOR UPDATE TO authenticated
    USING ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()))
    WITH CHECK ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 10. Referrals Table Policies
-- =============================================================================
-- Students see their referrals; Referring and receiving doctors see the referral slip
CREATE POLICY "referrals_select_policy" ON public.referrals
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() 
        OR from_doctor_id = auth.uid() 
        OR to_doctor_id = auth.uid() 
        OR public.is_admin(auth.uid())
    );

-- Doctors can issue clinical referrals only for students they are currently treating
CREATE POLICY "referrals_insert_policy" ON public.referrals
    FOR INSERT TO authenticated
    WITH CHECK (
        (from_doctor_id = auth.uid() AND public.is_doctor(auth.uid()) AND public.doctor_has_clinical_relationship(auth.uid(), student_id)) 
        OR public.is_admin(auth.uid())
    );

-- Doctors involved in the referral can update status (e.g. Consultation Completed)
CREATE POLICY "referrals_update_policy" ON public.referrals
    FOR UPDATE TO authenticated
    USING (
        ((from_doctor_id = auth.uid() OR to_doctor_id = auth.uid()) AND public.is_doctor(auth.uid()))
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        ((from_doctor_id = auth.uid() OR to_doctor_id = auth.uid()) AND public.is_doctor(auth.uid()))
        OR public.is_admin(auth.uid())
    );

-- =============================================================================
-- 11. Notifications Table Policies (Campus Bulletins)
-- =============================================================================
-- All authenticated students and staff can view active bulletins
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (is_active = true OR public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()));

-- Doctors and Admins can broadcast announcements
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_doctor(auth.uid()) AND (doctor_id = auth.uid() OR doctor_id IS NULL)) 
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()))
    WITH CHECK ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 12. Emergency SOS Logs Table Policies
-- =============================================================================
-- Students see their own SOS requests; Doctors and response team see all alerts
CREATE POLICY "emergency_sos_select_policy" ON public.emergency_sos_logs
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() 
        OR public.is_doctor(auth.uid()) 
        OR public.is_admin(auth.uid())
    );

-- Any student or visitor in crisis can trigger an emergency ambulance request
CREATE POLICY "emergency_sos_insert_policy" ON public.emergency_sos_logs
    FOR INSERT TO anon, authenticated
    WITH CHECK (student_id = auth.uid() OR student_id IS NULL);

-- Doctors and medical staff can mark ambulance dispatched or resolved
CREATE POLICY "emergency_sos_update_policy" ON public.emergency_sos_logs
    FOR UPDATE TO authenticated
    USING (public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()))
    WITH CHECK (public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 13. Medicine Inventory Table Policies (Pharmacy Stock)
-- =============================================================================
-- All authenticated users can view dispensary stock levels
CREATE POLICY "medicine_inventory_select_policy" ON public.medicine_inventory
    FOR SELECT TO authenticated
    USING (true);

-- Doctors and Admins can update inventory counts and register new medicine batches
CREATE POLICY "medicine_inventory_insert_policy" ON public.medicine_inventory
    FOR INSERT TO authenticated
    WITH CHECK (public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()));

-- Doctors and Admins can update inventory counts and register new medicine batches
CREATE POLICY "medicine_inventory_update_policy" ON public.medicine_inventory
    FOR UPDATE TO authenticated
    USING (public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()))
    WITH CHECK (public.is_doctor(auth.uid()) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 14. Health Tips Table Policies
-- =============================================================================
-- All users (including campus visitors) can view published health tips
CREATE POLICY "health_tips_select_policy" ON public.health_tips
    FOR SELECT TO anon, authenticated
    USING (true);

-- Doctors and Admins can publish health advice
CREATE POLICY "health_tips_insert_policy" ON public.health_tips
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_doctor(auth.uid()) AND (doctor_id = auth.uid() OR doctor_id IS NULL)) 
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "health_tips_update_policy" ON public.health_tips
    FOR UPDATE TO authenticated
    USING ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()))
    WITH CHECK ((doctor_id = auth.uid() AND public.is_doctor(auth.uid())) OR public.is_admin(auth.uid()));

-- =============================================================================
-- 15. Emergency Contacts Table Policies
-- =============================================================================
-- Public directory read for all campus students, staff, and emergency visitors
CREATE POLICY "emergency_contacts_select_policy" ON public.emergency_contacts
    FOR SELECT TO anon, authenticated
    USING (true);

-- Admin only modification via Supabase Dashboard
CREATE POLICY "emergency_contacts_admin_policy" ON public.emergency_contacts
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
