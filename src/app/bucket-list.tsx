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
import type { BucketCategory } from '@/types/models';

const CATEGORIES: { key: BucketCategory; label: string }[] = [
  { key: 'eat', label: '🍽️ 먹는 거' },
  { key: 'play', label: '🎡 노는 거' },
  { key: 'go', label: '✈️ 가는 거' },
];

export default function BucketListScreen() {
  const { bucket, addBucket, toggleBucket } = useCouple();
  const [category, setCategory] = useState<BucketCategory>('eat');
  const [title, setTitle] = useState('');
  const items = bucket.filter((b) => b.category === category);

  return (
    <Screen>
      <Row>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} selected={c.key === category} onPress={() => setCategory(c.key)} />
        ))}
      </Row>
      <Card>
        <TextField value={title} onChangeText={setTitle} placeholder="같이 하고 싶은 것" />
        <Button
          label="추가"
          onPress={() => {
            if (!title.trim()) return;
            addBucket(category, title.trim());
            setTitle('');
          }}
        />
      </Card>
      <Card>
        {items.length === 0 ? <ThemedText themeColor="textSecondary">아직 없어요</ThemedText> : null}
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => toggleBucket(item.id)}>
            <ThemedText
              themeColor={item.done ? 'textSecondary' : 'text'}
              style={item.done ? { textDecorationLine: 'line-through' } : undefined}>
              {item.done ? '☑️' : '⬜️'} {item.title}
            </ThemedText>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
