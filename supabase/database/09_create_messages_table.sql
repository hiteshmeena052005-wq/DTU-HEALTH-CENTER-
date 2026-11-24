-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 09: Private Messages Table, Hardened RLS & Server-Verified Identity
-- =============================================================================
-- Execute this script in your Supabase Project Dashboard:
-- 1. Open: https://supabase.com/dashboard/project/zifgkxkrpimyxjaqjvwd
-- 2. Navigate to "SQL Editor" on the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (▶)
-- =============================================================================
-- Note: This migration strictly creates and hardens the private messaging
-- infrastructure. It does NOT modify auth.users, auth.identities, or passwords.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Messages Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- Anonymous access is completely REVOKED.
-- Only verified authenticated users can interact with messages.
REVOKE ALL ON TABLE public.messages FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security Policies
-- -----------------------------------------------------------------------------

-- (A) SELECT POLICY:
-- A conversation is visible ONLY to the two verified participants of that appointment.
-- Students cannot read other students' conversations.
-- Doctors cannot read unrelated doctors' conversations.
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
-- Enforces that:
-- 1. sender_id matches auth.uid().
-- 2. The appointment exists.
-- 3. The sender belongs to the appointment and receiver is the other participant.
-- 4. The sender role matches the participant's actual role in the appointment.
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
-- Only the intended recipient can update message status (marking read_at).
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
-- Consultations are permanent medical records. Deletion is forbidden.
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE TO authenticated
    USING (false);

-- -----------------------------------------------------------------------------
-- 6. Trusted Identity & Participation Verification Trigger (BEFORE INSERT)
-- -----------------------------------------------------------------------------
-- Ensures sender identity, roles, and recipient are derived and validated
-- from verified database relationships rather than trusting browser payloads.
CREATE OR REPLACE FUNCTION public.set_message_sender_identity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_apt RECORD;
    v_prof_name TEXT;
BEGIN
    -- Verify caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Anonymous users cannot send messages.';
    END IF;

    -- Force sender_id to authenticated caller
    NEW.sender_id := auth.uid();

    -- Retrieve verified appointment participants
    SELECT student_id, doctor_id
    INTO v_apt
    FROM public.appointments
    WHERE id = NEW.appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Appointment % does not exist.', NEW.appointment_id;
    END IF;

    -- Retrieve sender profile name strictly from verified public.profiles
    SELECT full_name INTO v_prof_name 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_prof_name IS NULL OR trim(v_prof_name) = '' THEN
        RAISE EXCEPTION 'Security Violation: Verified user profile not found for user %. Message rejected.', auth.uid();
    END IF;

    -- Strictly validate role and bind recipient to opposite participant
    IF auth.uid() = v_apt.student_id THEN
        NEW.sender_role := 'student';
        NEW.receiver_id := v_apt.doctor_id;
        NEW.sender_name := v_prof_name;
    ELSIF auth.uid() = v_apt.doctor_id THEN
        NEW.sender_role := 'doctor';
        NEW.receiver_id := v_apt.student_id;
        NEW.sender_name := v_prof_name;
    ELSE
        RAISE EXCEPTION 'Security Violation: User % is not an authorized participant in appointment %.', auth.uid(), NEW.appointment_id;
    END IF;

    -- Force trusted timestamps
    NEW.created_at := timezone('utc'::text, now());
    NEW.read_at := NULL;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_sender_identity ON public.messages;
CREATE TRIGGER trg_set_message_sender_identity
    BEFORE INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.set_message_sender_identity();

-- -----------------------------------------------------------------------------
-- 7. Tamper-Proof Trigger on UPDATE (BEFORE UPDATE)
-- -----------------------------------------------------------------------------
-- Ensures message content, timestamps, participants, and foreign keys cannot
-- be modified. Only the recipient may update read_at, and cannot clear it.
CREATE OR REPLACE FUNCTION public.validate_message_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Reject update if caller is unauthenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Anonymous users cannot update messages.';
    END IF;

    -- Verify caller is the intended recipient
    IF auth.uid() != OLD.receiver_id THEN
        RAISE EXCEPTION 'Security Violation: Only the intended recipient can update message status.';
    END IF;

    -- Recipient cannot clear an existing read receipt
    IF OLD.read_at IS NOT NULL AND NEW.read_at IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Cannot clear an existing read receipt.';
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
-- 8. Enable Supabase Realtime Replication
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
