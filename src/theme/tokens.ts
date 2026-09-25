/**
 * 디자인 토큰 — 앱의 모든 색/간격 값은 여기서만 정의합니다.
 *
 * 디자인은 아직 협의 전이라 흑백 기본값만 둡니다(다크 모드·폰트·모서리 없음).
 * 디자인이 정해지면 Figma(Dev Mode / Tokens Studio)에서 뽑은 값을 이 파일에
 * 채우면 전체 화면에 반영됩니다. 화면 코드에 색상 hex 값을 직접 쓰지 말고
 * 항상 `useTheme()` 또는 이 토큰을 사용하세요.
 */

export const Colors = {
  text: '#000000',
  textSecondary: '#666666',
  background: '#FFFFFF',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#EEEEEE',
  primary: '#000000',
  onPrimary: '#FFFFFF',
  border: '#CCCCCC',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
