// Design-token values only — copied from mobile/src/constants/theme.ts.
// Excludes Fonts and BottomTabInset, which use React Native's Platform.select
// and have no web equivalent. Mobile stays the source of truth for those.

export const Colors = {
  light: {
    text: '#16261C',
    textSecondary: '#5C6B62',
    background: '#F6FBF6',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3EFE6',
    border: '#E2EAE4',
    primary: '#2F8F5B',
    primaryDark: '#1C5C39',
    onPrimary: '#FFFFFF',
    accent: '#F0784B',
    amber: '#F4B740',
    success: '#2F8F5B',
    warning: '#E0962A',
    danger: '#D1483C',
  },
  dark: {
    text: '#EAF3EC',
    textSecondary: '#9CB0A4',
    background: '#0F1511',
    backgroundElement: '#18211B',
    backgroundSelected: '#24302A',
    border: '#28332C',
    primary: '#3DA76B',
    primaryDark: '#2F8F5B',
    onPrimary: '#FFFFFF',
    accent: '#F2865C',
    amber: '#F4B740',
    success: '#3DA76B',
    warning: '#E0A23E',
    danger: '#E0594B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
