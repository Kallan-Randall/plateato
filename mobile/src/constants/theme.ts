/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Plateato "Fresh & appetizing" palette.
 * Green = freshness/reduce-waste, warm coral/amber accents = appetite.
 * Exact shades are a starting point and may be refined during build.
 */
export const Colors = {
  light: {
    // Base neutrals
    text: '#16261C', // deep green-charcoal
    textSecondary: '#5C6B62', // muted
    background: '#F6FBF6', // page bg, faint green tint
    backgroundElement: '#FFFFFF', // cards / surfaces
    backgroundSelected: '#E3EFE6', // pressed / selected
    border: '#E2EAE4',
    // Brand
    primary: '#2F8F5B', // fresh green
    primaryDark: '#1C5C39',
    onPrimary: '#FFFFFF', // text/icons on primary
    accent: '#F0784B', // coral
    amber: '#F4B740',
    // Status (expiration, alerts)
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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
