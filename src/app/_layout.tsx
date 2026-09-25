import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { CoupleProvider, useCouple } from '@/store/couple-store';

// 로그인 상태를 확인하는 동안 스플래시 화면 유지
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <CoupleProvider>
      <RootStack />
    </CoupleProvider>
  );
}

function RootStack() {
  const { status } = useCouple();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={status === 'signedOut' || status === 'loading'}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'noCouple'}>
        <Stack.Screen name="pair" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="questions" options={{ title: '궁금한 거 질문' }} />
        <Stack.Screen name="bucket-list" options={{ title: '같이 하고 싶은 것' }} />
        <Stack.Screen name="places" options={{ title: '우리가 가본 곳' }} />
        <Stack.Screen name="letters" options={{ title: '편지함' }} />
        <Stack.Screen name="album" options={{ title: '사진 앨범' }} />
        <Stack.Screen name="music" options={{ title: '오늘의 노래' }} />
        <Stack.Screen name="notes" options={{ title: '나만 보는 메모' }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
      </Stack.Protected>
    </Stack>
  );
}
