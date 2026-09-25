import { Tabs } from 'expo-router';

/** 아이콘·색은 디자인 확정 후 추가 (지금은 글자 탭만) */
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarIcon: () => null, tabBarIconStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="chat" options={{ title: '채팅' }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더' }} />
      <Tabs.Screen name="more" options={{ title: '우리' }} />
    </Tabs>
  );
}
