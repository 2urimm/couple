/**
 * 앱 전역 상태 (현재는 메모리 + 목업 데이터).
 *
 * 둘이 실시간으로 데이터를 공유하려면 이 파일의 액션들을 백엔드 호출로
 * 교체하면 됩니다. 화면 코드는 `useCouple()`만 쓰므로 수정할 필요가 없습니다.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { todayString } from '@/lib/date';
import { newId } from '@/lib/id';
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

type State = {
  couple: Couple;
  secretMode: boolean;
  /** 캐릭터를 쓰다듬은 횟수 */
  petCount: number;
  /** 상대가 "예뻐해주세요" 요청을 보냈는지 */
  petRequestFrom: UserId | null;
  messages: ChatMessage[];
  questions: Question[];
  bucket: BucketItem[];
  places: Place[];
  letters: Letter[];
  photos: Photo[];
  events: CalendarEvent[];
  songs: SongPick[];
  /** 나만 볼 수 있는 상대방 취향 메모 */
  notes: PrivateNote[];
};

const initialState: State = {
  couple: { myName: '나', partnerName: '애인', startDate: '2026-01-01' },
  secretMode: false,
  petCount: 0,
  petRequestFrom: 'partner',
  messages: [
    { id: 'm1', from: 'partner', text: '오늘 뭐 먹을까? 🍜', createdAt: new Date().toISOString() },
  ],
  questions: [
    { id: 'q1', text: '처음 만났을 때 첫인상은 어땠어?', answers: { partner: '비밀이야~' } },
    { id: 'q2', text: '같이 꼭 가보고 싶은 여행지는?', answers: {} },
  ],
  bucket: [
    { id: 'b1', category: 'eat', title: '오마카세 가보기', done: false },
    { id: 'b2', category: 'play', title: '방탈출 카페', done: true },
    { id: 'b3', category: 'go', title: '제주도 한 달 살기', done: false },
  ],
  places: [
    { id: 'p1', name: '서울', country: 'KR', region: '서울특별시', favorite: true },
    { id: 'p2', name: '오사카', country: 'JP', favorite: false },
  ],
  letters: [
    {
      id: 'l1',
      from: 'partner',
      date: '2026-02-14',
      title: '발렌타인 편지 💌',
      body: '항상 고마워! 앞으로도 잘 부탁해.',
      opened: false,
    },
  ],
  photos: [],
  events: [
    {
      id: 'e1',
      date: todayString(),
      title: '저녁 데이트',
      kind: 'date',
      owner: 'me',
      comments: [],
    },
  ],
  songs: [
    { id: 's1', from: 'partner', date: todayString(), title: '오늘의 노래', artist: '아티스트' },
  ],
  notes: [],
};

function useCoupleState() {
  const [state, setState] = useState<State>(initialState);

  const actions = useMemo(() => {
    const patch = (fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) }));

    return {
      setCouple: (couple: Partial<Couple>) => patch((s) => ({ couple: { ...s.couple, ...couple } })),
      setSecretMode: (secretMode: boolean) => patch(() => ({ secretMode })),

      pet: () => patch((s) => ({ petCount: s.petCount + 1, petRequestFrom: null })),
      requestPet: () => patch(() => ({ petRequestFrom: 'me' })),

      sendMessage: (text: string) =>
        patch((s) => ({
          messages: [
            ...s.messages,
            { id: newId(), from: 'me', text, createdAt: new Date().toISOString() },
          ],
        })),

      answerQuestion: (questionId: string, answer: string) =>
        patch((s) => ({
          questions: s.questions.map((q) =>
            q.id === questionId ? { ...q, answers: { ...q.answers, me: answer } } : q,
          ),
        })),
      addQuestion: (text: string) =>
        patch((s) => ({ questions: [{ id: newId(), text, answers: {} }, ...s.questions] })),

      addBucket: (category: BucketCategory, title: string) =>
        patch((s) => ({ bucket: [...s.bucket, { id: newId(), category, title, done: false }] })),
      toggleBucket: (id: string) =>
        patch((s) => ({ bucket: s.bucket.map((b) => (b.id === id ? { ...b, done: !b.done } : b)) })),

      addPlace: (place: Omit<Place, 'id' | 'favorite'>) =>
        patch((s) => ({ places: [...s.places, { ...place, id: newId(), favorite: false }] })),
      toggleFavoritePlace: (id: string) =>
        patch((s) => ({
          places: s.places.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
        })),

      writeLetter: (letter: Omit<Letter, 'id' | 'from' | 'opened'>) =>
        patch((s) => ({ letters: [...s.letters, { ...letter, id: newId(), from: 'me', opened: false }] })),
      openLetter: (id: string) =>
        patch((s) => ({ letters: s.letters.map((l) => (l.id === id ? { ...l, opened: true } : l)) })),

      addPhoto: (uri: string, date: string) =>
        patch((s) => ({ photos: [{ id: newId(), uri, date }, ...s.photos] })),

      addEvent: (event: Omit<CalendarEvent, 'id' | 'owner' | 'comments'>) =>
        patch((s) => ({ events: [...s.events, { ...event, id: newId(), owner: 'me', comments: [] }] })),
      commentEvent: (eventId: string, text: string) =>
        patch((s) => ({
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, comments: [...e.comments, { id: newId(), from: 'me', text }] }
              : e,
          ),
        })),

      pickSong: (song: Omit<SongPick, 'id' | 'from' | 'date'>) =>
        patch((s) => ({
          songs: [{ ...song, id: newId(), from: 'me', date: todayString() }, ...s.songs],
        })),

      addNote: (kind: PrivateNote['kind'], text: string) =>
        patch((s) => ({ notes: [...s.notes, { id: newId(), kind, text }] })),
      removeNote: (id: string) => patch((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    };
  }, []);

  return { ...state, ...actions };
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
