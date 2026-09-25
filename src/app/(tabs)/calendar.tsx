import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { todayString } from '@/lib/date';
import { useCouple } from '@/store/couple-store';
import type { CalendarEvent } from '@/types/models';
import { Radius } from '@/theme/tokens';

export default function CalendarScreen() {
  const { events, photos, couple, addEvent, commentEvent } = useCouple();
  const [date, setDate] = useState(todayString());
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CalendarEvent['kind']>('date');

  // 날짜별로 일정 + 그날 찍은 사진을 묶어서 보여줌 (앨범 ↔ 캘린더 연동)
  const days = useMemo(() => {
    const dates = new Set([...events.map((e) => e.date), ...photos.map((p) => p.date)]);
    return [...dates].sort().reverse().map((d) => ({
      date: d,
      events: events.filter((e) => e.date === d),
      photos: photos.filter((p) => p.date === d),
    }));
  }, [events, photos]);

  const add = () => {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    addEvent({ date, title: title.trim(), kind });
    setTitle('');
  };

  return (
    <Screen title="캘린더" subtitle="각자 일정과 데이트 기록">
      <Card>
        <Row>
          <Chip label="💑 데이트" selected={kind === 'date'} onPress={() => setKind('date')} />
          <Chip label="🙋 개인 일정" selected={kind === 'personal'} onPress={() => setKind('personal')} />
        </Row>
        <TextField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <TextField value={title} onChangeText={setTitle} placeholder="일정 제목" />
        <Button label="일정 추가" onPress={add} />
      </Card>

      {days.map((day) => (
        <Card key={day.date}>
          <ThemedText type="smallBold">{day.date}</ThemedText>
          {day.events.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              ownerName={event.owner === 'me' ? couple.myName : couple.partnerName}
              partnerName={couple.partnerName}
              onComment={(text) => commentEvent(event.id, text)}
            />
          ))}
          {day.photos.length > 0 ? (
            <Row>
              {day.photos.map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} />
              ))}
            </Row>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

function EventItem({
  event,
  ownerName,
  partnerName,
  onComment,
}: {
  event: CalendarEvent;
  ownerName: string;
  partnerName: string;
  onComment: (text: string) => void;
}) {
  const [comment, setComment] = useState('');
  return (
    <>
      <ThemedText>
        {event.kind === 'date' ? '💑' : '🙋'} {event.title}
        <ThemedText type="small" themeColor="textSecondary">
          {event.kind === 'personal' ? `  · ${ownerName}` : ''}
        </ThemedText>
      </ThemedText>
      {event.kind === 'date' ? (
        <>
          {event.comments.map((c) => (
            <ThemedText key={c.id} type="small" themeColor="textSecondary">
              {c.from === 'me' ? '나' : partnerName}: {c.text}
            </ThemedText>
          ))}
          <Row style={{ flexWrap: 'nowrap' }}>
            <TextField
              style={{ flex: 1 }}
              value={comment}
              onChangeText={setComment}
              placeholder="데이트 후기 남기기"
            />
            <Button
              label="등록"
              variant="secondary"
              onPress={() => {
                if (!comment.trim()) return;
                onComment(comment.trim());
                setComment('');
              }}
            />
          </Row>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64, borderRadius: Radius.sm },
});
