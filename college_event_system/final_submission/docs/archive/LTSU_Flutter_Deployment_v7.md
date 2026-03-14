# 📱 Flutter App Deployment Guide v7
## College Event Management System — Android Distribution
### APK Sideload + Firebase App Distribution | ₹0

---

> **Play Store requires a $25 fee — not covered. We use APK + Firebase Distribution (both free).**

---

## Overview

| Method | How | Cost | Best For |
|---|---|---|---|
| APK Sideload | Build APK → transfer to phone | Free | College submission |
| Firebase Distribution | Upload APK → shareable link | Free | Share with testers remotely |

> Complete Phases 1–5 before either method.

---

## Phase 1 — App Icon & Splash Screen

### 1.1 App Icon
```yaml
# pubspec.yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1

flutter_icons:
  android: true
  ios: false
  image_path: 'assets/images/app_icon.png'
  adaptive_icon_background: '#0D9488'
  adaptive_icon_foreground: 'assets/images/app_icon.png'
  min_sdk_android: 21
```
```bash
# Create 1024x1024 PNG at canva.com → save as assets/images/app_icon.png
flutter pub get
dart run flutter_launcher_icons
```

### 1.2 Splash Screen
```yaml
dev_dependencies:
  flutter_native_splash: ^2.3.10

flutter_native_splash:
  color: '#1F2937'
  image: assets/images/app_icon.png
  android_12:
    color: '#1F2937'
    image: assets/images/app_icon.png
    icon_background_color: '#0D9488'
  fullscreen: true
  android: true
  ios: false
```
```bash
dart run flutter_native_splash:create
```
```dart
// lib/main.dart
import 'package:flutter_native_splash/flutter_native_splash.dart';
void main() async {
  WidgetsBinding wb = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: wb);
  await Firebase.initializeApp();
  runApp(const MyApp());
  FlutterNativeSplash.remove();
}
```

---

## Phase 2 — Versioning

```yaml
# pubspec.yaml
version: 1.0.0+1
#        ^^^^^  versionName
#              ^ versionCode (must increase each release)
```

---

## Phase 3 — Keystore Signing

> ⚠️ Back up keystore + password to Google Drive immediately.

### 3.1 Generate Keystore
```bash
keytool -genkey -v -keystore ltsu_events.keystore ^
  -alias ltsu_events -keyalg RSA -keysize 2048 -validity 10000
# Move to: android/app/ltsu_events.keystore
```

### 3.2 android/key.properties
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=ltsu_events
storeFile=ltsu_events.keystore
```
> ❌ Add both files to .gitignore

### 3.3 android/app/build.gradle
```groovy
// Add BEFORE android { }
def keystoreProperties = new Properties()
def kpf = rootProject.file('key.properties')
if (kpf.exists()) { keystoreProperties.load(new FileInputStream(kpf)) }

// Inside android { } — add signingConfigs before buildTypes
signingConfigs {
  release {
    keyAlias keystoreProperties['keyAlias']
    keyPassword keystoreProperties['keyPassword']
    storeFile keystoreProperties['storeFile'] ?
      file(keystoreProperties['storeFile']) : null
    storePassword keystoreProperties['storePassword']
  }
}

// Inside buildTypes { release { } }
release {
  signingConfig signingConfigs.release
  minifyEnabled true
  shrinkResources true
  proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
      'proguard-rules.pro'
}
```

---

## Phase 4 — ProGuard

```proguard
# android/app/proguard-rules.pro
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.journeyapps.barcodescanner.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
```

---

## Phase 5 — Build APK

```bash
flutter clean && flutter pub get

# Build (recommended — split by CPU)
flutter build apk --release --split-per-abi
# Use: app-arm64-v8a-release.apk

# Verify signing
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
```

---

## Method 1 — APK Sideload

### Transfer Methods
| Method | Steps |
|---|---|
| USB Cable | Connect phone → File Explorer → drag APK to Downloads |
| WhatsApp | Send APK to yourself → download on phone |
| Google Drive | Upload → Get shareable link → open on phone |
| Email | Attach APK → send to examiner |

### Enable Unknown Sources
| Android Version | Steps |
|---|---|
| Android 7 | Settings → Security → Unknown Sources → ON |
| Android 8–10 | Settings → Apps → Special App Access → Install Unknown Apps → File Manager → Allow |
| Android 11–14 | Settings → Apps → Special App Access → Install Unknown Apps → Browser → Allow |

---

## Method 2 — Firebase App Distribution

### Setup
```bash
npm install -g firebase-tools
firebase login
firebase projects:list   # ltsu-events should appear
```

### Upload APK
```bash
firebase appdistribution:distribute ^
  build/app/outputs/flutter-apk/app-arm64-v8a-release.apk ^
  --app YOUR_FIREBASE_APP_ID ^
  --release-notes "LTSU Events v1.0 - Initial release" ^
  --testers "examiner@ltsu.edu,tester@ltsu.edu"
```

### Get Shareable Link
```
Firebase Console → App Distribution → Releases → click release → copy Invitation Link
Share via WhatsApp or email
```

### Push Updates
```bash
# Increment versionCode in pubspec.yaml first
flutter clean && flutter build apk --release --split-per-abi
firebase appdistribution:distribute ^
  build/app/outputs/flutter-apk/app-arm64-v8a-release.apk ^
  --app YOUR_APP_ID --release-notes "v1.1 - Bug fixes"
# Testers notified automatically
```

---

## Final Checklist

### Preparation
- [ ] App icon (1024×1024 PNG) created
- [ ] flutter_launcher_icons run
- [ ] Splash screen generated
- [ ] Version set (e.g. 1.0.0+1)
- [ ] Keystore generated + backed up to Google Drive
- [ ] key.properties created
- [ ] build.gradle configured
- [ ] proguard-rules.pro configured
- [ ] Keystore + key.properties in .gitignore
- [ ] `flutter build apk --release` succeeds

### Method 1 — Sideload
- [ ] APK transferred to phone
- [ ] Unknown sources enabled
- [ ] App installs and all features work
- [ ] APK in college submission zip

### Method 2 — Firebase
- [ ] Firebase CLI installed
- [ ] APK uploaded
- [ ] Testers added by email
- [ ] Install link working

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| Keystore not found | Wrong path | Check storeFile in key.properties |
| Crash after ProGuard | Class removed | Check logcat → add -keep rule |
| firebase: not found | CLI missing | `npm install -g firebase-tools` |
| APK over 100MB | No split | Use --split-per-abi |
| Unknown sources greyed | Admin policy | Try Chrome browser to install |
| Tester email missing | Spam | Check spam folder |
