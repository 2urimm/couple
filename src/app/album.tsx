import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { todayString } from '@/lib/date';
import { useCouple } from '@/store/couple-store';
import { Radius, Spacing } from '@/theme/tokens';

/**
 * 사진은 기기 메모리가 아닌 클라우드 스토리지에 올리고,
 * 목록에는 썸네일만 불러오는 방식으로 용량 문제를 피합니다 (docs/ARCHITECTURE.md 참고).
 */
export default function AlbumScreen() {
  const { photos, addPhoto } = useCouple();
  const [date, setDate] = useState(todayString());

  const byDate = useMemo(() => {
    const groups: Record<string, typeof photos> = {};
    for (const p of photos) (groups[p.date] ??= []).push(p);
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [photos]);

  const pick = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) result.assets.forEach((a) => addPhoto(a.uri, date));
  };

  return (
    <Screen subtitle="올린 사진은 캘린더의 같은 날짜에도 보여요">
      <Card>
        <TextField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Button label="사진 추가" onPress={pick} />
      </Card>
      {byDate.length === 0 ? <ThemedText themeColor="textSecondary">아직 사진이 없어요</ThemedText> : null}
      {byDate.map(([d, list]) => (
        <View key={d} style={styles.group}>
          <ThemedText type="smallBold">{d}</ThemedText>
          <View style={styles.grid}>
            {list.map((p) => (
              <Image key={p.id} source={{ uri: p.uri }} style={styles.photo} />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  photo: { width: '32%', aspectRatio: 1, borderRadius: Radius.sm },
});
