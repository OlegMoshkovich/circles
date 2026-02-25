import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { PageContainer } from "../src/components/layout/PageContainer";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { InfoCard } from "../src/components/cards/InfoCard";
import { SuggestionCard } from "../src/components/cards/SuggestionCard";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";

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
  },
  {
    title: "First Light at the Forest Edge",
    metaLeft: "7:15 AM",
    badge: "MOMENT",
    description:
      "The clearing near the oak grove catches the morning sun perfectly in winter.",
  },
  {
    title: "Hidden Tea House",
    badge: "DISCOVERY",
    description:
      "A cozy stop on the way back. Open from 9 AM on weekends.",
  },
];

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <PageContainer>
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
      <TextBlock subtitle={INTRO_SUBTITLE} />
      <InfoCard
        title="TODAY"
        items={TODAY_ITEMS}
        note={TODAY_NOTE}
      />
      <Text style={styles.sectionLabel}>SEASONAL PROMPTS</Text>
      {SUGGESTIONS.map((s, i) => (
        <SuggestionCard
          key={i}
          title={s.title}
          metaLeft={s.metaLeft}
          metaRight={s.metaRight}
          badge={s.badge}
          description={s.description}
        />
      ))}
    </PageContainer>
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
