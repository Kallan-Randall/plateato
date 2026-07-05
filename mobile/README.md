# Plateato — Mobile

The React Native (Expo) client for Plateato. See the [project README](../README.md) for the full overview.

## Run locally

```bash
npm install
cp .env.example .env   # add your Supabase project URL and key
npx expo start         # press w for web, or use a development build on a device
```

## Structure

- `src/app/` — screens and navigation (Expo Router, file-based)
- `src/components/` — shared UI (themed primitives, buttons, inputs)
- `src/lib/` — Supabase client and the auth context
- `src/constants/theme.ts` — colors, spacing, typography
```
