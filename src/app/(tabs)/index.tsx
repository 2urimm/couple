import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { daysTogether, nextMilestone } from '@/lib/date';
import { useCouple } from '@/store/couple-store';

export default function HomeScreen() {
  const { couple, petRequestFrom, songs, secretMode, hasPartner, inviteCode } = useCouple();
  const days = daysTogether(couple.startDate);
  const milestone = nextMilestone(couple.startDate);
  const todaySong = songs[0];

  return (
    <Screen>
      <Card style={styles.dday}>
        <ThemedText themeColor="textSecondary">
          {couple.myName} ♥ {couple.partnerName || '?'}
          {secretMode ? '  · 🤫 비밀연애 중' : ''}
        </ThemedText>
        <ThemedText type="title" themeColor="primary">
          D+{days}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {milestone.day}일까지 {milestone.remaining}일 남았어요 ({milestone.date})
        </ThemedText>
      </Card>

      {!hasPartner ? (
        <Card>
          <ThemedText type="smallBold">💌 상대를 초대하세요</ThemedText>
          <ThemedText type="subtitle">{inviteCode}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            상대가 회원가입 후 이 코드를 입력하면 연결돼요.
          </ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="smallBold">🐻 우리 캐릭터</ThemedText>
        {petRequestFrom === 'partner' ? (
          <ThemedText>{couple.partnerName}님이 예뻐해달래요! 🥺</ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">오늘도 예뻐해주기</ThemedText>
        )}
        <Link href="/character" asChild>
          <Button label="캐릭터 보러 가기" />
        </Link>
      </Card>

      {todaySong ? (
        <Link href="/music" asChild>
          <Card>
            <ThemedText type="smallBold">🎵 오늘의 노래</ThemedText>
            <ThemedText>
              {todaySong.title} — {todaySong.artist}
            </ThemedText>
          </Card>
        </Link>
      ) : null}

      <Row>
        <Link href="/questions" asChild>
          <Button label="오늘의 질문" variant="secondary" />
        </Link>
        <Link href="/letters" asChild>
          <Button label="편지함" variant="secondary" />
        </Link>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dday: { alignItems: 'center', paddingVertical: 32 },
});
