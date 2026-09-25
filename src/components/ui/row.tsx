import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/theme/tokens';

/** 가로 정렬 + 간격 */
export function Row({ style, ...rest }: ViewProps) {
  return <View style={[styles.row, style]} {...rest} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
});
