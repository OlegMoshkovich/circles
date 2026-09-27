import React from "react";
import { Alert } from "react-native";
import { Host, Form, Section, Picker, Button } from "@expo/ui/swift-ui";
import { useBackground, BgOption } from "../../contexts/BackgroundContext";
import { useLanguage, Language } from "../../i18n/LanguageContext";
import { OnboardingRestartContext } from "../../contexts/OnboardingRestartContext";

/**
 * PROOF OF CONCEPT — native settings rendered with real SwiftUI via `@expo/ui`.
 *
 * This replaces the hand-built React Native settings rows (Theme / Language /
 * Mission / Replay) with a native SwiftUI `Form`, driven by the same
 * BackgroundContext / LanguageContext state the rest of the app uses. Only the
 * *rendering* is native — all logic stays in JS.
 *
 * iOS only. This file is picked up by Metro on iOS via the `.ios` extension;
 * `NativeSettingsForm.tsx` is the no-op fallback used on Android/web, where the
 * screen keeps the existing RN rows. `@expo/ui` can also render Jetpack Compose
 * on Android (`@expo/ui/jetpack-compose`) if we later want native there too.
 *
 * Requires a development build (EAS) — native views do not appear in Expo Go.
 */

// Theme cycle order matches BackgroundContext + MyProfileScreen's themeLabel map.
const THEME_ORDER: BgOption[] = ["onboarding", "light", "glass"];
const THEME_LABELS = ["Glass", "Light", "Solid"];

const LANG_CODES: Language[] = ["de", "fr", "it", "en"];
const LANG_LABELS = ["Deutsch", "Français", "Italiano", "English"];

type Props = {
  /** Opens the existing (RN) Mission & Values modal, owned by the parent screen. */
  onOpenMission: () => void;
};

export function NativeSettingsForm({ onOpenMission }: Props) {
  const { bgOption, setBgOption } = useBackground();
  const { language, setLanguage } = useLanguage();
  const { restart: restartOnboarding } = React.useContext(OnboardingRestartContext);

  const themeIndex = Math.max(0, THEME_ORDER.indexOf(bgOption));
  const langIndex = Math.max(0, LANG_CODES.indexOf(language));

  function confirmReplay() {
    Alert.alert(
      "Replay onboarding",
      "Go through the welcome and setup steps again? Your profile and circles stay as they are.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Replay", onPress: () => restartOnboarding() },
      ]
    );
  }

  // `matchContents` lets the native host size itself to the SwiftUI content so
  // the form sits inline in the surrounding RN ScrollView. Height is a starting
  // point to tune once it's running in a dev build.
  return (
    <Host matchContents style={{ width: "100%", minHeight: 240 }}>
      <Form scrollEnabled={false}>
        <Section title="Appearance">
          <Picker
            label="Theme"
            variant="menu"
            options={THEME_LABELS}
            selectedIndex={themeIndex}
            onOptionSelected={({ nativeEvent: { index } }) => setBgOption(THEME_ORDER[index])}
          />
          <Picker
            label="Language"
            variant="menu"
            options={LANG_LABELS}
            selectedIndex={langIndex}
            onOptionSelected={({ nativeEvent: { index } }) => setLanguage(LANG_CODES[index])}
          />
        </Section>

        <Section title="Community">
          <Button variant="borderless" systemImage="heart" onPress={onOpenMission}>
            Mission & values
          </Button>
          <Button variant="borderless" systemImage="arrow.clockwise" onPress={confirmReplay}>
            Replay onboarding
          </Button>
        </Section>
      </Form>
    </Host>
  );
}
