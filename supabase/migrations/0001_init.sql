-- 커플앱 초기 스키마
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 Run.
--
-- 보안 원칙
--  * 모든 테이블 RLS 사용. 커플 데이터는 그 커플 두 명만 읽고 쓸 수 있음
--  * 나만 보는 메모(private_notes)는 작성자 본인만
--  * 편지 본문(letter_contents)은 작성자, 또는 받은 사람이 "열어본 뒤"에만
--  * 질문 답변은 내가 먼저 답해야 상대 답변이 보임
--  * "Automatically expose new tables"를 껐으므로 필요한 권한은 아래에서 직접 GRANT

-- ─────────────────────────────────────────────
-- 커플 & 프로필
-- ─────────────────────────────────────────────
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  start_date date not null default current_date,
  pet_count integer not null default 0,
  pet_request_from uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  couple_id uuid references public.couples (id) on delete set null,
  display_name text not null default '',
  secret_mode boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_couple_id_idx on public.profiles (couple_id);

-- 내 커플 id. SECURITY DEFINER 라서 RLS 정책 안에서 써도 재귀가 생기지 않음
create function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- 회원가입 시 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 새 커플 만들기 (first_day = 사귄 날, D-Day 기준) → 초대 코드 반환
create function public.create_couple(first_day date default current_date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception '이미 커플이 연결되어 있어요';
  end if;

  insert into public.couples (start_date) values (coalesce(first_day, current_date)) returning * into new_couple;
  update public.profiles set couple_id = new_couple.id where id = auth.uid();
  return new_couple.invite_code;
end;
$$;

-- 초대 코드로 커플 참여
create function public.join_couple(code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception '이미 커플이 연결되어 있어요';
  end if;

  select id into target from public.couples where invite_code = upper(trim(code));
  if target is null then
    raise exception '초대 코드가 올바르지 않아요';
  end if;
  if (select count(*) from public.profiles where couple_id = target) >= 2 then
    raise exception '이미 두 명이 연결된 코드예요';
  end if;

  update public.profiles set couple_id = target where id = auth.uid();
end;
$$;

-- 캐릭터 쓰다듬기 (동시에 눌러도 안전하게 +1)
create function public.pet_character()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.couples
  set pet_count = pet_count + 1, pet_request_from = null
  where id = public.my_couple_id()
$$;

-- "예뻐해주세요" 요청
create function public.request_pet()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.couples set pet_request_from = auth.uid() where id = public.my_couple_id()
$$;

alter table public.couples enable row level security;
alter table public.profiles enable row level security;

create policy "커플 멤버만 조회" on public.couples
  for select to authenticated using (id = public.my_couple_id());
create policy "커플 멤버만 수정" on public.couples
  for update to authenticated using (id = public.my_couple_id());

create policy "나와 내 커플 상대 프로필 조회" on public.profiles
  for select to authenticated using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "내 프로필만 수정" on public.profiles
  for update to authenticated using (id = auth.uid());

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

-- ─────────────────────────────────────────────
-- RLS 정책
-- ─────────────────────────────────────────────

-- 커플 공용 테이블: 조회/추가는 커플 멤버, 삭제는 작성자 본인
do $$
declare
  t text;
begin
  foreach t in array array['messages', 'questions', 'bucket_items', 'places', 'letters', 'photos', 'events', 'event_comments', 'songs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "커플 멤버 조회" on public.%I for select to authenticated using (couple_id = public.my_couple_id())', t);
    execute format(
      'create policy "커플 멤버 추가" on public.%I for insert to authenticated with check (couple_id = public.my_couple_id() and author_id = auth.uid())', t);
    execute format(
      'create policy "작성자 삭제" on public.%I for delete to authenticated using (couple_id = public.my_couple_id() and author_id = auth.uid())', t);
  end loop;
end;
$$;

-- 버킷리스트 체크, 장소 즐겨찾기는 둘 다 수정 가능 (컬럼 권한으로 범위 제한)
create policy "커플 멤버 수정" on public.bucket_items
  for update to authenticated using (couple_id = public.my_couple_id());
create policy "커플 멤버 수정" on public.places
  for update to authenticated using (couple_id = public.my_couple_id());

-- 질문 답변: 내 답은 항상, 상대 답은 내가 답한 뒤에만
create function public.can_see_answer(q_id uuid, answer_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.questions q where q.id = q_id and q.couple_id = public.my_couple_id())
     and (
       answer_user = auth.uid()
       or exists (select 1 from public.question_answers a where a.question_id = q_id and a.user_id = auth.uid())
     )
$$;

alter table public.question_answers enable row level security;
create policy "답변 조회" on public.question_answers
  for select to authenticated using (public.can_see_answer(question_id, user_id));
create policy "내 답변 추가" on public.question_answers
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.questions q where q.id = question_id and q.couple_id = public.my_couple_id())
  );

