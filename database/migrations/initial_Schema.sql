-- ==========================================
-- db tables schema
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
-- WARNING: Do not re-run DROP TABLE CASCADE in production as it will wipe all user data
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id   TEXT UNIQUE NOT NULL,
    username    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Usage Analytics / Review Logs Table
DROP TABLE IF EXISTS public.review_logs CASCADE;
CREATE TABLE public.review_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id       TEXT NOT NULL REFERENCES public.users(github_id) ON DELETE CASCADE,
    review_type     TEXT NOT NULL,
    review_count    INTEGER NOT NULL DEFAULT 1,
    last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(github_id, review_type)
);

-- FK index: Postgres does not auto-index foreign keys
CREATE INDEX idx_review_logs_github_id ON public.review_logs (github_id);

-- ==========================================
-- rls policies
-- ==========================================

-- 01 users RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
CREATE POLICY "Allow public insert on users"
ON public.users FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on users" ON public.users;
CREATE POLICY "Allow public update on users"
ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on users" ON public.users;
CREATE POLICY "Allow public select on users"
ON public.users FOR SELECT TO anon USING (true);


-- 02 review_logs RLS
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on review_logs" ON public.review_logs;
CREATE POLICY "Allow public insert on review_logs"
ON public.review_logs FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on review_logs" ON public.review_logs;
CREATE POLICY "Allow public update on review_logs"
ON public.review_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on review_logs" ON public.review_logs;
CREATE POLICY "Allow public select on review_logs"
ON public.review_logs FOR SELECT TO anon USING (true);
