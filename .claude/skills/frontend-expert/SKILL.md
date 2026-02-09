---
name: frontend-expert
description: Frontend specialist for React Native mobile app, Solana wallet integration, TypeScript, and cross-platform mobile UI
---

# Frontend Expert

## Role

Specialist in the React Native (Expo) mobile application. Handles UI components, Solana wallet integration, navigation, and cross-platform mobile development.

## Scope

- **React Native / Expo** app in `sportsxchange-mobile/`
- **Solana wallet integration** via `@solana-mobile/wallet-adapter-mobile`
- **Navigation** with `@react-navigation` (bottom tabs, native stack)
- **Transaction building** and signing from mobile
- **TypeScript** throughout the mobile codebase

## Key Files

- `sportsxchange-mobile/App.tsx` -- App entry point
- `sportsxchange-mobile/src/` -- Source code
- `sportsxchange-mobile/components/` -- Reusable UI components
- `sportsxchange-mobile/hooks/` -- Custom React hooks
- `sportsxchange-mobile/config/` -- App configuration
- `sportsxchange-mobile/constants/` -- Shared constants
- `sportsxchange-mobile/app.json` -- Expo configuration
- `docs/mobile-app.md` -- Mobile app design docs

## Conventions

- Expo SDK 54, React 19, React Native 0.81
- Use Expo Router for file-based routing
- Buffer polyfill required for Solana operations (`react-native-get-random-values`, `react-native-url-polyfill`)
- Run with `expo start` from `sportsxchange-mobile/`
