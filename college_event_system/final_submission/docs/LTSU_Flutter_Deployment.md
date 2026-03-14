# LTSU Flutter Deployment (Merged v6 + v7)

This merged document preserves full content from both source versions with no removals.

## Source Documents
- LTSU_Flutter_Deployment_v6.md
- LTSU_Flutter_Deployment_v7.md

## Content from LTSU_Flutter_Deployment_v6.md

# 📱 Flutter App Deployment Guide
## College Event Management System — Android Distribution
### APK Sideload + Firebase App Distribution | ₹0

---

> **Play Store requires a $25 fee — not covered here. We use APK sideload + Firebase (both free).**

---

## Overview

| Method | How | Cost | Best For |
|---|---|---|---|
| APK Sideload | Build APK → transfer to phone | Free | College submission, personal testing |
| Firebase Distribution | Upload APK → shareable link | Free | Share with testers and examiner |

> Complete Phases 1–5 before using either method — they are required for both.

---

## Phase 1 — App Icon & Splash Screen

### 1.1 App Icon
1. Create a **1024×1024 PNG** using [Canva](https://canva.com) (free)
2. Name it `app_icon.png` → place in `flutter_app/assets/images/`
3. Add to `pubspec.yaml`:

```yaml
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

4. Run in VS Code terminal:
```bash
flutter pub get
dart run flutter_launcher_icons
```

✅ Icons generated for all Android screen densities.

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

Update `lib/main.dart`:
```dart
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

## Phase 2 — App Versioning

```yaml
# pubspec.yaml
version: 1.0.0+1
#        ^^^^^  versionName (shown to users)
#              ^ versionCode (must increase each release)
```

| Release | Version |
|---|---|
| First release | 1.0.0+1 |
| Bug fix | 1.0.1+2 |
| New features | 1.1.0+3 |
| Major update | 2.0.0+4 |

> ⚠️ **Always increment versionCode before every new APK you distribute.**

---

## Phase 3 — Keystore Signing

> ⚠️ **Back up your keystore file and password to Google Drive immediately. Losing it means you can never update the app.**

### 3.1 Generate Keystore
```bash
# Run in VS Code terminal inside flutter_app folder
keytool -genkey -v -keystore ltsu_events.keystore ^
  -alias ltsu_events ^
  -keyalg RSA -keysize 2048 -validity 10000

# Enter when prompted:
# Password: (save this!)
# Name: Your Full Name
# Unit: Computer Science
# Org: LTSU
# City: Ludhiana  State: Punjab  Country: IN
# Confirm: yes
```

Move `ltsu_events.keystore` → `android/app/ltsu_events.keystore`

> ❌ **Add `android/app/ltsu_events.keystore` to .gitignore**

### 3.2 key.properties
Create `android/key.properties`:
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=ltsu_events
storeFile=ltsu_events.keystore
```

> ❌ **Add `android/key.properties` to .gitignore**

### 3.3 Configure android/app/build.gradle
Add at the **very top** before `android { }`:
```groovy
def keystoreProperties = new Properties()
def kpf = rootProject.file('key.properties')
if (kpf.exists()) { keystoreProperties.load(new FileInputStream(kpf)) }
```

Inside `android { }` add `signingConfigs` before `buildTypes`:
```groovy
signingConfigs {
  release {
    keyAlias keystoreProperties['keyAlias']
    keyPassword keystoreProperties['keyPassword']
    storeFile keystoreProperties['storeFile'] ?
      file(keystoreProperties['storeFile']) : null
    storePassword keystoreProperties['storePassword']
  }
}
```

Update `buildTypes { release { } }`:
```groovy
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

Open/create `android/app/proguard-rules.pro`:
```proguard
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

> ⚠️ **If app crashes after ProGuard: check logcat for class name → add -keep rule.**

---

## Phase 5 — Build APK

```bash
flutter clean
flutter pub get

# Build signed release APK
flutter build apk --release
# APK at: build/app/outputs/flutter-apk/app-release.apk

# OR build split APKs (smaller files — recommended)
flutter build apk --release --split-per-abi
# Use: app-arm64-v8a-release.apk (all modern Android phones)

# Verify signing
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
```

✅ **APK is built, signed, ProGuard applied, ready to distribute.**

---

## Method 1 — APK Sideload

> Best for college submission — hand the APK file directly to examiner.

### Transfer Methods
| Method | How |
|---|---|
| USB Cable | Connect phone → File Explorer → drag APK to Downloads |
| WhatsApp | Send APK to yourself → download on phone |
| Google Drive | Upload APK → Get shareable link → open on phone |
| Email | Attach APK → send to examiner |

### Enable Unknown Sources
| Android Version | Steps |
|---|---|
| Android 7 and below | Settings → Security → Unknown Sources → ON |
| Android 8, 9, 10 | Settings → Apps → Special App Access → Install Unknown Apps → File Manager → Allow |
| Android 11, 12, 13, 14 | Settings → Apps → Special App Access → Install Unknown Apps → Browser → Allow from this source |

1. Open file manager → navigate to Downloads → tap APK
2. Tap **Install** → wait → tap **Open**

✅ App installed. Unknown sources can be disabled again after installation.

---

## Method 2 — Firebase App Distribution

> Best for sharing with testers and examiner via a link — no file transfer needed.

### Step 1 — Enable App Distribution
Firebase Console → ltsu-events → **Release & Monitor → App Distribution → Get Started**

### Step 2 — Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
# Browser opens → sign in with Google
firebase projects:list
# ltsu-events should appear
```

### Step 3 — Get Firebase App ID
Firebase Console → Project Settings → General → Your Apps → Android → copy **App ID**
Format: `1:123456789012:android:abcdef1234567890`

### Step 4 — Upload APK
```bash
firebase appdistribution:distribute ^
  build/app/outputs/flutter-apk/app-release.apk ^
  --app YOUR_FIREBASE_APP_ID ^
  --release-notes "LTSU Events v1.0 - Initial release" ^
  --testers "examiner@ltsu.edu,tester@ltsu.edu"
```

### Step 5 — Share Install Link
1. Firebase Console → App Distribution → Releases → click release → copy **Invitation Link**
2. Share link via WhatsApp or email
3. Anyone with the link can install on their Android phone

### Step 6 — Publish Updates
```bash
# Update version in pubspec.yaml first (increment versionCode)
flutter clean && flutter build apk --release

firebase appdistribution:distribute ^
  build/app/outputs/flutter-apk/app-release.apk ^
  --app YOUR_APP_ID ^
  --release-notes "v1.1 - Bug fixes"
```

> Registered testers get notified automatically on every new upload.

---

## Final Checklist

### Preparation
- [ ] App icon PNG (1024×1024) in assets/images/
- [ ] flutter_launcher_icons run — all sizes generated
- [ ] Splash screen configured and generated
- [ ] Version set in pubspec.yaml (e.g. 1.0.0+1)
- [ ] Keystore generated and in android/app/
- [ ] key.properties created with correct passwords
- [ ] build.gradle configured with signingConfigs
- [ ] proguard-rules.pro configured
- [ ] Keystore + passwords backed up to Google Drive
- [ ] Both keystore and key.properties in .gitignore
- [ ] flutter build apk --release runs without errors

### Method 1 — Sideload
- [ ] APK transferred to phone
- [ ] Unknown sources enabled
- [ ] App installs and opens successfully
- [ ] All features tested on real device
- [ ] APK included in college submission zip

### Method 2 — Firebase
- [ ] Firebase App Distribution enabled
- [ ] Firebase CLI installed and logged in
- [ ] APK uploaded with release notes
- [ ] Testers added by email
- [ ] Install link working
- [ ] Tester successfully installed via link

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| Keystore not found | Wrong path in key.properties | Check storeFile matches filename in android/app/ |
| App crashes after ProGuard | Required class removed | Check logcat → add -keep rule for crashing class |
| firebase: not found | CLI not installed | `npm install -g firebase-tools` in VS Code terminal |
| APK size over 100MB | No split APKs | Use --split-per-abi → submit arm64-v8a APK |
| Unknown sources greyed out | Phone admin policy | Try Chrome browser to install instead |
| Tester email not received | Spam folder | Ask tester to check spam, re-add in Firebase Console |


## Content from LTSU_Flutter_Deployment_v7.md

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

