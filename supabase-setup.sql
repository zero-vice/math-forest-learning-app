-- =============================================
-- MATH FOREST - Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- =============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  skill_levels JSONB DEFAULT '{"addition":0,"subtraction":0,"multiplication":0,"wordProblems":0}'::jsonb,
  skill_xp JSONB DEFAULT '{"addition":0,"subtraction":0,"multiplication":0,"wordProblems":0}'::jsonb,
  total_stars INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  potions INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Users can only access their own data
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
