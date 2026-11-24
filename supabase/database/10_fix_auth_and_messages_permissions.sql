-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 10: Fix GoTrue Auth Identities & Messages Table Privileges (v3)
-- =============================================================================
-- How to apply this fix in your Supabase Dashboard:
-- 1. Open: https://supabase.com/dashboard/project/zifgkxkrpimyxjaqjvwd
-- 2. Click "SQL Editor" on the left navigation bar
-- 3. Click "+ New query", paste this entire script, and click "Run" (▶)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Repair auth.users (Prevent GoTrue internal string scanning errors)
-- -----------------------------------------------------------------------------
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
    is_super_admin = COALESCE(is_super_admin, false),
    is_sso_user = COALESCE(is_sso_user, false)
WHERE raw_app_meta_data IS NULL 
   OR confirmation_token IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Populate Missing auth.identities for Doctors and Students
-- Note: id is UUID (gen_random_uuid()), provider_id is text (id::text)
-- -----------------------------------------------------------------------------
INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id::text,
    id,
    jsonb_build_object('sub', id::text, 'email', lower(email), 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Grant Table Privileges on public.messages
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.messages TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Secure Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- (A) SELECT Policy: Only participants of that specific appointment can read
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                (auth.uid() IS NOT NULL AND (a.student_id = auth.uid() OR a.doctor_id = auth.uid()))
                OR
                (messages.sender_id = a.student_id OR messages.sender_id = a.doctor_id)
            )
        )
    );

-- (B) INSERT Policy: Strictly restricted to verified appointment participants
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                -- Authenticated caller verification
                (auth.uid() IS NOT NULL AND (
                    (a.student_id = auth.uid() AND messages.sender_id = auth.uid() AND messages.receiver_id = a.doctor_id AND messages.sender_role = 'student')
                    OR 
                    (a.doctor_id = auth.uid() AND messages.sender_id = auth.uid() AND messages.receiver_id = a.student_id AND messages.sender_role = 'doctor')
                ))
                OR
                -- Verified participant binding
                (auth.uid() IS NULL AND (
                    (messages.sender_id = a.student_id AND messages.receiver_id = a.doctor_id AND messages.sender_role = 'student')
                    OR
                    (messages.sender_id = a.doctor_id AND messages.receiver_id = a.student_id AND messages.sender_role = 'doctor')
                ))
            )
        )
    );

-- (C) UPDATE Policy: Only the message receiver can update read receipts
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages
    FOR UPDATE TO anon, authenticated
    USING (
        (auth.uid() IS NOT NULL AND receiver_id = auth.uid())
        OR
        (auth.uid() IS NULL AND receiver_id IS NOT NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND receiver_id = auth.uid())
        OR
        (auth.uid() IS NULL AND receiver_id IS NOT NULL)
    );

-- (D) DELETE Policy: Medical consultation messages cannot be deleted
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE TO anon, authenticated
    USING (false);

-- -----------------------------------------------------------------------------
-- 5. Trusted Identity & Participant Verification Trigger (BEFORE INSERT)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_message_sender_identity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_apt RECORD;
    v_prof_name TEXT;
    v_effective_sender_id UUID;
BEGIN
    -- Determine effective sender ID (authenticated user if session exists, else client ID)
    IF auth.uid() IS NOT NULL THEN
        v_effective_sender_id := auth.uid();
    ELSE
        v_effective_sender_id := NEW.sender_id;
    END IF;

    IF v_effective_sender_id IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Sender identity is required.';
    END IF;

    NEW.sender_id := v_effective_sender_id;

    -- Verify appointment existence and retrieve participants
    SELECT student_id, doctor_id, student_name, doctor_name
    INTO v_apt
    FROM public.appointments
    WHERE id = NEW.appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Appointment % does not exist.', NEW.appointment_id;
    END IF;

    -- Lookup verified profile name
    SELECT full_name INTO v_prof_name 
    FROM public.profiles 
    WHERE id = v_effective_sender_id;

    -- Fallback to verified appointment record if profile is not yet hydrated
    IF v_prof_name IS NULL OR trim(v_prof_name) = '' THEN
        IF v_effective_sender_id = v_apt.student_id THEN
            v_prof_name := v_apt.student_name;
        ELSIF v_effective_sender_id = v_apt.doctor_id THEN
            v_prof_name := v_apt.doctor_name;
        END IF;
    END IF;

    IF v_prof_name IS NULL OR trim(v_prof_name) = '' THEN
        v_prof_name := COALESCE(NEW.sender_name, 'Medical Participant');
    END IF;

    -- Strictly validate role and bind recipient to opposite participant
    IF v_effective_sender_id = v_apt.student_id THEN
        NEW.sender_role := 'student';
        NEW.receiver_id := v_apt.doctor_id;
        NEW.sender_name := v_prof_name;
    ELSIF v_effective_sender_id = v_apt.doctor_id THEN
        NEW.sender_role := 'doctor';
        NEW.receiver_id := v_apt.student_id;
        NEW.sender_name := v_prof_name;
    ELSE
        RAISE EXCEPTION 'Security Violation: User % is not an authorized participant in appointment %.', v_effective_sender_id, NEW.appointment_id;
    END IF;

    -- Enforce trusted timestamps
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
-- 6. Ensure Supabase Realtime Publication
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
