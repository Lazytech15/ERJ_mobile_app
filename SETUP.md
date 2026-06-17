# ⚠️ IMPORTANT — Run these commands in order

## 1. Delete everything old
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

## 2. Install
npm install

## 3. Start (MUST use --clear)
npx expo start --clear


## 4. build android / IOS
eas build --platform android --profile preview
eas build --platform ios --profile production
