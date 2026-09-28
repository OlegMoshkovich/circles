import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Language, useLanguage } from "../../i18n/LanguageContext";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { useFont } from "../../theme/font";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "it", label: "IT" },
  { code: "en", label: "EN" },
];

const THEME_ORDER = ["onboarding", "light", "glass"] as const;

function themeName(option: string, t: { profile: { themeGlass: string; themeLight: string; themeSolid: string } }) {
  if (option === "light") return t.profile.themeLight;
  if (option === "glass") return t.profile.themeSolid;
  return t.profile.themeGlass;
}

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

export function ProfileSettings({ expanded, onToggle }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const { font, setFont } = useFont();
  const { bgOption, setBgOption } = useBackground();
  const colors = useColors();
  const isOnboarding = bgOption === "onboarding";
  const styles = React.useMemo(() => makeStyles(colors, isOnboarding), [colors, isOnboarding]);

  function cycleTheme() {
    const currentIndex = THEME_ORDER.indexOf(bgOption as (typeof THEME_ORDER)[number]);
    const next = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
    setBgOption(next);
  }

  function cycleFont() {
    setFont(font === "serif" ? "sans" : "serif");
  }

  return (
    <>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>{t.profile.settings}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {expanded ? (
          <>
            <View style={styles.rowDivider} />

            <TouchableOpacity style={styles.subSettingRow} onPress={cycleTheme} activeOpacity={0.7}>
              <Text style={styles.rowLabel}>{t.profile.theme}</Text>
              <View style={styles.themeValue}>
                <Text style={styles.rowValue}>{themeName(bgOption, t)}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity style={styles.subSettingRow} onPress={cycleFont} activeOpacity={0.7}>
              <Text style={styles.rowLabel}>{t.profile.font}</Text>
              <View style={styles.themeValue}>
                <Text style={styles.rowValue}>{font === "sans" ? t.profile.fontSans : t.profile.fontSerif}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <View style={styles.languageRow}>
              {LANGUAGES.map(({ code, label }) => {
                const selected = language === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[styles.flagButton, selected && styles.flagButtonSelected]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.flagLabel, selected && styles.flagLabelSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: 14,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: spacing.cardPadding,
    },
    subSettingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingLeft: spacing.cardPadding + spacing.sm,
      paddingRight: spacing.cardPadding,
      paddingVertical: 14,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
    },
    themeValue: {
      flexDirection: "row",
      alignItems: "center",
    },
    languageRow: {
      flexDirection: "row",
      alignSelf: "stretch",
      width: "100%",
      gap: spacing.sm,
      paddingHorizontal: spacing.cardPadding,
      paddingTop: 14,
      paddingBottom: 14,
    },
    flagButton: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.badgeBg,
    },
    flagButtonSelected: {
      borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
      backgroundColor: colors.badgeBg,
    },
    flagLabel: {
      fontSize: 13,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
    },
    flagLabelSelected: {
      color: colors.text,
    },
  });
}
