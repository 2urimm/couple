/** 앱 도메인 모델. 나중에 백엔드(Supabase 등) 테이블 스키마와 1:1로 맞추면 됩니다. */

export type UserId = 'me' | 'partner';

export type Couple = {
  myName: string;
  partnerName: string;
  /** 사귀기 시작한 날 (YYYY-MM-DD) */
  startDate: string;
};

export type ChatMessage = {
  id: string;
  from: UserId;
  text: string;
  createdAt: string;
};

export type Question = {
  id: string;
  text: string;
  answers: Partial<Record<UserId, string>>;
};

export type BucketCategory = 'eat' | 'play' | 'go';

export type BucketItem = {
  id: string;
  category: BucketCategory;
  title: string;
  done: boolean;
};

export type Place = {
  id: string;
  name: string;
  /** 'KR' 처럼 국가 코드. 국내 지역은 region에 */
  country: string;
  region?: string;
  favorite: boolean;
  visitedAt?: string;
};

export type Letter = {
  id: string;
  from: UserId;
  /** 편지 날짜 (YYYY-MM-DD) — 날짜별로 정렬/보관 */
  date: string;
  title: string;
  body?: string;
  /** 손편지 스캔 이미지 */
  imageUri?: string;
  opened: boolean;
};

export type Photo = {
  id: string;
  uri: string;
  /** 캘린더와 연결되는 날짜 (YYYY-MM-DD) */
  date: string;
  caption?: string;
};

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  kind: 'personal' | 'date';
  owner: UserId;
  /** 데이트 후기 댓글 */
  comments: { id: string; from: UserId; text: string }[];
};

export type SongPick = {
  id: string;
  from: UserId;
  date: string;
  title: string;
  artist: string;
  url?: string;
};

export type PrivateNote = {
  id: string;
  kind: 'like' | 'dislike' | 'memo';
  text: string;
};
