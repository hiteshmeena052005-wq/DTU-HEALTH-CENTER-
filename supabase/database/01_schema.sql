-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 01: Extensions, Enums & Custom Domain Types
-- =============================================================================
-- Description: Sets up essential cryptographic and utility PostgreSQL extensions,
--              defines enumerated data types, and validates the schema namespace.
-- Execution Order: 1 of 6
-- =============================================================================

-- Ensure required PostgreSQL extensions are active in the 'extensions' schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Role & Access Control Types
-- -----------------------------------------------------------------------------
-- Core system roles. Public registration defaults strictly to 'student'.
-- 'doctor' and 'admin' roles can only be granted via the Supabase Dashboard.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('student', 'doctor', 'admin');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Medical & Clinical Enumerated Types
-- -----------------------------------------------------------------------------
-- Standard human ABO and Rh blood groups matching frontend student profile
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blood_group_type') THEN
        CREATE TYPE public.blood_group_type AS ENUM (
            'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
        );
    END IF;
END $$;

-- Consultation delivery modes matching book-appointment.html
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_mode') THEN
        CREATE TYPE public.consultation_mode AS ENUM (
            'Physical OPD Visit (Health Center)',
            'Online Video Consultation'
        );
    END IF;
END $$;

-- Clinical urgency classification matching triage in booking and queue
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_urgency') THEN
        CREATE TYPE public.appointment_urgency AS ENUM (
            'Normal / Routine',
            'Urgent / High Severity'
        );
    END IF;
END $$;

-- Appointment lifecycle statuses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE public.appointment_status AS ENUM (
            'confirmed',
            'completed',
            'cancelled'
        );
    END IF;
END $$;

-- Inter-department referral urgency priority matching referral.html
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_priority') THEN
        CREATE TYPE public.referral_priority AS ENUM (
            'Routine OPD Referral',
            'Semi-Urgent (Within 24 Hours)',
            'Immediate Priority Attention'
        );
    END IF;
END $$;

-- Referral consultation lifecycle statuses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
        CREATE TYPE public.referral_status AS ENUM (
            'Pending Consultation',
            'Consultation Completed',
            'Cancelled'
        );
    END IF;
END $$;

-- Campus emergency SOS dispatch statuses matching emergency.html
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emergency_status') THEN
        CREATE TYPE public.emergency_status AS ENUM (
            'Triggered',
            'Dispatched',
            'Resolved'
        );
    END IF;
END $$;

-- Campus health wellness categories matching health-tips.html
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tip_category') THEN
        CREATE TYPE public.tip_category AS ENUM (
            'General Wellness',
            'Mental Health',
            'Ergonomics',
            'Lifestyle'
        );
    END IF;
END $$;

-- Campus broadcast notice types matching doctor-dashboard.html & student-dashboard.html
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_type') THEN
        CREATE TYPE public.notice_type AS ENUM (
            'announcement',
            'advisory',
            'vaccination_drive',
            'alert'
        );
    END IF;
END $$;

-- Longitudinal medical record encounter types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_record_type') THEN
        CREATE TYPE public.patient_record_type AS ENUM (
            'Consultation',
            'Vaccination',
            'Emergency',
            'Referral',
            'Lab Test',
            'General'
        );
    END IF;
END $$;
