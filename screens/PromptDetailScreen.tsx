import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "PromptDetail">;

const BADGE_ICONS: Record<string, keyof typeof Ionicons["glyphMap"]> = {
  ROUTE: "leaf-outline",
  MOMENT: "sunny-outline",
  DISCOVERY: "compass-outline",
};

function MapPlaceholder() {
  const COLS = 4;
  const ROWS = 3;

  return (
    <View style={mapStyles.container}>
      {Array.from({ length: ROWS }).map((_, row) => (
        <View key={row} style={mapStyles.row}>
          {Array.from({ length: COLS }).map((_, col) => (
            <View key={col} style={mapStyles.cell} />
          ))}
        </View>
      ))}
      {/* Dots */}
      <View style={[mapStyles.dot, mapStyles.dotLarge, { top: "54%", left: "43%" }]} />
      <View style={[mapStyles.dot, { top: "35%", left: "34%" }]} />
      <View style={[mapStyles.dot, { top: "42%", left: "58%" }]} />
      <View style={[mapStyles.dot, { top: "25%", left: "62%" }]} />
      <Text style={mapStyles.label}>The Nest</Text>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.badgeBg,
    height: 200,
    marginBottom: spacing.lg,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.divider,
  },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text,
    opacity: 0.5,
  },
  dotLarge: {
    width: 11,
    height: 11,
    borderRadius: 6,
    opacity: 1,
  },
  label: {
    position: "absolute",
    top: "66%",
    left: "36%",
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 11,
  },
});

export default function PromptDetailScreen({ route, navigation }: Props) {
  const { title, badge, meta, description, quote, attribution } = route.params;
  const insets = useSafeAreaInsets();
  const icon = BADGE_ICONS[badge] ?? "star-outline";

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Fixed back button */}
      <View style={[styles.backRow, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row with icon */}
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={18} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {meta.length > 0 && (
          <Text style={styles.meta}>{meta}</Text>
        )}

        <View style={styles.divider} />

        <MapPlaceholder />

        {/* Resident Favorite card */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <Ionicons name="star" size={14} color={colors.text} style={styles.starIcon} />
            <Text style={styles.quoteLabel}>RESIDENT FAVORITE</Text>
          </View>
          <Text style={styles.quoteText}>{quote}</Text>
          <Text style={styles.attribution}>— {attribution}</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This is a curated recommendation from residents who live nearby. Locations are
            chosen for quality and proximity, not quantity.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backRow: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingBottom: spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backLabel: {
    ...typography.body,
    color: colors.text,
    marginLeft: 2,
  },
  content: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: "400" as const,
    color: colors.text,
    flex: 1,
    lineHeight: 32,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: 36 + spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  quoteCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  starIcon: {
    marginRight: spacing.sm,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    color: colors.text,
    textTransform: "uppercase" as const,
  },
  quoteText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  attribution: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  disclaimer: {
    backgroundColor: colors.badgeBg,
    borderRadius: 12,
    padding: spacing.cardPadding,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
