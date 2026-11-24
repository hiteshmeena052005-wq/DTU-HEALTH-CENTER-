-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 09: Private Messages Table, Bulletproof RLS & Doctor Auth Provisioning
-- =============================================================================
-- Execute this script in your Supabase Project Dashboard:
-- 1. Open: https://supabase.com/dashboard/project/zifgkxkrpimyxjaqjvwd
-- 2. Navigate to "SQL Editor" on the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (▶)
-- =============================================================================

-- Ensure pgcrypto extension is active for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Create Messages Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'doctor')),
    message_text TEXT NOT NULL CHECK (char_length(trim(message_text)) > 0 AND char_length(message_text) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    read_at TIMESTAMPTZ
);

COMMENT ON TABLE public.messages IS 'Private real-time consultation messaging strictly restricted to verified appointment participants.';

-- -----------------------------------------------------------------------------
-- 2. Performance Indexes for Real-Time Querying
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON public.messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read_at) WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Table Permissions & Grants
-- -----------------------------------------------------------------------------
-- In accordance with strict security requirements:
-- Anonymous access is completely REVOKED.
-- Only verified authenticated users can interact with messages.
REVOKE ALL ON TABLE public.messages FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Bulletproof Row Level Security Policies
-- -----------------------------------------------------------------------------

-- (A) SELECT POLICY:
-- A conversation is visible ONLY to the authenticated student and doctor of that appointment.
-- Students cannot read other students' conversations.
-- Doctors cannot read unrelated doctors' conversations.
-- Anonymous access is strictly denied.
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                a.student_id = auth.uid() 
                OR a.doctor_id = auth.uid()
            )
        )
    );

-- (B) INSERT POLICY:
-- Validates that:
-- 1. The sender is the authenticated user (sender_id = auth.uid()).
-- 2. The appointment exists.
-- 3. If sender is student: sender_id matches a.student_id, receiver_id matches a.doctor_id, sender_role = 'student'.
-- 4. If sender is doctor: sender_id matches a.doctor_id, receiver_id matches a.student_id, sender_role = 'doctor'.
-- Impersonation or cross-appointment insertion is completely blocked.
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        messages.sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                (
                    a.student_id = auth.uid() 
                    AND messages.receiver_id = a.doctor_id 
                    AND messages.sender_role = 'student'
                )
                OR 
                (
                    a.doctor_id = auth.uid() 
                    AND messages.receiver_id = a.student_id 
                    AND messages.sender_role = 'doctor'
                )
            )
        )
    );

-- (C) UPDATE POLICY:
-- Only allow the intended recipient to update message status (marking read_at).
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages
    FOR UPDATE TO authenticated
    USING (
        receiver_id = auth.uid()
    )
    WITH CHECK (
        receiver_id = auth.uid()
    );

-- (D) DELETE POLICY:
-- Consultations are permanent medical records. Neither students nor doctors can delete messages.
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE TO authenticated
    USING (false);

-- -----------------------------------------------------------------------------
-- 6. Tamper-Proof Trigger on UPDATE
-- -----------------------------------------------------------------------------
-- Ensures that callers cannot modify existing message text, timestamps,
-- appointment relationships, or sender/receiver identity during an UPDATE.
CREATE OR REPLACE FUNCTION public.validate_message_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify that only the recipient can perform an update
    IF auth.uid() IS NOT NULL AND auth.uid() != OLD.receiver_id THEN
        RAISE EXCEPTION 'Security Violation: Only the intended recipient can update message status.';
    END IF;

    -- Enforce immutability of all message attributes except read_at
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
       OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
       OR NEW.sender_role IS DISTINCT FROM OLD.sender_role
       OR NEW.message_text IS DISTINCT FROM OLD.message_text
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Security Violation: Message content, participants, and metadata are immutable. Only read_at may be updated.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_message_update ON public.messages;
CREATE TRIGGER trg_validate_message_update
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.validate_message_update();

