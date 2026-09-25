import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';

/**
 * 가본 지역/국가 목록 + 즐겨찾기.
 * TODO: 지도 표시는 react-native-maps(개발 빌드 필요) 또는
 *       국가별 SVG 세계지도에 색칠하는 방식으로 확장.
 */
export default function PlacesScreen() {
  const { places, addPlace, toggleFavoritePlace } = useCouple();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('KR');

  const byCountry = useMemo(() => {
    const groups: Record<string, typeof places> = {};
    for (const p of places) (groups[p.country] ??= []).push(p);
    return groups;
  }, [places]);

  return (
    <Screen subtitle={`${Object.keys(byCountry).length}개국 · ${places.length}곳`}>
      <Card>
        <TextField value={name} onChangeText={setName} placeholder="장소 / 도시 이름" />
        <TextField
          value={country}
          onChangeText={(v) => setCountry(v.toUpperCase())}
          placeholder="국가 코드 (예: KR, JP)"
          autoCapitalize="characters"
          maxLength={2}
        />
        <Button
          label="가본 곳 추가"
          onPress={() => {
            if (!name.trim() || country.length !== 2) return;
            addPlace({ name: name.trim(), country });
            setName('');
          }}
        />
      </Card>
      {Object.entries(byCountry).map(([code, list]) => (
        <Card key={code}>
          <ThemedText type="smallBold">{code}</ThemedText>
          {list.map((p) => (
            <Row key={p.id}>
              <Pressable onPress={() => toggleFavoritePlace(p.id)} hitSlop={8}>
                <ThemedText>{p.favorite ? '⭐️' : '☆'}</ThemedText>
              </Pressable>
              <ThemedText>
                {p.name}
                {p.region ? ` · ${p.region}` : ''}
              </ThemedText>
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
