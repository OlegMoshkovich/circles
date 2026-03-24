import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { useUser } from "@clerk/clerk-expo";
import { RootStackParamList } from "../types";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { supabase } from "../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "EventDetail">;

export default function EventDetailScreen({ route, navigation }: Props) {
  const { id, title, organizer, date, time, location, description, created_by } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const isCreator = !!user && !!created_by && user.id === created_by;

  async function handleDelete() {
    Alert.alert(
      "Delete Event",
      "This will permanently delete the event. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("events").delete().eq("id", id);
            if (!error) navigation.goBack();
          },
        },
      ]
    );
  }

  const [going, setGoing] = useState(route.params.going);
  const [maybe, setMaybe] = useState(route.params.maybe);
  const [rsvp, setRsvp] = useState<"going" | "maybe" | undefined>(route.params.rsvp);
  const [submitting, setSubmitting] = useState(false);

  // Load fresh counts + this user's RSVP on every mount
  useEffect(() => {
    const queries: [Promise<any>, Promise<any>, Promise<any>] = [
      supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "going"),
      supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "maybe"),
      user
        ? supabase
            .from("event_rsvps")
            .select("status")
            .eq("event_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ];

    Promise.all(queries).then(([{ count: g }, { count: m }, { data: rsvpData }]) => {
      if (g !== null) setGoing(g);
      if (m !== null) setMaybe(m);
      if (rsvpData) setRsvp(rsvpData.status as "going" | "maybe");
    });
  }, [id, user]);

  async function handleRsvp(newStatus: "going" | "maybe") {
    if (!user || submitting) return;
    setSubmitting(true);

    const prevRsvp = rsvp;
    const prevGoing = going;
    const prevMaybe = maybe;
    const isToggleOff = rsvp === newStatus;

    // Optimistic UI update
    if (isToggleOff) {
      setRsvp(undefined);
      if (newStatus === "going") setGoing((g) => g - 1);
      else setMaybe((m) => m - 1);
    } else {
      if (rsvp === "going") setGoing((g) => g - 1);
      if (rsvp === "maybe") setMaybe((m) => m - 1);
      setRsvp(newStatus);
      if (newStatus === "going") setGoing((g) => g + 1);
      else setMaybe((m) => m + 1);
    }

    // Write to DB — revert optimistic update if it fails
    let error;
    if (isToggleOff) {
      ({ error } = await supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", id)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("event_rsvps")
        .upsert(
          { event_id: id, user_id: user.id, status: newStatus },
          { onConflict: "event_id,user_id" }
        ));
    }

    if (error) {
      // Write failed — revert optimistic update
      setRsvp(prevRsvp);
      setGoing(prevGoing);
      setMaybe(prevMaybe);
    } else {
      // Write succeeded — confirm real counts from event_rsvps directly
      const [{ count: goingCount }, { count: maybeCount }] = await Promise.all([
        supabase
          .from("event_rsvps")
          .select("*", { count: "exact", head: true })
          .eq("event_id", id)
          .eq("status", "going"),
        supabase
          .from("event_rsvps")
          .select("*", { count: "exact", head: true })
          .eq("event_id", id)
          .eq("status", "maybe"),
      ]);
      if (goingCount !== null) setGoing(goingCount);
      if (maybeCount !== null) setMaybe(maybeCount);
    }

    setSubmitting(false);
  }

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
        {isCreator && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
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
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{time}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{location}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.description}>{description}</Text>

        <View style={styles.divider} />

        {/* Attendees */}
        <View style={styles.attendeesHeader}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
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
            style={[styles.rsvpButton, rsvp === "going" ? styles.rsvpButtonActive : styles.rsvpButtonOutline]}
            onPress={() => handleRsvp("going")}
            disabled={submitting}
          >
            {rsvp === "going" && (
              <Ionicons name="checkmark" size={15} color={colors.card} style={styles.rsvpIcon} />
            )}
            <Text style={[styles.rsvpButtonText, rsvp === "going" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline]}>
              Going
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpButton, rsvp === "maybe" ? styles.rsvpButtonActive : styles.rsvpButtonOutline]}
            onPress={() => handleRsvp("maybe")}
            disabled={submitting}
          >
            {rsvp === "maybe" && (
              <Ionicons name="checkmark" size={15} color={colors.card} style={styles.rsvpIcon} />
            )}
            <Text style={[styles.rsvpButtonText, rsvp === "maybe" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline]}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontSize: 32,
    fontFamily: "CormorantGaramond_300Light",
    color: colors.text,
    lineHeight: 38,
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