-- 편지 본문: 작성자, 또는 받은 사람이 열어본 뒤
create function public.can_read_letter(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.letters l
    where l.id = l_id
      and l.couple_id = public.my_couple_id()
      and (l.author_id = auth.uid() or l.opened_at is not null)
  )
$$;

alter table public.letter_contents enable row level security;
create policy "편지 본문 조회" on public.letter_contents
  for select to authenticated using (public.can_read_letter(letter_id));
create policy "내 편지 본문 추가" on public.letter_contents
  for insert to authenticated
  with check (exists (select 1 from public.letters l where l.id = letter_id and l.author_id = auth.uid()));

-- 받은 편지 열기
create function public.open_letter(l_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.letters
  set opened_at = coalesce(opened_at, now())
  where id = l_id and couple_id = public.my_couple_id() and author_id <> auth.uid()
$$;

alter table public.private_notes enable row level security;
create policy "본인만 조회" on public.private_notes
  for select to authenticated using (author_id = auth.uid());
create policy "본인만 추가" on public.private_notes
  for insert to authenticated with check (author_id = auth.uid());
create policy "본인만 삭제" on public.private_notes
  for delete to authenticated using (author_id = auth.uid());

-- ─────────────────────────────────────────────
-- 권한 (Data API 노출)
-- ─────────────────────────────────────────────
grant usage on schema public to authenticated;

grant select on public.couples, public.profiles to authenticated;
grant update (start_date) on public.couples to authenticated;
grant update (display_name, secret_mode) on public.profiles to authenticated;

grant select, insert, delete on
  public.messages, public.questions, public.bucket_items, public.places, public.letters,
  public.photos, public.events, public.event_comments, public.songs, public.private_notes
  to authenticated;
grant select, insert on public.question_answers, public.letter_contents to authenticated;
grant update (done) on public.bucket_items to authenticated;
grant update (favorite) on public.places to authenticated;

-- 함수는 기본적으로 모두에게 실행 권한이 있으므로 회수 후 로그인 사용자에게만 부여
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_couple_id(), public.create_couple(date), public.join_couple(text),
  public.pet_character(), public.request_pet(), public.open_letter(uuid),
  public.can_see_answer(uuid, uuid), public.can_read_letter(uuid)
  to authenticated;

-- ─────────────────────────────────────────────
-- 실시간 (상대가 쓴 내용이 바로 보이도록)
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table
  public.couples, public.profiles, public.messages, public.questions, public.question_answers,
  public.bucket_items, public.places, public.letters, public.photos, public.events,
  public.event_comments, public.songs;

-- ─────────────────────────────────────────────
-- 사진/손편지 저장소 (비공개 버킷, 경로: {couple_id}/...)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp']);

-- letters/ 폴더의 손편지 스캔은 편지를 열어본 뒤에만 (올린 사람은 항상)
create policy "커플 폴더 조회" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
    and (
      (storage.foldername(name))[2] is distinct from 'letters'
      or owner_id = auth.uid()::text
      or exists (
        select 1 from public.letter_contents c
        where c.image_path = name and public.can_read_letter(c.letter_id)
      )
    )
  );
create policy "커플 폴더 업로드" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "내 파일 삭제" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and owner_id = auth.uid()::text);
