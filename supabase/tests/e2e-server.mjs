// 커플앱 서버 E2E: 실제 Supabase 프로젝트에 테스트 계정 3개(A, B 커플 + 외부인 C)로 앱과 같은 호출을 재현
//
// 실행: node supabase/tests/e2e-server.mjs   (.env 의 publishable 키 사용, Confirm email 이 꺼져 있어야 함)
// 테스트 파일은 끝에 스스로 지우지만, 테스트 사용자·커플은 남음 → SQL Editor 에서 정리:
//   delete from public.couples where id in (
//     select p.couple_id from public.profiles p join auth.users u on u.id = p.id
//     where u.email like 'couple-e2e-%@example.com');
//   delete from auth.users where email like 'couple-e2e-%@example.com';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
const require = createRequire(ROOT + '/package.json');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  readFileSync(ROOT + '/.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
const client = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stamp = Date.now();
const created = { users: [], files: [] };

async function signUp(label) {
  const c = client();
  const email = `couple-e2e-${label.toLowerCase()}-${stamp}@example.com`;
  const { data, error } = await c.auth.signUp({
    email, password: `E2e-${stamp}-pw`, options: { data: { display_name: `E2E ${label}` } },
  });
  if (error) throw new Error(`${label} 가입 실패: ${error.message}`);
  check(`${label} 가입 즉시 세션 발급`, !!data.session);
  created.users.push({ label, id: data.user.id, email });
  return { c, id: data.user.id };
}

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

try {
  const A = await signUp('A');
  const B = await signUp('B');
  const C = await signUp('C');

  // ── 프로필 자동 생성
  {
    const { data } = await A.c.from('profiles').select('id, couple_id, display_name, secret_mode');
    check('가입 시 프로필 자동 생성(display_name 반영)', data?.length === 1 && data[0].display_name === 'E2E A', JSON.stringify(data));
  }

  // ── 커플 생성 / 연결
  const { data: code, error: ce } = await A.c.rpc('create_couple', { first_day: '2026-08-14' });
  check('A create_couple → 초대 코드', !ce && /^[0-9A-F]{6}$/.test(code), ce?.message ?? code);

  {
    const { error } = await A.c.rpc('create_couple', { first_day: '2026-08-14' });
    check('A 두 번째 create_couple 거부', !!error, error?.message);
  }
  {
    const { error } = await B.c.rpc('join_couple', { code: 'ZZZZZZ' });
    check('틀린 초대 코드 거부', !!error, error?.message);
  }
  {
    const { error } = await B.c.rpc('join_couple', { code: `  ${code.toLowerCase()} ` });
    check('B join_couple(소문자·공백 섞인 코드)', !error, error?.message);
  }
  {
    const { error } = await C.c.rpc('join_couple', { code });
    check('C 세 번째 참여 거부', !!error, error?.message);
  }

  const { data: coupleA } = await A.c.from('couples').select('id, invite_code, start_date, pet_count').single();
  const { data: coupleB } = await B.c.from('couples').select('id, invite_code, start_date').single();
  const coupleId = coupleA?.id;
  check('A·B 같은 커플 조회, start_date=2026-08-14', coupleA?.id === coupleB?.id && coupleA?.start_date === '2026-08-14', JSON.stringify(coupleA));
  {
    const { data } = await B.c.from('profiles').select('id, display_name');
    check('B는 자기+상대 프로필 2개 조회', data?.length === 2, JSON.stringify(data?.map((p) => p.display_name)));
  }
  {
    const { data } = await C.c.from('couples').select('id');
    const { data: p } = await C.c.from('profiles').select('id');
    check('외부인 C는 커플·타인 프로필 조회 불가', data?.length === 0 && p?.length === 1);
  }

  // ── 채팅 실시간 (앱과 같은 방식: 필터 없는 postgres_changes, RLS로 걸러짐)
  const got = { B: [], C: [] };
  const subscribe = (who, c) => new Promise((resolve) => {
    const ch = c.channel(`e2e-${who}-${stamp}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p) => got[who].push(p))
      .subscribe((s) => { if (s === 'SUBSCRIBED') resolve(ch); });
    setTimeout(() => resolve(ch), 10000);
  });
  const chB = await subscribe('B', B.c);
  const chC = await subscribe('C', C.c);
  await sleep(1500);
  const t0 = Date.now();
  {
    const { error } = await A.c.from('messages').insert({ text: 'E2E 안녕 💕' });
    check('A 메시지 전송', !error, error?.message);
  }
  for (let i = 0; i < 40 && got.B.length === 0; i++) await sleep(250);
  check('B 실시간 수신', got.B.length > 0 && got.B[0].new?.text === 'E2E 안녕 💕', got.B.length ? `${Date.now() - t0}ms` : '10초 내 수신 없음');
  await sleep(1500);
  check('C는 실시간 이벤트 못 받음(RLS)', got.C.length === 0, `${got.C.length}건`);
  {
    const { data } = await B.c.from('messages').select('id, author_id, text, created_at');
    check('B 메시지 조회, author_id=A', data?.length === 1 && data[0].author_id === A.id);
  }
  await B.c.removeChannel(chB).catch(() => {});
  await C.c.removeChannel(chC).catch(() => {});

  // ── 편지 (손편지 스캔 이미지 포함)
  const letterImg = `${coupleId}/letters/${stamp}-e2e.png`;
  {
    const { error } = await A.c.storage.from('media').upload(letterImg, PNG, { contentType: 'image/png' });
    check('A 편지 스캔 업로드', !error, error?.message);
    if (!error) created.files.push({ by: 'A', path: letterImg });
  }
  const { data: letter, error: le } = await A.c.from('letters').insert({ letter_date: '2026-09-26', title: 'E2E 편지' }).select('id').single();
  check('A 편지 작성', !le, le?.message);
  {
    const { error } = await A.c.from('letter_contents').insert({ letter_id: letter.id, body: '비밀 본문', image_path: letterImg });
    check('A 편지 본문 저장', !error, error?.message);
  }
  {
    const { data } = await B.c.from('letters').select('id, title, opened_at');
    const { data: body } = await B.c.from('letter_contents').select('body');
    check('B: 열기 전 제목은 보이고 본문은 안 보임', data?.length === 1 && body?.length === 0);
    const { data: s, error } = await B.c.storage.from('media').createSignedUrls([letterImg], 60);
    check('B: 열기 전 스캔 이미지 URL 불가', !!error || !s?.[0]?.signedUrl, error?.message ?? s?.[0]?.error);
  }
  {
    await A.c.rpc('open_letter', { l_id: letter.id });
    const { data } = await A.c.from('letters').select('opened_at').single();
    check('작성자 A가 open_letter 해도 열림 처리 안 됨', data?.opened_at === null);
  }
  {
    const { error } = await B.c.rpc('open_letter', { l_id: letter.id });
    const { data: body } = await B.c.from('letter_contents').select('body, image_path');
    check('B open_letter 후 본문 보임', !error && body?.[0]?.body === '비밀 본문', error?.message);
    const { data: s } = await B.c.storage.from('media').createSignedUrls([letterImg], 60);
    const res = s?.[0]?.signedUrl ? await fetch(s[0].signedUrl) : null;
    check('B 열기 후 스캔 이미지 signed URL 200', res?.status === 200, res ? String(res.status) : s?.[0]?.error);
  }

  // ── 질문 답변 공개
  const { data: q } = await A.c.from('questions').insert({ text: 'E2E 질문?' }).select('id').single();
  await A.c.from('question_answers').insert({ question_id: q.id, answer: 'A의 답' });
  {
    const { data } = await B.c.from('question_answers').select('user_id, answer');
    check('B: 답하기 전 A 답변 안 보임', data?.length === 0, JSON.stringify(data));
  }
  {
    const { error } = await B.c.from('question_answers').insert({ question_id: q.id, answer: 'B의 답' });
    const { data } = await B.c.from('question_answers').select('user_id, answer');
    check('B 답한 뒤 두 답변 모두 보임', !error && data?.length === 2, error?.message);
  }
  {
    const { error } = await C.c.from('question_answers').insert({ question_id: q.id, answer: '끼어들기' });
    check('C는 남의 질문에 답변 불가', !!error, error?.message);
  }

  // ── 사진 업로드
  const photoPath = `${coupleId}/photos/${stamp}-e2e.png`;
  {
    const { error } = await A.c.storage.from('media').upload(photoPath, PNG, { contentType: 'image/png' });
    check('A 사진 업로드', !error, error?.message);
    if (!error) created.files.push({ by: 'A', path: photoPath });
    const { error: pe } = await A.c.from('photos').insert({ path: photoPath, photo_date: '2026-09-26' });
    check('A 사진 기록 저장', !pe, pe?.message);
  }
  {
    const { data: rows } = await B.c.from('photos').select('path');
    const { data: s } = await B.c.storage.from('media').createSignedUrls(rows.map((r) => r.path), 60);
    const res = s?.[0]?.signedUrl ? await fetch(s[0].signedUrl) : null;
    check('B 사진 signed URL 200', res?.status === 200, res ? String(res.status) : s?.[0]?.error);
  }
  {
    const { data: s, error } = await C.c.storage.from('media').createSignedUrls([photoPath], 60);
    check('C는 커플 사진 URL 불가', !!error || !s?.[0]?.signedUrl);
    const { error: ue } = await C.c.storage.from('media').upload(`${coupleId}/photos/${stamp}-c.png`, PNG, { contentType: 'image/png' });
    check('C는 남의 커플 폴더 업로드 불가', !!ue, ue?.message);
  }

  // ── 기타 권한
  {
    const { error } = await B.c.from('couples').update({ pet_count: 999 }).eq('id', coupleId);
    check('pet_count 직접 수정 불가', !!error, error?.message);
    await B.c.rpc('pet_character');
    const { data } = await A.c.from('couples').select('pet_count').single();
    check('pet_character RPC로 +1', data?.pet_count === 1, String(data?.pet_count));
  }
  {
    await A.c.from('private_notes').insert({ kind: 'memo', text: 'A만 보는 메모' });
    const { data: a } = await A.c.from('private_notes').select('id');
    const { data: b } = await B.c.from('private_notes').select('id');
    check('private_notes: A는 보이고 B는 안 보임', a?.length === 1 && b?.length === 0);
  }
  {
    const { error } = await B.c.from('profiles').update({ display_name: 'hack' }).eq('id', A.id).select();
    const { data } = await A.c.from('profiles').select('display_name').eq('id', A.id).single();
    check('B가 A 프로필 수정 불가', data?.display_name === 'E2E A', error?.message);
  }

  // ── 테스트 파일 정리 (Storage는 올린 사람이 삭제 가능)
  {
    const { error } = await A.c.storage.from('media').remove(created.files.map((f) => f.path));
    check('테스트 파일 삭제', !error, error?.message);
  }
} catch (e) {
  check('예외', false, e.message);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
console.log('생성된 테스트 사용자:', created.users.map((u) => `${u.label}=${u.id}`).join(', '));
process.exit(failed ? 1 : 0);
