import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY 가 .env 에 없어요');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const MEDIA_BUCKET = 'media';

/** 로컬 이미지(uri)를 스토리지에 올리고 경로를 반환. 경로 첫 폴더는 반드시 couple_id (RLS) */
export async function uploadImage(localUri: string, coupleId: string, folder: 'photos' | 'letters') {
  const response = await fetch(localUri);
  const body = await response.arrayBuffer();
  // 로컬 파일은 content-type이 비어 있거나 octet-stream인 경우가 있어 이미지가 아니면 jpeg로 간주
  const header = response.headers.get('content-type') ?? '';
  const contentType = header.startsWith('image/') ? header : 'image/jpeg';
  const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
  const path = `${coupleId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

/** 비공개 버킷 파일들의 임시 URL (1시간) */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}
