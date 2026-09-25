import { useState } from 'react';
import { Linking } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';

/**
 * 오늘의 노래 추천(오노추).
 * - 지금은 수동 입력 + 링크(YouTube Music / Spotify 등) 방식.
 * - "지금 듣는 노래" 자동 표시: YouTube Music은 공식 API가 없어 불가,
 *   Spotify는 Web API(currently-playing)로 가능 → docs/ARCHITECTURE.md 참고.
 */
export default function MusicScreen() {
  const { songs, couple, pickSong } = useCouple();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');

  return (
    <Screen subtitle="오늘 서로에게 추천하는 노래">
      <Card>
        <TextField value={title} onChangeText={setTitle} placeholder="노래 제목" />
        <TextField value={artist} onChangeText={setArtist} placeholder="아티스트" />
        <TextField value={url} onChangeText={setUrl} placeholder="링크 (선택)" autoCapitalize="none" />
        <Button
          label="추천하기"
          onPress={() => {
            if (!title.trim()) return;
            pickSong({ title: title.trim(), artist: artist.trim(), url: url.trim() || undefined });
            setTitle('');
            setArtist('');
            setUrl('');
          }}
        />
      </Card>
      {songs.map((s) => (
        <Card key={s.id}>
          <ThemedText type="small" themeColor="textSecondary">
            {s.date} · {s.from === 'me' ? couple.myName : couple.partnerName}의 추천
          </ThemedText>
          <ThemedText type="smallBold">
            {s.title} {s.artist ? `— ${s.artist}` : ''}
          </ThemedText>
          {s.url ? <Button label="듣기" variant="secondary" onPress={() => Linking.openURL(s.url!)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
