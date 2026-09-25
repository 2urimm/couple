-- RLS 시나리오 테스트: A·B 커플 + 외부인 C. local-stubs.sql → migrations(0001~0004) → 이 파일 순서로 로컬 Postgres에서 실행.
-- "(expect ...)" 표시와 실제 결과를 비교하세요.
\set ON_ERROR_STOP 0
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''
insert into auth.users (id, email, raw_user_meta_data) values
 (:A, 'a@x', '{"display_name":"유림"}'), (:B, 'b@x', '{"display_name":"친구"}'), (:C, 'c@x', '{}');
select 'profiles auto-created' as t, count(*) from public.profiles;

set role authenticated;
-- A creates couple
select set_config('request.jwt.claim.sub', :A, false);
create temp table code as select public.create_couple('2026-08-14') as c;
select 'A start_date (expect 2026-08-14)' as t, start_date from public.couples;
select 'A second create (expect error)'; select public.create_couple();
-- B joins
select set_config('request.jwt.claim.sub', :B, false);
select public.join_couple((select lower(c) from code));
-- C tries to join (expect error)
select set_config('request.jwt.claim.sub', :C, false);
select public.join_couple((select c from code));
select 'C bad code (expect error)'; select public.join_couple('ZZZZZZ');

-- A writes stuff
select set_config('request.jwt.claim.sub', :A, false);
insert into public.messages (text) values ('안녕');
insert into public.questions (text) values ('첫인상?');
insert into public.private_notes (kind, text) values ('like', '민트초코');
insert into public.letters (title) values ('편지1');
insert into public.letter_contents (letter_id, body, image_path)
  select id, '비밀 본문', public.my_couple_id() || '/letters/scan.jpg' from public.letters;
insert into storage.objects (bucket_id, name) values ('media', public.my_couple_id() || '/letters/scan.jpg');
insert into storage.objects (bucket_id, name) values ('media', public.my_couple_id() || '/photos/p.jpg');
select 'A update start_date' as t; update public.couples set start_date = '2025-05-05';
select 'A tries pet_count direct (expect error)'; update public.couples set pet_count = 999;
select 'A tries profile couple_id (expect error)'; update public.profiles set couple_id = null where id = auth.uid();
select 'A open own letter (no-op)'; select public.open_letter((select id from public.letters));
select 'A sees own letter body' as t, body from public.letter_contents;

-- B checks
select set_config('request.jwt.claim.sub', :B, false);
select 'B messages' as t, count(*) from public.messages;
select 'B profiles visible' as t, count(*) from public.profiles;
select 'B couple start_date' as t, start_date from public.couples;
select 'B private notes (expect 0)' as t, count(*) from public.private_notes;
select 'B letter meta' as t, title, opened_at is not null as opened from public.letters;
select 'B letter body before open (expect 0)' as t, count(*) from public.letter_contents;
select 'B storage before open (expect photos only)' as t, name like '%photos%' as is_photo from storage.objects;
insert into public.question_answers (question_id, answer) select id, 'B답' from public.questions;
select public.pet_character(); select public.request_pet();
select public.open_letter((select id from public.letters));
select 'B letter body after open' as t, body from public.letter_contents;
select 'B storage after open (expect 2)' as t, count(*) from storage.objects;
select 'B tries messages as A (expect error)'; insert into public.messages (text, author_id) values ('fake', :A);
select 'B delete A message (expect 0 rows)'; delete from public.messages;
insert into public.bucket_items (category, title) values ('eat', '오마카세');

-- A checks answer gating
select set_config('request.jwt.claim.sub', :A, false);
select 'A sees answers before answering (expect 0)' as t, count(*) from public.question_answers;
insert into public.question_answers (question_id, answer) select id, 'A답' from public.questions;
select 'A sees answers after (expect 2)' as t, count(*) from public.question_answers;
select 'A couple pet' as t, pet_count, pet_request_from = :B::uuid as b_requested from public.couples;
update public.bucket_items set done = true;
select 'A toggled B bucket' as t, done from public.bucket_items;
select 'A tries bucket title (expect error)'; update public.bucket_items set title = 'x';

-- C isolation
select set_config('request.jwt.claim.sub', :C, false);
select 'C messages (expect 0)' as t, count(*) from public.messages;
select 'C couples (expect 0)' as t, count(*) from public.couples;
select 'C profiles (expect 1 self)' as t, count(*) from public.profiles;
select 'C storage (expect 0)' as t, count(*) from storage.objects;
select 'C insert message w/o couple (expect error)'; insert into public.messages (text) values ('x');

reset role;
set role anon;
select 'anon messages (expect error)'; select * from public.messages;
