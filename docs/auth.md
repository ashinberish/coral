# Authentication

Sign-in is **required** (onboarding). Users sign in with **Apple** or **Google** on the phone;
the API verifies the provider's ID token and issues **its own** tokens.

```
App ──(Apple identityToken + raw nonce │ Google idToken)──► POST /v1/auth/{apple,google}
API: verify RS256 signature (provider JWKS), iss, aud, exp (+ Apple nonce)
     find-or-create user by (provider, sub)  →  access JWT (15 min) + refresh token (60 days)
App: access token in memory, refresh token in the Keychain/Keystore (expo-secure-store)
     401 → POST /v1/auth/refresh (rotates the refresh token) → retry once
```

| Endpoint | Purpose |
|---|---|
| `POST /v1/auth/apple` | `{id_token, nonce, given_name?, family_name?}` → tokens + user |
| `POST /v1/auth/google` | `{id_token}` → tokens + user |
| `POST /v1/auth/refresh` | `{refresh_token}` → new token pair (old one is revoked) |
| `POST /v1/auth/logout` | `{refresh_token}` → revokes the session (idempotent) |
| `GET/PATCH/DELETE /v1/me` | profile, goal & timezone, **account deletion** (App Store requirement) |

## Security design

- **Access tokens**: HS256 JWT (`iss`, `aud`, `exp`, `typ=access`), 15 minutes.
- **Refresh tokens**: 48 random bytes. Only their SHA-256 is stored. They **rotate on every
  use**; all tokens from one sign-in share a `family_id`. Replaying a rotated token is treated
  as theft, and the whole family is revoked (the revocation is committed before the 401).
- **Apple nonce**: the app sends Apple `SHA-256(raw nonce)` and sends the API the raw value. The
  API checks `sha256(raw) == id_token.nonce` (replay protection).
- **No email-based account linking.** Identities match on `(provider, sub)` only. Apple can hide
  the address behind a private relay, and linking by email is an account-takeover vector.
- **Production guard**: the API refuses to start in staging or production without a real
  `CORAL_AUTH__JWT_SECRET` (at least 32 characters).

## Setup

### Apple (Sign in with Apple)
1. Apple Developer → Identifiers → App ID `app.coral.hydration` → enable **Sign in with Apple**.
2. Nothing else is needed for the native flow: `ios.usesAppleSignIn` and the
   `expo-apple-authentication` plugin are configured in the app.
3. API: `CORAL_AUTH__APPLE_AUDIENCES=app.coral.hydration` (the default). Add `host.exp.Exponent`
   only if you test in Expo Go, whose tokens carry Expo Go's bundle ID.

### Google
In Google Cloud Console → APIs & Services → Credentials, create OAuth client IDs:
- **Web application**: its client ID is the ID token's `aud`. Use it for
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app) and `CORAL_AUTH__GOOGLE_AUDIENCES` (API).
- **iOS** (bundle ID `app.coral.hydration`): use it for `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
  `app.config.ts` derives the required URL scheme from it.
- **Android** (package `app.coral.hydration` plus the SHA-1 of each signing key): no app config
  needed; Google matches it by package and signature.

Google Sign-In uses native code, so use a **development build**
(`npx expo run:ios` / `eas build --profile development`), not Expo Go.

### Environment variables

| Where | Variable | Value |
|---|---|---|
| API (Vercel) | `CORAL_AUTH__JWT_SECRET` | `openssl rand -base64 48` (**required** in production) |
| API (Vercel) | `CORAL_AUTH__GOOGLE_AUDIENCES` | the web client ID (comma-separate several) |
| API (Vercel) | `CORAL_AUTH__APPLE_AUDIENCES` | `app.coral.hydration` (default) |
| App (`apps/mobile/.env.local` / EAS env) | `EXPO_PUBLIC_API_URL` | e.g. `https://coral-api.vercel.app` |
| App | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | web client ID |
| App | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS client ID |

Rotating `CORAL_AUTH__JWT_SECRET` invalidates all access tokens. Clients recover
automatically through the refresh endpoint.

## Before App Store release (follow-ups)
- On account deletion, revoke the user's Apple tokens through Apple's REST API
  (`/auth/revoke`). This needs a Sign in with Apple key (.p8) and the `authorizationCode`.
- Rate-limit `/v1/auth/*` (e.g. at the edge with Vercel Firewall rules).
