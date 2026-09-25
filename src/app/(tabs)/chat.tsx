import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { useCouple } from '@/store/couple-store';
import { Radius, Spacing } from '@/theme/tokens';

export default function ChatScreen() {
  const { messages, sendMessage, secretMode } = useCouple();
  const [text, setText] = useState('');
  const theme = useTheme();

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Screen scroll={false}>
        {secretMode ? (
          <ThemedText type="small" themeColor="textSecondary">
            🤫 비밀연애 모드: 채팅 알림이 가지 않아요
          </ThemedText>
        ) : null}
        <FlatList
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ gap: Spacing.two }}
          renderItem={({ item }) => {
            const mine = item.from === 'me';
            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { alignSelf: 'flex-end', backgroundColor: theme.primary }
                    : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText style={mine ? { color: theme.onPrimary } : undefined}>{item.text}</ThemedText>
              </View>
            );
          }}
        />
        <Row style={styles.inputRow}>
          <TextField
            style={styles.flex}
            value={text}
            onChangeText={setText}
            placeholder="메시지 보내기"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Button label="전송" onPress={send} />
        </Row>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  inputRow: { flexWrap: 'nowrap' },
});
