# Flutter App (LTSU Events)

This Flutter app is designed to use the same authentication as the web app (Clerk JWT).

## Local Setup

1. Install Flutter and add it to PATH.
2. Run:

```bash
flutter pub get
flutter run
```

## Authentication (No Dummy Logins)

This app does not use email/password auth.

1. Create a real account in the Next.js web app (Clerk).
2. Obtain a real Clerk JWT token for your session.
3. Paste the token into the Flutter Login screen.

The app will then call `/api/auth/me` on the Flask API to validate the token and load your role.

## API Base URL

Default emulator URL is in `lib/config/api_config.dart`:
- `http://10.0.2.2:5000/api` for Android emulator hitting localhost

