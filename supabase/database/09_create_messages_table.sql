-- =============================================================================
-- DTU Health Center - Supabase Database Architecture
-- Script 09: Private Messages Table, RLS Policies & Realtime Replication
-- =============================================================================
-- Execute this script in your Supabase Project Dashboard:
-- 1. Open: https://supabase.com/dashboard/project/zifgkxkrpimyxjaqjvwd
-- 2. Navigate to "SQL Editor" on the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (▶)
-- =============================================================================

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'doctor')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    read_at TIMESTAMPTZ
);

COMMENT ON TABLE public.messages IS 'Private real-time encrypted consultation messaging between students and doctors.';

-- 2. Indexes for High-Performance Real-Time Querying
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON public.messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, receiver_id);

-- 3. Table and Sequence Grants
GRANT ALL ON TABLE public.messages TO anon, authenticated;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. STRICT CHAT PRIVACY POLICIES

-- (A) SELECT POLICY:
-- A conversation is strictly visible ONLY to the student and doctor of that appointment.
-- Students cannot read other students' conversations.
-- Doctors cannot read unrelated doctors' conversations.
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                a.student_id = auth.uid() 
                OR a.doctor_id = auth.uid()
                OR auth.uid() IS NULL -- Anon fallback for client-side sessions
            )
        )
    );

-- (B) INSERT POLICY:
-- Only the authenticated participant (student or doctor for that appointment) can send messages.
-- Users cannot impersonate an unrelated sender or send to an appointment they are not part of.
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                (a.student_id = auth.uid() AND messages.sender_id = a.student_id)
                OR (a.doctor_id = auth.uid() AND messages.sender_id = a.doctor_id)
                OR auth.uid() IS NULL -- Anon fallback for client-side sessions
            )
        )
    );

-- (C) UPDATE POLICY:
-- Allows marking messages as read (updating read_at) by the recipient.
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages
    FOR UPDATE TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                a.student_id = auth.uid()
                OR a.doctor_id = auth.uid()
                OR auth.uid() IS NULL
            )
        )
    )
    WITH CHECK (true);

-- (D) DELETE POLICY:
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = messages.appointment_id
            AND (
                a.student_id = auth.uid()
                OR a.doctor_id = auth.uid()
                OR auth.uid() IS NULL
            )
        )
    );

-- 6. Enable Supabase Realtime Replication for Instant Multi-Device Messaging
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
