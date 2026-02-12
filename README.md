# 🏰 Math Forest — Setup Guide

A magical math adventure app for kids, with cloud saves and installable on iPad.

---

## Quick Setup (15 minutes)

### Step 1: Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) and open your project (or create one — free tier works)
2. Go to **SQL Editor** → **New Query**
3. Paste the contents of `supabase-setup.sql` and click **Run**
4. Go to **Authentication** → **Providers** → make sure **Email** is enabled
5. (Optional) Under **Authentication** → **Settings**, turn OFF "Confirm email" for easier testing
6. Copy your credentials:
   - **Project Settings** → **API** → copy `Project URL`
   - **Project Settings** → **API** → copy `anon` / `public` key

### Step 2: Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

### Step 3: Deploy to Vercel

**Option A — GitHub (recommended):**
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Deploy!

**Option B — Vercel CLI:**
```bash
npm install
npx vercel --prod
# When prompted, add your env vars
```

### Step 4: Install on iPad

1. Open your Vercel URL in Safari on the iPad
2. Tap the **Share** button (square with arrow)
3. Tap **"Add to Home Screen"**
4. It now works like a native app! 🎉

---

## How It Works

- **Login**: Parent creates account with email/password
- **Cloud saves**: All progress saved to Supabase after every answer
- **Badges**: Every completed session (10+ problems) earns a badge
- **Prizes**: Every 5 badges unlocks a prize from Mom & Dad!
- **PWA**: Installable on home screen, works offline for gameplay

---

## Local Development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

---

## Project Structure

```
math-forest/
├── index.html           # App shell + PWA meta tags
├── package.json         # Dependencies
├── vite.config.js       # Build config
├── supabase-setup.sql   # Run this in Supabase SQL Editor
├── .env.example         # Template for env vars
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service worker (offline support)
│   └── icon.svg        # App icon
└── src/
    ├── main.jsx        # Entry point
    ├── supabase.js     # Supabase client
    └── App.jsx         # Full app (auth + game)
```
