import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
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

type Nav = NativeStackNavigationProp<RootStackParamList>;

async function handleSignOut(signOut: () => Promise<void>) {
  try {
    await signOut();
  } catch (_) {
    // Sign out errors are rare; user can retry from profile if needed
  }
}

const INTRO_SUBTITLE =
  "Curated essentials and seasonal rhythms—\nliving with the lake and forest as part of daily life.";

const TODAY_ITEMS = [
  { label: "4°C, clear skies" },
  { label: "Light breeze from the east" },
  { label: "Sunrise 7:42 AM · Sunset 4:52 PM" },
];

const TODAY_NOTE =
  "Perfect morning for a lake walk before the market opens.";

const SUGGESTIONS = [
  {
    title: "Winter Morning Lake Walk",
    metaLeft: "25 min",
    metaRight: "7:00 - 8:30 AM",
    badge: "ROUTE",
    description:
      "A quiet path along the frozen shore. Best in early light when mist rises from the water.",
    quote: "Perfect for morning walks. Watch the sunrise from the dock.",
    attribution: "Oliver M.",
  },
  {
    title: "First Light at the Forest Edge",
    metaLeft: "7:15 AM",
    metaRight: undefined,
    badge: "MOMENT",
    description:
      "The clearing near the oak grove catches the morning sun perfectly in winter.",
    quote: "The light here in winter is unlike anything else. Arrive before 7:30.",
    attribution: "Sarah K.",
  },
  {
    title: "Hidden Tea House",
    metaLeft: undefined,
    metaRight: undefined,
    badge: "DISCOVERY",
    description:
      "A cozy stop on the way back. Open from 9 AM on weekends.",
    quote: "The best kept secret in the neighbourhood. The cardamom tea is wonderful.",
    attribution: "Marcus L.",
  },
];

export default function HomeScreen() {
  const { signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  return (
    <ScreenLayout
      header={
        <NavbarTitle
          title="Local Living"
          rightElement={
            <TouchableOpacity
              onPress={() => handleSignOut(signOut)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.signOutButton}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          }
        />
      }
    >
      <TextBlock subtitle={INTRO_SUBTITLE} />
      <InfoCard
        title="TODAY"
        items={TODAY_ITEMS}
        note={TODAY_NOTE}
      />
      <Text style={styles.sectionLabel}>SEASONAL PROMPTS</Text>
      {SUGGESTIONS.map((s, i) => {
        const meta = s.metaLeft && s.metaRight
          ? `${s.metaLeft} · ${s.metaRight}`
          : s.metaLeft ?? s.metaRight ?? "";

        return (
          <SuggestionCard
            key={i}
            title={s.title}
            metaLeft={s.metaLeft}
            metaRight={s.metaRight}
            badge={s.badge}
            description={s.description}
            onPress={() =>
              navigation.navigate("PromptDetail", {
                title: s.title,
                badge: s.badge,
                meta,
                description: s.description,
                quote: s.quote,
                attribution: s.attribution,
              })
            }
          />
        );
      })}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    padding: spacing.xs,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
});
