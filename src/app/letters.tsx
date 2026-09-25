import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { todayString } from '@/lib/date';
import { useCouple } from '@/store/couple-store';

export default function LettersScreen() {
  const { letters, couple, writeLetter, openLetter } = useCouple();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string>();

  const sorted = [...letters].sort((a, b) => b.date.localeCompare(a.date));

  const pickScan = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const send = () => {
    if (!title.trim() || (!body.trim() && !imageUri)) return;
    writeLetter({ date: todayString(), title: title.trim(), body: body.trim() || undefined, imageUri });
    setTitle('');
    setBody('');
    setImageUri(undefined);
  };

  return (
    <Screen subtitle="열어보기 전까지는 내용이 보이지 않아요">
      <Card>
        <ThemedText type="smallBold">편지 쓰기</ThemedText>
        <TextField value={title} onChangeText={setTitle} placeholder="제목" />
        <TextField value={body} onChangeText={setBody} placeholder="내용" multiline style={styles.body} />
        <Row>
          <Button label={imageUri ? '손편지 변경' : '손편지 스캔 첨부'} variant="secondary" onPress={pickScan} />
          <Button label="보내기" onPress={send} />
        </Row>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.scan} contentFit="contain" /> : null}
      </Card>

      {sorted.map((letter) => {
        const sender = letter.from === 'me' ? couple.myName : couple.partnerName;
        const canOpen = letter.from === 'partner' && !letter.opened;
        return (
          <Pressable key={letter.id} disabled={!canOpen} onPress={() => openLetter(letter.id)}>
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                {letter.date} · {sender}
              </ThemedText>
              <ThemedText type="smallBold">{letter.title}</ThemedText>
              {letter.from === 'partner' && !letter.opened ? (
                <ThemedText>눌러서 열어보기</ThemedText>
              ) : (
                <>
                  {letter.body ? <ThemedText>{letter.body}</ThemedText> : null}
                  {letter.imageUri ? (
                    <Image source={{ uri: letter.imageUri }} style={styles.scan} contentFit="contain" />
                  ) : null}
                  {letter.from === 'me' ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {letter.opened ? '읽음' : '아직 안 읽음'}
                    </ThemedText>
                  ) : null}
                </>
              )}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { minHeight: 120, textAlignVertical: 'top' },
  scan: { width: '100%', aspectRatio: 3 / 4 },
});
