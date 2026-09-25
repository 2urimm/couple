import { useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';
import type { PrivateNote } from '@/types/models';

const KINDS: { key: PrivateNote['kind']; label: string }[] = [
  { key: 'like', label: '좋아하는 것' },
  { key: 'dislike', label: '싫어하는 것' },
  { key: 'memo', label: '메모' },
];

/** 나만 볼 수 있는 메모 — 백엔드에서도 작성자 본인만 읽을 수 있게 권한을 걸어야 합니다. */
export default function NotesScreen() {
  const { notes, couple, addNote, removeNote } = useCouple();
  const [kind, setKind] = useState<PrivateNote['kind']>('like');
  const [text, setText] = useState('');

  return (
    <Screen subtitle={`${couple.partnerName}님은 이 메모를 볼 수 없어요`}>
      <Row>
        {KINDS.map((k) => (
          <Chip key={k.key} label={k.label} selected={k.key === kind} onPress={() => setKind(k.key)} />
        ))}
      </Row>
      <Card>
        <TextField value={text} onChangeText={setText} placeholder="예: 민트초코 싫어함" />
        <Button
          label="기록"
          onPress={() => {
            if (!text.trim()) return;
            addNote(kind, text.trim());
            setText('');
          }}
        />
      </Card>
      {KINDS.map((k) => {
        const list = notes.filter((n) => n.kind === k.key);
        if (list.length === 0) return null;
        return (
          <Card key={k.key}>
            <ThemedText type="smallBold">{k.label}</ThemedText>
            {list.map((n) => (
              <Pressable key={n.id} onLongPress={() => removeNote(n.id)}>
                <ThemedText>· {n.text}</ThemedText>
              </Pressable>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              길게 눌러서 삭제
            </ThemedText>
          </Card>
        );
      })}
    </Screen>
  );
}
