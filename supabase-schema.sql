-- ==============================================
-- Firefly AI - Supabase Database Schema
-- ==============================================
-- Copy and paste this entire file into the Supabase SQL Editor
-- to create all necessary tables and security policies.
-- ==============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- TASKS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  urgency_score TEXT NOT NULL CHECK (urgency_score IN ('HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Done', 'Stuck', 'Missed')),
  estimated_hours NUMERIC NOT NULL DEFAULT 1,
  immediate_first_step TEXT DEFAULT '',
  actionable_checklist TEXT[] DEFAULT '{}',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON public.tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_urgency ON public.tasks(urgency_score);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks or session-based tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL
  );

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- ==============================================
-- HABITS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed_today BOOLEAN DEFAULT FALSE,
  streak_days INTEGER DEFAULT 0,
  last_completed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_session_id ON public.habits(session_id);
CREATE INDEX IF NOT EXISTS idx_habits_completed_today ON public.habits(completed_today);
CREATE INDEX IF NOT EXISTS idx_habits_created_at ON public.habits(created_at DESC);

-- Auto-update updated_at timestamp for habits
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own habits
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- Policy: Users can insert their own habits
CREATE POLICY "Users can insert own habits" ON public.habits
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL
  );

-- Policy: Users can update their own habits
CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- Policy: Users can delete their own habits
CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE
  USING (
    auth.uid() = user_id 
    OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  );

-- ==============================================
-- HELPFUL VIEWS (Optional)
-- ==============================================

-- View: High priority pending tasks
CREATE OR REPLACE VIEW high_priority_tasks AS
SELECT *
FROM public.tasks
WHERE urgency_score = 'HIGH' 
  AND status = 'Pending'
ORDER BY created_at DESC;

-- View: Missed tasks requiring firefighter intervention
CREATE OR REPLACE VIEW missed_tasks AS
SELECT *
FROM public.tasks
WHERE status = 'Missed' 
  OR (deadline < NOW() AND status NOT IN ('Done'))
ORDER BY deadline ASC;

-- View: Today's habits
CREATE OR REPLACE VIEW todays_habits AS
SELECT *
FROM public.habits
WHERE completed_today = TRUE
  AND DATE(last_completed) = CURRENT_DATE
ORDER BY streak_days DESC;

-- ==============================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================
-- Uncomment below to add sample data after creating a test user

/*
INSERT INTO public.tasks (id, session_id, title, description, urgency_score, status, estimated_hours, immediate_first_step, actionable_checklist, deadline)
VALUES 
  ('task-sample-1', 'test-session', 'Sample Task', 'This is a sample task for testing', 'HIGH', 'Pending', 2, 'Review this sample task', ARRAY['Check the dashboard', 'Test the features'], NOW() + INTERVAL '1 day');

INSERT INTO public.habits (id, session_id, title, completed_today, streak_days, last_completed)
VALUES 
  ('habit-sample-1', 'test-session', 'Morning Deep Work', FALSE, 5, NOW() - INTERVAL '1 day'),
  ('habit-sample-2', 'test-session', 'Evening Review', TRUE, 12, NOW());
*/

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================
-- Run these queries to verify the tables were created successfully:

-- Check tasks table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tasks';

-- Check habits table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'habits';

-- Count records (should be 0 initially)
-- SELECT 'tasks' as table_name, COUNT(*) as count FROM public.tasks
-- UNION ALL
-- SELECT 'habits' as table_name, COUNT(*) as count FROM public.habits;

-- ==============================================
-- NOTES
-- ==============================================
-- 1. Row Level Security (RLS) is enabled for both tables
-- 2. Users can only access their own data (user_id or session_id)
-- 3. Timestamps are automatically managed with triggers
-- 4. Indexes are created for optimal query performance
-- 5. Foreign keys ensure data integrity with auth.users
-- ==============================================

-- ==============================================
-- USER GOOGLE TOKENS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON public.user_google_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own Google tokens
CREATE POLICY "Users can manage own Google tokens" ON public.user_google_tokens
  FOR ALL
  USING (auth.uid() = user_id);