import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { CoupleProvider } from '@/store/couple-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CoupleProvider>
        <Stack
          screenOptions={{
            headerTintColor: theme.primary,
            headerStyle: { backgroundColor: theme.background },
            headerTitleStyle: { color: theme.text },
            headerBackButtonDisplayMode: 'minimal',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="character" options={{ title: '캐릭터' }} />
          <Stack.Screen name="questions" options={{ title: '궁금한 거 질문' }} />
          <Stack.Screen name="bucket-list" options={{ title: '같이 하고 싶은 것' }} />
          <Stack.Screen name="places" options={{ title: '우리가 가본 곳' }} />
          <Stack.Screen name="letters" options={{ title: '편지함' }} />
          <Stack.Screen name="album" options={{ title: '사진 앨범' }} />
          <Stack.Screen name="music" options={{ title: '오늘의 노래' }} />
          <Stack.Screen name="notes" options={{ title: '나만 보는 메모' }} />
          <Stack.Screen name="settings" options={{ title: '설정' }} />
        </Stack>
      </CoupleProvider>
    </ThemeProvider>
  );
}
