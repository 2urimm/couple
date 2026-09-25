import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';

/** 로그인은 했지만 아직 커플이 연결되지 않았을 때 */
export default function PairScreen() {
  const { createCouple, joinCouple, signOut, email } = useCouple();
  const [code, setCode] = useState('');
  const [firstDay, setFirstDay] = useState('2026-08-14');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <Screen title="커플 연결" subtitle={email}>
      <Card>
        <ThemedText type="smallBold">초대 코드 받았어요</ThemedText>
        <TextField
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder="6자리 코드"
          autoCapitalize="characters"
          maxLength={6}
        />
        <Button label="연결하기" disabled={busy || code.length !== 6} onPress={() => act(() => joinCouple(code))} />
      </Card>
      <Card>
        <ThemedText type="smallBold">내가 먼저 시작할게요</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          사귄 날을 확인하고 초대 코드를 만들어 상대에게 보내주세요. 코드와 날짜는 설정에서 다시 볼 수 있어요.
        </ThemedText>
        <TextField value={firstDay} onChangeText={setFirstDay} placeholder="사귄 날 (YYYY-MM-DD)" />
        <Button
          label="초대 코드 만들기"
          variant="secondary"
          disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(firstDay)}
          onPress={() => act(() => createCouple(firstDay))}
        />
      </Card>
      <Button label="로그아웃" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
