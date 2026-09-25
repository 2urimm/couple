-- 커플앱 스키마 3/4 RLS 정책과 권한
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run. 0001 → 0004 순서대로.

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
