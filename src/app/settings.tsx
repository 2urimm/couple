import { useState } from 'react';
import { Switch } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';

export default function SettingsScreen() {
  const { couple, email, inviteCode, hasPartner, secretMode, setSecretMode, setMyName, setStartDate, signOut } =
    useCouple();
  const [name, setName] = useState(couple.myName);
  const [startDate, setStartDateText] = useState(couple.startDate);

  // 서버 값이 바뀌면(상대가 수정 등) 입력칸도 맞춰줌 — 렌더 중 조정 패턴
  const [synced, setSynced] = useState({ name: couple.myName, startDate: couple.startDate });
  if (synced.name !== couple.myName || synced.startDate !== couple.startDate) {
    setSynced({ name: couple.myName, startDate: couple.startDate });
    if (synced.name !== couple.myName) setName(couple.myName);
    if (synced.startDate !== couple.startDate) setStartDateText(couple.startDate);
  }

  const save = async () => {
    if (name.trim() && name.trim() !== couple.myName) await setMyName(name.trim());
    if (startDate !== couple.startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return;
      await setStartDate(startDate);
    }
  };

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <ThemedText type="smallBold">비밀연애 모드</ThemedText>
          <Switch
            value={secretMode}
            onValueChange={(value) => {
              setSecretMode(value);
            }}
          />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          켜면 채팅 알림이 오지 않아요. 잠금화면에 대화가 뜨지 않게 할 때 사용하세요.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">기본 정보</ThemedText>
        <TextField value={name} onChangeText={setName} placeholder="내 이름" />
        <TextField value={startDate} onChangeText={setStartDateText} placeholder="사귄 날 (YYYY-MM-DD)" />
        <ThemedText type="small" themeColor="textSecondary">
          상대 이름: {couple.partnerName || '아직 연결 전'} (상대가 직접 설정)
        </ThemedText>
        <Button label="저장" onPress={save} />
      </Card>

      {!hasPartner ? (
        <Card>
          <ThemedText type="smallBold">초대 코드</ThemedText>
          <ThemedText type="subtitle">{inviteCode}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            상대가 회원가입 후 이 코드를 입력하면 연결돼요.
          </ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          로그인: {email}
        </ThemedText>
        <Button label="로그아웃" variant="secondary" onPress={signOut} />
      </Card>
    </Screen>
  );
}
