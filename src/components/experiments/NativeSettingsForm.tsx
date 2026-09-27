/**
 * Fallback for the native SwiftUI settings POC on non-iOS platforms.
 *
 * The real implementation lives in `NativeSettingsForm.ios.tsx` and is selected
 * by Metro on iOS. On Android/web this renders nothing — the Profile screen
 * keeps its existing React Native settings rows there. (If we later want native
 * Android too, this is where a `@expo/ui/jetpack-compose` version would go.)
 */

type Props = {
  onOpenMission: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NativeSettingsForm(_props: Props) {
  return null;
}