-- -----------------------------------------------------------------------------
-- 7. Provision Official Doctor Accounts in auth.users and auth.identities
-- -----------------------------------------------------------------------------
-- Resolves the HTTP 500 "Database error querying schema" and GoTrue identity issues.
-- Correctly handles provider_id, id, and pgcrypto password hashing.
DO $$
DECLARE
    doc RECORD;
    v_user_id UUID;
    v_exists BOOLEAN;
    v_has_identity BOOLEAN;
BEGIN
    FOR doc IN 
        SELECT * FROM (
            VALUES 
            ('d0000000-0000-0000-0000-000000000001'::uuid, 'dr.ravibansal@dtu.ac.in', 'Dr. Ravi Bansal'),
            ('d0000000-0000-0000-0000-000000000002'::uuid, 'dr.rajeshsinghai@dtu.ac.in', 'Dr. Rajesh Singhai'),
            ('d0000000-0000-0000-0000-000000000003'::uuid, 'dr.arpanabansal@dtu.ac.in', 'Dr. Arpana Bansal'),
            ('d0000000-0000-0000-0000-000000000004'::uuid, 'dr.bharatsethi@dtu.ac.in', 'Dr. Bharat Sethi'),
            ('d0000000-0000-0000-0000-000000000005'::uuid, 'dr.subodhmor@dtu.ac.in', 'Dr. Subodh Mor'),
            ('d0000000-0000-0000-0000-000000000006'::uuid, 'dr.dineshbansal@dtu.ac.in', 'Dr. Dinesh Bansal'),
            ('d0000000-0000-0000-0000-000000000007'::uuid, 'dr.gauravgupta@dtu.ac.in', 'Dr. Gaurav Gupta'),
            ('d0000000-0000-0000-0000-000000000008'::uuid, 'dr.nishajha@dtu.ac.in', 'Dr. Nisha Jha'),
            ('d0000000-0000-0000-0000-000000000009'::uuid, 'dr.mohitgulia@dtu.ac.in', 'Dr. Mohit Gulia'),
            ('d0000000-0000-0000-0000-000000000010'::uuid, 'dr.aditibansal@dtu.ac.in', 'Dr. Aditi Bansal')
        ) AS t(id, email, name)
    LOOP
        -- Check if user already exists in auth.users
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = lower(doc.email)) INTO v_exists;

        IF v_exists THEN
            UPDATE auth.users 
            SET encrypted_password = extensions.crypt('doctor123', extensions.gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
                raw_user_meta_data = jsonb_build_object('role', 'doctor', 'name', doc.name, 'full_name', doc.name),
                updated_at = now()
            WHERE lower(email) = lower(doc.email)
            RETURNING id INTO v_user_id;
        ELSE
            v_user_id := doc.id;
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                v_user_id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                lower(doc.email),
                extensions.crypt('doctor123', extensions.gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('role', 'doctor', 'name', doc.name, 'full_name', doc.name),
                now(),
                now()
            );
        END IF;

        -- Check and insert GoTrue identity (handling both old and new GoTrue schemas)
        SELECT EXISTS(SELECT 1 FROM auth.identities WHERE user_id = v_user_id) INTO v_has_identity;
        IF NOT v_has_identity THEN
            BEGIN
                -- Modern Supabase GoTrue schema (requires provider_id, id as UUID)
                INSERT INTO auth.identities (
                    id,
                    provider_id,
                    user_id,
                    identity_data,
                    provider,
                    last_sign_in_at,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    v_user_id::text,
                    v_user_id,
                    jsonb_build_object('sub', v_user_id::text, 'email', lower(doc.email)),
                    'email',
                    now(),
                    now(),
                    now()
                );
            EXCEPTION WHEN OTHERS THEN
                -- Fallback for legacy GoTrue schema (where id is provider_id text)
                BEGIN
                    INSERT INTO auth.identities (
                        provider_id,
                        user_id,
                        identity_data,
                        provider,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_user_id::text,
                        v_user_id,
                        jsonb_build_object('sub', v_user_id::text, 'email', lower(doc.email)),
                        'email',
                        now(),
                        now(),
                        now()
                    );
                EXCEPTION WHEN OTHERS THEN
                    NULL; -- Identity already present or managed by trigger
                END;
            END;
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 8. Enable Supabase Realtime Replication
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
