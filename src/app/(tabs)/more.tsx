import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/theme/tokens';

const MENU: { href: Href; title: string; desc: string }[] = [
  { href: '/questions', title: '궁금한 거 질문', desc: '내가 답해야 상대 답이 보여요' },
  { href: '/bucket-list', title: '같이 하고 싶은 것', desc: '먹는 거 · 노는 거 · 가는 거' },
  { href: '/places', title: '우리가 가본 곳', desc: '지역 · 국가 즐겨찾기' },
  { href: '/letters', title: '편지함', desc: '날짜별 보관 · 손편지 스캔' },
  { href: '/album', title: '사진 앨범', desc: '캘린더와 날짜 연동' },
  { href: '/music', title: '오늘의 노래', desc: '오노추 · 지금 듣는 노래' },
  { href: '/notes', title: '나만 보는 메모', desc: '상대 취향 기록 (상대는 못 봐요)' },
  { href: '/settings', title: '설정', desc: '비밀연애 모드 · 기념일' },
];

export default function MoreScreen() {
  return (
    <Screen title="우리">
      {MENU.map((item) => (
        <Link key={item.title} href={item.href} asChild>
          <Pressable>
            <Card style={styles.item}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.desc}
              </ThemedText>
            </Card>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { gap: Spacing.half },
});
