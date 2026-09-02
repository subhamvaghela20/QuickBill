# Expo Guidelines & Strict Pre-Build Rules

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

## 🚨 MANDATORY PRE-BUILD VERIFICATION CHECKLIST
Before triggering ANY native APK, AAB, or EAS build, you MUST complete every step below without exception to prevent splash screen crashes:

1. **Run `npx expo-doctor` & Ensure 100% Pass**:
   - Every single check must pass (18/18 checks passed).
   - Zero missing peer dependencies.
   - Zero version mismatches between packages and the Expo SDK.

2. **Native Font & Vector Icons Check**:
   - `@expo/vector-icons` requires `expo-font` to be installed and registered under `"plugins"` in `app.json`.
   - Never rely on Expo Go's internal font cache. Standalone APKs must bundle fonts natively.
   - Always safeguard font loading with non-blocking fallbacks (`if (!fontsLoaded && !fontError)`).

3. **Verify Asset File Formats**:
   - `app.json` asset fields (`icon`, `splash.image`, `adaptiveIcon.foregroundImage`, etc.) must be genuine PNG files with valid PNG headers (`89 50 4E 47`), NOT renamed JPEG/WebP files.

4. **React ErrorBoundary Protection**:
   - Always wrap the root application inside a React `ErrorBoundary` so any unforeseen runtime error presents a recovery UI instead of an immediate crash to the Android home screen.

5. **Type Safety & Build Sanity**:
   - Run `npx tsc --noEmit` to ensure 0 TypeScript compilation errors.
   - Run all automated unit test suites.
