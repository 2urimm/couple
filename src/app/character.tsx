import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { useCouple } from '@/store/couple-store';
import { Radius } from '@/theme/tokens';

const TRACK_WIDTH = 260;
const TARGET_SIZE = 48;

export default function CharacterScreen() {
  const { couple, petCount, petRequestFrom, pet, requestPet } = useCouple();
  const bounce = useRef(new Animated.Value(1)).current;

  const onPet = () => {
    pet();
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Screen>
      <Card style={styles.center}>
        {/* 캐릭터 이미지는 디자인 확정 후 교체 (Lottie / Rive / PNG 모두 가능) */}
        <Pressable onPress={onPet}>
          <Animated.Text style={[styles.character, { transform: [{ scale: bounce }] }]}>🐻</Animated.Text>
        </Pressable>
        <ThemedText>쓰다듬은 횟수: {petCount}</ThemedText>
        {petRequestFrom === 'partner' ? (
          <ThemedText themeColor="primary">{couple.partnerName}님이 예뻐해달래요! 눌러서 쓰다듬기</ThemedText>
        ) : null}
        <Button
          label={petRequestFrom === 'me' ? '요청 보냄 💗' : '예뻐해주세요 요청하기'}
          variant="secondary"
          disabled={petRequestFrom === 'me'}
          onPress={requestPet}
        />
      </Card>
      <HeartThrowGame />
    </Screen>
  );
}

/** 좌우로 움직이는 캐릭터에 타이밍 맞춰 하트 던지기 */
function HeartThrowGame() {
  const theme = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const [score, setScore] = useState({ hit: 0, miss: 0 });
  const [last, setLast] = useState<'hit' | 'miss' | null>(null);

  useEffect(() => {
    const id = x.addListener(({ value }) => (position.current = value));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: TRACK_WIDTH - TARGET_SIZE, duration: 900, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 900, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      x.removeListener(id);
    };
  }, [x]);

  const throwHeart = () => {
    const center = position.current + TARGET_SIZE / 2;
    const hit = Math.abs(center - TRACK_WIDTH / 2) < TARGET_SIZE / 2;
    setLast(hit ? 'hit' : 'miss');
    setScore((s) => (hit ? { ...s, hit: s.hit + 1 } : { ...s, miss: s.miss + 1 }));
  };

  return (
    <Card style={styles.center}>
      <ThemedText type="smallBold">💘 하트 던져서 맞히기</ThemedText>
      <View style={[styles.track, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={[styles.aim, { backgroundColor: theme.backgroundSelected }]} />
        <Animated.View style={[styles.target, { transform: [{ translateX: x }] }]}>
          <Text style={styles.targetEmoji}>🐻</Text>
        </Animated.View>
      </View>
      <ThemedText>{last === 'hit' ? '명중! 💗' : last === 'miss' ? '아깝다!' : '가운데 올 때 던져요'}</ThemedText>
      <Row>
        <Button label="하트 던지기 💗" onPress={throwHeart} />
        <ThemedText type="small" themeColor="textSecondary">
          명중 {score.hit} · 빗나감 {score.miss}
        </ThemedText>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  character: { fontSize: 120, lineHeight: 140 },
  track: {
    width: TRACK_WIDTH,
    height: TARGET_SIZE + 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aim: { position: 'absolute', left: TRACK_WIDTH / 2 - TARGET_SIZE / 2, width: TARGET_SIZE, top: 0, bottom: 0 },
  target: { width: TARGET_SIZE, height: TARGET_SIZE, alignItems: 'center', justifyContent: 'center' },
  targetEmoji: { fontSize: 32 },
});
