# ClipForge - Phase 2

Video clip generation app with server-side rendering pipeline.

## Phase 2 Setup

### 1. Supabase Setup

1. Create a new Supabase project
2. Add these environment variables to `.env.local`:

```bash
# Next.js (client + server)
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# API routes (server-side)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Transcription (choose one in worker)
OPENAI_API_KEY=your_openai_key
ASSEMBLYAI_API_KEY=your_assembly_key
```

3. Create two private buckets in Supabase Storage:
   - `videos` (uploads)
   - `clips` (renders)

4. Run this SQL in Supabase SQL Editor:

```sql
-- Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  free_generations_used int default 0,
  active_plan text,
  created_at timestamptz default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text,
  platform text,
  source_path text,           -- storage path in 'videos'
  status text default 'uploaded', -- uploaded|processing|done|error
  error text,
  created_at timestamptz default now()
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  status text default 'queued', -- queued|processing|done|error
  requested_variant_count int default 3,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text
);

-- Clips
create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  idx int,
  duration_sec int,
  mp4_path text,   -- storage path in 'clips'
  srt_path text,
  thumb_path text,
  created_at timestamptz default now()
);
```

5. Make `clips` bucket public for Phase 2 (we'll lock this down in Phase 3)

### 2. Railway Worker Setup

1. Create a new Railway Service → Deploy from folder `/worker`
2. Add environment variables (same as `.env.local`)
3. Add `NIXPACKS_PKGS=ffmpeg` to Railway env so ffmpeg is available
4. Start command: `npm start`

### 3. Local Development

```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev

# Start worker locally (if ffmpeg is installed)
cd worker
npm install
node index.js
```

## Features

- **Upload**: Drag & drop video files (MP4/MOV/WebM)
- **Platform Presets**: TikTok, YouTube Shorts, Instagram, X (Twitter)
- **Server Processing**: Whisper transcription + FFmpeg rendering
- **Downloads**: MP4 clips + SRT subtitles + thumbnails
- **Free Tier**: 2 generations per video (1 generate + 1 regenerate)

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Edge Functions)
- **Worker**: Railway + FFmpeg + OpenAI Whisper/AssemblyAI
- **Storage**: Supabase Storage buckets for videos and rendered clips

## Next Phases

- **Phase 3**: Stripe monetization + auth + retry queues
- **Phase 4**: Smart clip selection + brand kits + captions
- **Phase 5**: Go-to-market + founding member offers
- **Phase 6**: Agency plans + creator affiliate program
