import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "EventDetail">;

export default function EventDetailScreen({ route, navigation }: Props) {
  const { title, organizer, date, time, location, going, maybe, rsvp, description } =
    route.params;

  const insets = useSafeAreaInsets();

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

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.organizer}>Hosted by {organizer}</Text>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{time}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{location}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.description}>{description}</Text>

        <View style={styles.divider} />

        {/* Attendees */}
        <View style={styles.attendeesHeader}>
          <Ionicons name="people-outline" size={16} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.sectionLabel}>ATTENDEES</Text>
        </View>
        <View style={styles.attendeesRow}>
          <View style={styles.attendeeStat}>
            <Text style={styles.attendeeCount}>{going}</Text>
            <Text style={styles.attendeeLabel}>Going</Text>
          </View>
          <View style={styles.attendeeStat}>
            <Text style={styles.attendeeCount}>{maybe}</Text>
            <Text style={styles.attendeeLabel}>Maybe</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Event Chat */}
        <View style={styles.chatRow}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.text} style={styles.metaIcon} />
          <Text style={styles.chatLabel}>Event Chat</Text>
          <View style={styles.chatDot} />
        </View>
      </ScrollView>

      {/* Fixed RSVP bar */}
      <View style={styles.rsvpBar}>
        <View style={styles.divider} />
        <View style={styles.rsvpButtons}>
          <TouchableOpacity
            style={[
              styles.rsvpButton,
              rsvp === "going" ? styles.rsvpButtonActive : styles.rsvpButtonOutline,
            ]}
          >
            {rsvp === "going" && (
              <Ionicons name="checkmark" size={15} color={colors.card} style={styles.rsvpIcon} />
            )}
            <Text
              style={[
                styles.rsvpButtonText,
                rsvp === "going" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline,
              ]}
            >
              Going
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rsvpButton,
              rsvp === "maybe" ? styles.rsvpButtonActive : styles.rsvpButtonOutline,
            ]}
          >
            {rsvp === "maybe" && (
              <Ionicons name="checkmark" size={15} color={colors.card} style={styles.rsvpIcon} />
            )}
            <Text
              style={[
                styles.rsvpButtonText,
                rsvp === "maybe" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline,
              ]}
            >
              Maybe
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: "500" as const,
    color: colors.text,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  organizer: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metaIcon: {
    marginRight: spacing.sm,
  },
  metaText: {
    ...typography.body,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.text,
  },
  attendeesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
  },
  attendeesRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  attendeeStat: {
    alignItems: "flex-start",
  },
  attendeeCount: {
    fontSize: 24,
    fontWeight: "400" as const,
    color: colors.text,
  },
  attendeeLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardPadding,
    ...Platform.select({
      ios: {
        shadowColor: "#2C2A26",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  chatLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  chatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  rsvpBar: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  rsvpButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
  },
  rsvpButtonOutline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rsvpButtonActive: {
    backgroundColor: "#9E9088",
  },
  rsvpIcon: {
    marginRight: 4,
  },
  rsvpButtonText: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  rsvpButtonTextOutline: {
    color: colors.text,
  },
  rsvpButtonTextActive: {
    color: colors.card,
  },
});
