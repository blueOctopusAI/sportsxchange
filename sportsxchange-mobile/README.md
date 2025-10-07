# SportsXchange Mobile App

## 📱 React Native Trading App for SportsXchange AMM

This is the mobile client for the SportsXchange prediction market AMM on Solana.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on your phone (for testing)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# For iOS
npm run ios

# For Android
npm run android
```

## 📲 Testing on Your Phone

1. Install **Expo Go** from App Store/Google Play
2. Run `npm start` in terminal
3. Scan the QR code with:
   - iPhone: Camera app
   - Android: Expo Go app

## 🏗️ Architecture

```
src/
├── SportsXchangeClient.ts  # Blockchain interaction layer
├── components/            # React Native components
├── screens/              # App screens
└── utils/               # Helper functions

App.tsx                  # Main app entry point
index.ts                # Polyfills and registration
```

## ✨ Features

- **Wallet Connection**: Connect via Phantom/Solflare mobile
- **Market View**: See all active prediction markets
- **Live Prices**: Real-time probability updates
- **Trading**: Swap HOME/AWAY tokens
- **Portfolio**: Track your positions
- **Pull to Refresh**: Update market data

## 🔧 Configuration

### RPC Endpoint
Edit `App.tsx` to change RPC:
```typescript
const RPC_URL = 'http://localhost:8899'; // Change to your RPC
```

### Program ID
Update in `App.tsx`:
```typescript
const PROGRAM_ID = new PublicKey('7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH');
```

## 🎨 Styling

The app uses React Native's built-in StyleSheet with a dark theme:
- Background: #0a0a0a
- Cards: #111
- Accent: #4CAF50 (green)
- Secondary: #2196F3 (blue)

## 📝 TODO

- [ ] Add trading screens with order forms
- [ ] Implement chart visualization
- [ ] Add portfolio tracking
- [ ] Push notifications for price changes
- [ ] Biometric authentication
- [ ] Offline mode support

## 🚢 Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### EAS Build (Recommended)
```bash
npm install -g eas-cli
eas build --platform all
```

## 🐛 Troubleshooting

### "Unable to resolve module" errors
```bash
npm install
cd ios && pod install  # iOS only
```

### Metro bundler issues
```bash
npx react-native start --reset-cache
```

### Connection issues
Make sure your phone and computer are on the same network.

## 📱 Wallet Integration

The app uses Solana Mobile Wallet Adapter for secure wallet connections:
- Phantom
- Solflare
- Backpack
- Any MWA-compatible wallet

## 🔒 Security

- Never hardcode private keys
- Use secure wallet connections only
- All transactions require user approval
- Biometric auth recommended for production

## 📄 License

MIT
