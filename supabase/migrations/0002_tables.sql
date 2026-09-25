-- 커플앱 스키마 2/4 기능별 테이블
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run. 0001 → 0004 순서대로.

-- ─────────────────────────────────────────────
-- 커플 공용 데이터
-- ─────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (length(text) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_couple_created_idx on public.messages (couple_id, created_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.question_answers (
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answer text not null check (length(answer) between 1 and 2000),
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('eat', 'play', 'go')),
  title text not null check (length(title) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  country text not null check (length(country) = 2),
  region text,
  favorite boolean not null default false,
  visited_at date,
  created_at timestamptz not null default now()
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  letter_date date not null default current_date,
  title text not null check (length(title) between 1 and 200),
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- 편지 본문은 별도 테이블: 받은 사람은 열기 전에는 조회 불가
create table public.letter_contents (
  letter_id uuid primary key references public.letters (id) on delete cascade,
  body text,
  image_path text
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null,
  photo_date date not null default current_date,
  caption text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_date date not null,
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in ('personal', 'date')),
  created_at timestamptz not null default now()
);

create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  song_date date not null default current_date,
  title text not null check (length(title) between 1 and 200),
  artist text not null default '',
  url text,
  created_at timestamptz not null default now()
);

-- 나만 보는 메모: 커플과 무관하게 작성자 본인만
create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('like', 'dislike', 'memo')),
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
