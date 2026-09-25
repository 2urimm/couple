-- 커플앱 스키마 1/4 커플·프로필·커플 연결 함수
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run. 0001 → 0004 순서대로.
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
