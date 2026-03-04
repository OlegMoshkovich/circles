import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { InfoCard } from "../src/components/cards/InfoCard";
import { SuggestionCard } from "../src/components/cards/SuggestionCard";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { useLanguage } from "../src/i18n/LanguageContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATIC_SUGGESTIONS = [
  { metaLeft: "25 min", metaRight: "7:00 - 8:30 AM", attribution: "Oliver M." },
  { metaLeft: "7:15 AM", metaRight: undefined,        attribution: "Sarah K." },
  { metaLeft: undefined, metaRight: undefined,         attribution: "Marcus L." },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();

  return (
    <ScreenLayout
      header={
        <NavbarTitle
          title={t.nav.villageLiving}
          rightElement={
            <TouchableOpacity style={styles.iconButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="add" size={16} color={colors.card} />
            </TouchableOpacity>
          }
        />
      }
    >
      <TextBlock subtitle={t.home.subtitle} />
      <InfoCard
        title={t.home.today}
        titleIcon="partly-sunny-outline"
        items={t.home.todayItems}
        note={t.home.todayNote}
      />
      <Text style={styles.sectionLabel}>{t.home.seasonalPrompts}</Text>
      {t.home.suggestions.map((s, i) => {
        const { metaLeft, metaRight, attribution } = STATIC_SUGGESTIONS[i];
        const meta = metaLeft && metaRight
          ? `${metaLeft} · ${metaRight}`
          : metaLeft ?? metaRight ?? "";

        return (
          <SuggestionCard
            key={i}
            title={s.title}
            metaLeft={metaLeft}
            metaRight={metaRight}
            badge={s.badge}
            description={s.description}
            onPress={() =>
              navigation.navigate("PromptDetail", {
                title: s.title,
                badge: s.badge,
                meta,
                description: s.description,
                quote: s.quote,
                attribution,
              })
            }
          />
        );
      })}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.iconbBg,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
});
