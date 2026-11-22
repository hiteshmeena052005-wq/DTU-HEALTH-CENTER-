-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 03: Referential Relationships & Query Optimization Indexes
-- =============================================================================
-- Description: Establishes specialized high-performance indexes (B-Tree & GIN)
--              covering every frontend query filter, sort order, and foreign key.
-- Execution Order: 3 of 6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profiles & RBAC Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role 
    ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
    ON public.profiles(email);

-- -----------------------------------------------------------------------------
-- 2. Medical Departments & Doctors Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_departments_name 
    ON public.departments(name);

CREATE INDEX IF NOT EXISTS idx_doctors_department_id 
    ON public.doctors(department_id);

CREATE INDEX IF NOT EXISTS idx_doctors_is_available 
    ON public.doctors(is_available);

-- -----------------------------------------------------------------------------
-- 3. Students Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_roll_no 
    ON public.students(roll_no);

CREATE INDEX IF NOT EXISTS idx_students_branch 
    ON public.students(branch);

CREATE INDEX IF NOT EXISTS idx_students_dtu_email 
    ON public.students(dtu_email);

-- -----------------------------------------------------------------------------
-- 4. Doctor Availability Slots Indexes
-- -----------------------------------------------------------------------------
-- Optimizes book-appointment.html slot query filtered by date and active status
CREATE INDEX IF NOT EXISTS idx_doctor_slots_lookup 
    ON public.doctor_slots(doctor_id, date, is_active);

CREATE INDEX IF NOT EXISTS idx_doctor_slots_active_date 
    ON public.doctor_slots(date, is_active);

-- -----------------------------------------------------------------------------
-- 5. Appointments Indexes
-- -----------------------------------------------------------------------------
-- Student dashboard personal appointment timeline
CREATE INDEX IF NOT EXISTS idx_appointments_student_date 
    ON public.appointments(student_id, date DESC);

-- Doctor dashboard live queue ordered by date and urgency
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_queue 
    ON public.appointments(doctor_id, date, urgency, status);

CREATE INDEX IF NOT EXISTS idx_appointments_slot_id 
    ON public.appointments(slot_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
    ON public.appointments(status);

-- -----------------------------------------------------------------------------
-- 6. Consultations (Prescriptions) Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consultations_student_timeline 
    ON public.consultations(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor_history 
    ON public.consultations(doctor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id 
    ON public.consultations(appointment_id);

-- GIN Index on prescribed medicines JSONB array for fast pharmacy queries
CREATE INDEX IF NOT EXISTS idx_consultations_medicines_gin 
    ON public.consultations USING gin(medicines);

-- -----------------------------------------------------------------------------
-- 7. Patient Records Timeline Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_records_student_timeline 
    ON public.patient_records(student_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_records_type 
    ON public.patient_records(record_type);

CREATE INDEX IF NOT EXISTS idx_patient_records_attachments_gin 
    ON public.patient_records USING gin(attachments);

-- -----------------------------------------------------------------------------
-- 8. Referrals Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_referrals_student_history 
    ON public.referrals(student_id, created_at DESC);

-- Referring doctor tracking outbound referrals
CREATE INDEX IF NOT EXISTS idx_referrals_from_doctor 
    ON public.referrals(from_doctor_id, status);

-- Target specialist doctor viewing pending incoming referrals
CREATE INDEX IF NOT EXISTS idx_referrals_to_doctor_queue 
    ON public.referrals(to_doctor_id, status);

-- -----------------------------------------------------------------------------
-- 9. Notifications (Campus Bulletins) Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_feed 
    ON public.notifications(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_doctor_id 
    ON public.notifications(doctor_id);

-- -----------------------------------------------------------------------------
-- 10. Emergency SOS Logs Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_emergency_sos_status 
    ON public.emergency_sos_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_sos_student_id 
    ON public.emergency_sos_logs(student_id);

-- -----------------------------------------------------------------------------
-- 11. Medicine Inventory Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_medicine_inventory_category 
    ON public.medicine_inventory(category);

-- Fast low-stock query (stock <= min_threshold) for pharmacist alerts
CREATE INDEX IF NOT EXISTS idx_medicine_inventory_stock_threshold 
    ON public.medicine_inventory(stock, min_threshold);

-- -----------------------------------------------------------------------------
-- 12. Health Tips Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_health_tips_category 
    ON public.health_tips(category, created_at DESC);
