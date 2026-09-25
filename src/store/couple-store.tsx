/**
 * 앱 전역 상태 — Supabase와 동기화.
 *
 * 화면은 `useCouple()`만 사용합니다. 서버의 author_id/user_id는 여기서
 * 'me' | 'partner' 로 바꿔서 내려주므로 화면은 사용자 id를 몰라도 됩니다.
 * 상대가 데이터를 바꾸면 Realtime으로 해당 테이블만 다시 불러옵니다.
 */

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import { signedUrls, supabase, uploadImage } from '@/lib/supabase';
import type {
  BucketCategory,
  BucketItem,
  CalendarEvent,
  ChatMessage,
  Couple,
  Letter,
  Photo,
  Place,
  PrivateNote,
  Question,
  SongPick,
  UserId,
} from '@/types/models';

export type AuthStatus = 'loading' | 'signedOut' | 'noCouple' | 'ready';

type Data = {
  couple: Couple;
  inviteCode: string;
  hasPartner: boolean;
  secretMode: boolean;
  petCount: number;
  petRequestFrom: UserId | null;
  messages: ChatMessage[];
  questions: Question[];
  bucket: BucketItem[];
  places: Place[];
  letters: Letter[];
  photos: Photo[];
  events: CalendarEvent[];
  songs: SongPick[];
  notes: PrivateNote[];
};

const emptyData: Data = {
  couple: { myName: '', partnerName: '', startDate: '2026-01-01' },
  inviteCode: '',
  hasPartner: false,
  secretMode: false,
  petCount: 0,
  petRequestFrom: null,
  messages: [],
  questions: [],
  bucket: [],
  places: [],
  letters: [],
  photos: [],
  events: [],
  songs: [],
  notes: [],
};

type Table =
  | 'couples'
  | 'profiles'
  | 'messages'
  | 'questions'
  | 'question_answers'
  | 'bucket_items'
  | 'places'
  | 'letters'
  | 'photos'
  | 'events'
  | 'event_comments'
  | 'songs'
  | 'private_notes';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return (error as { message?: string })?.message ?? String(error);
}

/** 성공이면 data(목록 조회는 빈 배열이라도 non-null), 실패면 throw */
async function run<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) throw error;
  return data as NonNullable<T>;
}

/** 액션 실패 시 알림을 띄우고 false 반환 (화면에서 await 안 해도 안전) */
function safe<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A): Promise<boolean> => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      Alert.alert('문제가 생겼어요', errorMessage(error));
      return false;
    }
  };
}

