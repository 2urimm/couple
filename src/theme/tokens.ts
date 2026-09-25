/**
 * 디자인 토큰 — 앱의 모든 색/간격/폰트/모서리 값은 여기서만 정의합니다.
 *
 * 디자인 컨셉이 정해지면 Figma(Dev Mode / Tokens Studio)에서 뽑은 값을
 * 이 파일에 옮기기만 하면 전체 화면에 반영됩니다. 화면 코드에 색상 hex 값을
 * 직접 쓰지 말고 항상 `useTheme()` 또는 이 토큰을 사용하세요.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1A1C',
    textSecondary: '#7A6E72',
    background: '#FFF9FA',
    backgroundElement: '#FFEFF2',
    backgroundSelected: '#FFDCE3',
    primary: '#FF6F91',
    onPrimary: '#FFFFFF',
    accent: '#8E7CFF',
    border: '#F2D9DF',
    danger: '#E5484D',
  },
  dark: {
    text: '#FFF4F6',
    textSecondary: '#BFAEB3',
    background: '#17131A',
    backgroundElement: '#241D26',
    backgroundSelected: '#35283A',
    primary: '#FF8FAB',
    onPrimary: '#1F1A1C',
    accent: '#A99BFF',
    border: '#3A2F3D',
    danger: '#FF6369',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
