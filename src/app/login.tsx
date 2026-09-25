import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';

export default function LoginScreen() {
  const { signIn, signUp } = useCouple();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) return;
    if (mode === 'signUp' && !name.trim()) return;
    setBusy(true);
    if (mode === 'signIn') await signIn(email.trim(), password);
    else await signUp(email.trim(), password, name.trim());
    setBusy(false);
  };

  return (
    <Screen title="💕 커플앱" subtitle="둘만의 공간">
      <Row>
        <Chip label="로그인" selected={mode === 'signIn'} onPress={() => setMode('signIn')} />
        <Chip label="회원가입" selected={mode === 'signUp'} onPress={() => setMode('signUp')} />
      </Row>
      <Card>
        {mode === 'signUp' ? <TextField value={name} onChangeText={setName} placeholder="이름 (상대에게 보일 이름)" /> : null}
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호 (6자 이상)"
          secureTextEntry
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
        />
        <Button label={mode === 'signIn' ? '로그인' : '가입하기'} onPress={submit} disabled={busy} />
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        가입 후 한 명이 초대 코드를 만들고, 다른 한 명이 그 코드를 입력하면 연결돼요.
      </ThemedText>
    </Screen>
  );
}