function useCoupleState() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<Data>(emptyData);

  const userId = session?.user.id;
  const who = useCallback((id: string): UserId => (id === userId ? 'me' : 'partner'), [userId]);
  const patch = (next: Partial<Data>) => setData((d) => ({ ...d, ...next }));

  // ── 로그인 세션 ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── 테이블별 불러오기 ─────────────────────────
  const loaders = useMemo(() => {
    if (!userId) return null;

    const profilesAndCouple = async () => {
      const profiles = await run(supabase.from('profiles').select('id, couple_id, display_name, secret_mode'));
      const mine = profiles.find((p) => p.id === userId);
      const partner = profiles.find((p) => p.id !== userId);
      setCoupleId(mine?.couple_id ?? null);
      if (!mine?.couple_id) return;

      const couple = await run(
        supabase.from('couples').select('invite_code, start_date, pet_count, pet_request_from').single(),
      );
      patch({
        couple: {
          myName: mine.display_name,
          partnerName: partner?.display_name ?? '',
          startDate: couple.start_date,
        },
        inviteCode: couple.invite_code,
        hasPartner: !!partner,
        secretMode: mine.secret_mode,
        petCount: couple.pet_count,
        petRequestFrom: couple.pet_request_from ? who(couple.pet_request_from) : null,
      });
    };

    const messages = async () => {
      const rows = await run(
        supabase.from('messages').select('id, author_id, text, created_at').order('created_at', { ascending: false }).limit(300),
      );
      patch({
        messages: rows
          .reverse()
          .map((m) => ({ id: m.id, from: who(m.author_id), text: m.text, createdAt: m.created_at })),
      });
    };

    const questions = async () => {
      const [qs, answers] = await Promise.all([
        run(supabase.from('questions').select('id, text').order('created_at', { ascending: false })),
        run(supabase.from('question_answers').select('question_id, user_id, answer')),
      ]);
      patch({
        questions: qs.map((q) => ({
          id: q.id,
          text: q.text,
          answers: Object.fromEntries(
            answers.filter((a) => a.question_id === q.id).map((a) => [who(a.user_id), a.answer]),
          ),
        })),
      });
    };

    const bucket = async () => {
      const rows = await run(supabase.from('bucket_items').select('id, category, title, done').order('created_at'));
      patch({ bucket: rows as BucketItem[] });
    };

    const places = async () => {
      const rows = await run(
        supabase.from('places').select('id, name, country, region, favorite, visited_at').order('created_at'),
      );
      patch({
        places: rows.map((p) => ({
          id: p.id,
          name: p.name,
          country: p.country,
          region: p.region ?? undefined,
          favorite: p.favorite,
          visitedAt: p.visited_at ?? undefined,
        })),
      });
    };

    const letters = async () => {
      const [meta, contents] = await Promise.all([
        run(supabase.from('letters').select('id, author_id, letter_date, title, opened_at')),
        run(supabase.from('letter_contents').select('letter_id, body, image_path')),
      ]);
      const urls = await signedUrls(contents.flatMap((c) => (c.image_path ? [c.image_path] : [])));
      patch({
        letters: meta.map((l) => {
          const content = contents.find((c) => c.letter_id === l.id);
          return {
            id: l.id,
            from: who(l.author_id),
            date: l.letter_date,
            title: l.title,
            opened: !!l.opened_at,
            body: content?.body ?? undefined,
            imageUri: content?.image_path ? urls[content.image_path] : undefined,
          };
        }),
      });
    };

    const photos = async () => {
      const rows = await run(
        supabase.from('photos').select('id, path, photo_date, caption').order('created_at', { ascending: false }),
      );
      const urls = await signedUrls(rows.map((p) => p.path));
      patch({
        photos: rows.map((p) => ({
          id: p.id,
          uri: urls[p.path] ?? '',
          date: p.photo_date,
          caption: p.caption ?? undefined,
        })),
      });
    };

    const events = async () => {
      const [evs, comments] = await Promise.all([
        run(supabase.from('events').select('id, author_id, event_date, title, kind').order('event_date')),
        run(supabase.from('event_comments').select('id, event_id, author_id, text').order('created_at')),
      ]);
      patch({
        events: evs.map((e) => ({
          id: e.id,
          date: e.event_date,
          title: e.title,
          kind: e.kind as CalendarEvent['kind'],
          owner: who(e.author_id),
          comments: comments
            .filter((c) => c.event_id === e.id)
            .map((c) => ({ id: c.id, from: who(c.author_id), text: c.text })),
        })),
      });
    };

    const songs = async () => {
      const rows = await run(
        supabase.from('songs').select('id, author_id, song_date, title, artist, url').order('created_at', { ascending: false }),
      );
      patch({
        songs: rows.map((s) => ({
          id: s.id,
          from: who(s.author_id),
          date: s.song_date,
          title: s.title,
          artist: s.artist,
          url: s.url ?? undefined,
        })),
      });
    };

    const notes = async () => {
      const rows = await run(supabase.from('private_notes').select('id, kind, text').order('created_at'));
      patch({ notes: rows as PrivateNote[] });
    };

    const byTable: Record<Table, () => Promise<void>> = {
      couples: profilesAndCouple,
      profiles: profilesAndCouple,
      messages,
      questions,
      question_answers: questions,
      bucket_items: bucket,
      places,
      letters,
      photos,
      events,
      event_comments: events,
      songs,
      private_notes: notes,
    };
    const all = () =>
      Promise.all([messages(), questions(), bucket(), places(), letters(), photos(), events(), songs(), notes()]);

    return { profilesAndCouple, byTable, all };
  }, [userId, who]);

  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  // 로그인되면 프로필/커플부터 확인
  useEffect(() => {
    if (!sessionLoaded) return;
    if (!loaders) {
      setCoupleId(undefined);
      setData(emptyData);
      return;
    }
    loaders.profilesAndCouple().catch(() => setCoupleId(null));
  }, [sessionLoaded, loaders]);

  // 커플이 연결되면 전체 불러오기 + 실시간 구독
  useEffect(() => {
    if (!coupleId || !loaders) return;
    loaders.all().catch(() => {});

    const reload = (table: Table) => () => {
      loadersRef.current?.byTable[table]().catch(() => {});
    };
    const channel = supabase.channel(`couple-${coupleId}`);
    (Object.keys(loaders.byTable) as Table[])
      .filter((t) => t !== 'private_notes')
      .forEach((table) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, reload(table));
      });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, loaders]);

  const status: AuthStatus = !sessionLoaded
    ? 'loading'
    : !session
      ? 'signedOut'
      : coupleId === undefined
        ? 'loading'
        : coupleId === null
          ? 'noCouple'
          : 'ready';

  // ── 액션 ────────────────────────────────────
  const reload = (table: Table) => loadersRef.current?.byTable[table]();
  const requireCouple = () => {
    if (!coupleId) throw new Error('커플이 연결되지 않았어요');
    return coupleId;
  };

  const actions = {
    // 인증
    signUp: safe(async (email: string, password: string, displayName: string) => {
      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      if (!result.session) {
        Alert.alert('메일을 확인해주세요', '받은 메일의 링크를 누른 뒤 로그인하세요.');
      }
    }),
    signIn: safe(async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }),
    signOut: safe(async () => {
      await supabase.auth.signOut();
    }),

    // 커플 연결
    createCouple: safe(async (firstDay: string) => {
      await run(supabase.rpc('create_couple', { first_day: firstDay }));
      await loadersRef.current?.profilesAndCouple();
    }),
    joinCouple: safe(async (code: string) => {
      await run(supabase.rpc('join_couple', { code }));
      await loadersRef.current?.profilesAndCouple();
    }),

    // 설정
    setMyName: safe(async (displayName: string) => {
      await run(supabase.from('profiles').update({ display_name: displayName }).eq('id', userId!));
      await reload('profiles');
    }),
    setStartDate: safe(async (startDate: string) => {
      await run(supabase.from('couples').update({ start_date: startDate }).eq('id', requireCouple()));
      await reload('couples');
    }),
    setSecretMode: safe(async (secretMode: boolean) => {
      patch({ secretMode });
      await run(supabase.from('profiles').update({ secret_mode: secretMode }).eq('id', userId!));
    }),

    // 캐릭터
    pet: safe(async () => {
      patch({ petCount: data.petCount + 1, petRequestFrom: null });
      await run(supabase.rpc('pet_character'));
    }),
    requestPet: safe(async () => {
      patch({ petRequestFrom: 'me' });
      await run(supabase.rpc('request_pet'));
    }),

    sendMessage: safe(async (text: string) => {
      await run(supabase.from('messages').insert({ text }));
      await reload('messages');
    }),

    answerQuestion: safe(async (questionId: string, answer: string) => {
      await run(supabase.from('question_answers').insert({ question_id: questionId, answer }));
      await reload('questions');
    }),
    addQuestion: safe(async (text: string) => {
      await run(supabase.from('questions').insert({ text }));
      await reload('questions');
    }),

    addBucket: safe(async (category: BucketCategory, title: string) => {
      await run(supabase.from('bucket_items').insert({ category, title }));
      await reload('bucket_items');
    }),
    toggleBucket: safe(async (id: string) => {
      const item = data.bucket.find((b) => b.id === id);
      if (!item) return;
      await run(supabase.from('bucket_items').update({ done: !item.done }).eq('id', id));
      await reload('bucket_items');
    }),

    addPlace: safe(async (place: Omit<Place, 'id' | 'favorite'>) => {
      await run(
        supabase.from('places').insert({
          name: place.name,
          country: place.country,
          region: place.region ?? null,
          visited_at: place.visitedAt ?? null,
        }),
      );
      await reload('places');
    }),
    toggleFavoritePlace: safe(async (id: string) => {
      const place = data.places.find((p) => p.id === id);
      if (!place) return;
      await run(supabase.from('places').update({ favorite: !place.favorite }).eq('id', id));
      await reload('places');
    }),

    writeLetter: safe(async (letter: Omit<Letter, 'id' | 'from' | 'opened'>) => {
      const imagePath = letter.imageUri ? await uploadImage(letter.imageUri, requireCouple(), 'letters') : null;
      const created = await run(
        supabase.from('letters').insert({ letter_date: letter.date, title: letter.title }).select('id').single(),
      );
      await run(
        supabase.from('letter_contents').insert({ letter_id: created.id, body: letter.body ?? null, image_path: imagePath }),
      );
      await reload('letters');
    }),
    openLetter: safe(async (id: string) => {
      await run(supabase.rpc('open_letter', { l_id: id }));
      await reload('letters');
    }),

    addPhoto: safe(async (uri: string, date: string) => {
      const path = await uploadImage(uri, requireCouple(), 'photos');
      await run(supabase.from('photos').insert({ path, photo_date: date }));
      await reload('photos');
    }),

    addEvent: safe(async (event: Omit<CalendarEvent, 'id' | 'owner' | 'comments'>) => {
      await run(supabase.from('events').insert({ event_date: event.date, title: event.title, kind: event.kind }));
      await reload('events');
    }),
    commentEvent: safe(async (eventId: string, text: string) => {
      await run(supabase.from('event_comments').insert({ event_id: eventId, text }));
      await reload('events');
    }),

    pickSong: safe(async (song: Omit<SongPick, 'id' | 'from' | 'date'>) => {
      await run(supabase.from('songs').insert({ title: song.title, artist: song.artist, url: song.url ?? null }));
      await reload('songs');
    }),

    addNote: safe(async (kind: PrivateNote['kind'], text: string) => {
      await run(supabase.from('private_notes').insert({ kind, text }));
      await reload('private_notes');
    }),
    removeNote: safe(async (id: string) => {
      await run(supabase.from('private_notes').delete().eq('id', id));
      await reload('private_notes');
    }),
  };

  return { status, email: session?.user.email ?? '', ...data, ...actions };
}

type CoupleStore = ReturnType<typeof useCoupleState>;

const CoupleContext = createContext<CoupleStore | null>(null);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const store = useCoupleState();
  return <CoupleContext.Provider value={store}>{children}</CoupleContext.Provider>;
}

export function useCouple(): CoupleStore {
  const store = useContext(CoupleContext);
  if (!store) throw new Error('useCouple must be used inside <CoupleProvider>');
  return store;
}
