import { Switch } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { useCouple } from '@/store/couple-store';

export default function SettingsScreen() {
  const { couple, secretMode, setSecretMode, setCouple } = useCouple();
  const theme = useTheme();

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <ThemedText type="smallBold">🤫 비밀연애 모드</ThemedText>
          <Switch
            value={secretMode}
            onValueChange={setSecretMode}
            trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
          />
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          켜면 채팅 알림이 오지 않아요. 잠금화면에 대화가 뜨지 않게 할 때 사용하세요.
        </ThemedText>
      </Card>
      <Card>
        <ThemedText type="smallBold">기본 정보</ThemedText>
        <TextField value={couple.myName} onChangeText={(myName) => setCouple({ myName })} placeholder="내 이름" />
        <TextField
          value={couple.partnerName}
          onChangeText={(partnerName) => setCouple({ partnerName })}
          placeholder="애인 이름"
        />
        <TextField
          value={couple.startDate}
          onChangeText={(startDate) => setCouple({ startDate })}
          placeholder="사귄 날 (YYYY-MM-DD)"
        />
      </Card>
    </Screen>
  );
}
