-- 커플앱 스키마 4/4 실시간·사진 저장소
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run. 0001 → 0004 순서대로.

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
