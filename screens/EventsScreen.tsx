import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { EventCard } from "../src/components/cards/EventCard";
import { CreateEventModal, NewEventData } from "../src/components/modals/CreateEventModal";
import { colors } from "../src/theme/colors";
import { useUser } from "@clerk/clerk-expo";
import { useLanguage } from "../src/i18n/LanguageContext";
import { supabase, Event } from "../lib/supabase";

type EventWithCircle = Event & { circles?: { name: string } | null };
type Filter = "all" | "circles";
type SortBy = "newest" | "popular";
type RsvpFilter = "all" | "going" | "maybe";
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { user } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>("all");
  const [events, setEvents] = useState<EventWithCircle[]>([]);
  const [rsvpStatusMap, setRsvpStatusMap] = useState<Record<string, "going" | "maybe">>({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch user's RSVPs for badge display
    const { data: rsvps } = await supabase
      .from("event_rsvps")
      .select("event_id, status")
      .eq("user_id", user.id);

    const statusMap: Record<string, "going" | "maybe"> = {};
    for (const r of (rsvps ?? []) as any[]) {
      statusMap[r.event_id] = r.status;
    }
    setRsvpStatusMap(statusMap);

    // Fetch circles the user belongs to
    const { data: memberships } = await supabase
      .from("circle_members")
      .select("circle_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    const circleIds: string[] = memberships?.map((m: any) => m.circle_id) ?? [];

    let query = supabase.from("events").select("*, circles(name)");

    if (filter === "circles") {
      if (circleIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      query = query.in("circle_id", circleIds);
    } else {
      // All: public events + events in user's circles
      if (circleIds.length > 0) {
        query = query.or(`visibility.eq.public,circle_id.in.(${circleIds.join(",")})`);
      } else {
        query = query.eq("visibility", "public");
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) setEvents(data as EventWithCircle[]);
    setLoading(false);
  }, [user, filter]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  async function handleSave(event: NewEventData) {
    const { error } = await supabase.from("events").insert({
      title: event.title,
      organizer: event.organizer,
      date_label: event.date,
      time_label: event.time,
      location: event.location,
      description: event.description,
      visibility: event.visibility,
      circle_id: event.circle_id,
      created_by: user?.id ?? null,
    });
    if (!error) {
      setModalVisible(false);
      fetchEvents();
    }
  }

  const displayedEvents = events
    .filter((e) => rsvpFilter === "all" || rsvpStatusMap[e.id] === rsvpFilter)
    .sort((a, b) =>
      sortBy === "popular"
        ? (b.going + b.maybe) - (a.going + a.maybe)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const filterActive = sortBy !== "newest" || rsvpFilter !== "all";

  return (
    <>
      <ScreenLayout
        header={
          <NavbarTitle
            title={t.nav.events}
            rightElement={
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.card} />
              </TouchableOpacity>
            }
          />
        }
      >
        <TextBlock subtitle={t.events.subtitle} />

        <View style={styles.filterRow}>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleOption, filter === "all" && styles.toggleOptionActive]}
              onPress={() => setFilter("all")}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleLabel, filter === "all" && styles.toggleLabelActive]}>
                {t.events.filterAll}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, filter === "circles" && styles.toggleOptionActive]}
              onPress={() => setFilter("circles")}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleLabel, filter === "circles" && styles.toggleLabelActive]}>
                {t.events.filterMyCircles}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.filterIconButton, filterActive && styles.filterIconButtonActive]}
            onPress={() => setShowFilterPanel((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={filterActive ? colors.iconbBg : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {showFilterPanel && (
          <View style={styles.filterPanel}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Sort</Text>
              <View style={styles.filterChipRow}>
                {(["newest", "popular"] as SortBy[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.filterChip, sortBy === opt && styles.filterChipActive]}
                    onPress={() => setSortBy(opt)}
                  >
                    <Text style={[styles.filterChipText, sortBy === opt && styles.filterChipTextActive]}>
                      {opt === "newest" ? "Newest" : "Most Popular"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>RSVP</Text>
              <View style={styles.filterChipRow}>
                {(["all", "going", "maybe"] as RsvpFilter[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.filterChip, rsvpFilter === opt && styles.filterChipActive]}
                    onPress={() => setRsvpFilter(opt)}
                  >
                    <Text style={[styles.filterChipText, rsvpFilter === opt && styles.filterChipTextActive]}>
                      {opt === "all" ? "All" : opt === "going" ? "Going" : "Maybe"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : displayedEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === "circles" ? "No events in your circles yet" : "No events yet"}
            </Text>
          </View>
        ) : (
          displayedEvents.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              organizer={event.organizer}
              date={event.date_label}
              time={event.time_label}
              location={event.location}
              going={event.going}
              maybe={event.maybe}
              rsvp={rsvpStatusMap[event.id]}
              circleName={event.circles?.name ?? null}
              onPress={() =>
                navigation.navigate("EventDetail", {
                  id: event.id,
                  title: event.title,
                  organizer: event.organizer,
                  date: event.date_label,
                  time: event.time_label,
                  location: event.location,
                  going: event.going,
                  maybe: event.maybe,
                  rsvp: rsvpStatusMap[event.id],
                  description: event.description,
                  created_by: event.created_by,
                  circleName: event.circles?.name ?? null,
                  circle_id: event.circle_id,
                })
              }
            />
          ))
        )}
      </ScreenLayout>

      <CreateEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: colors.iconbBg,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    paddingVertical: 12,
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIconButtonActive: {
    borderColor: colors.iconbBg,
    backgroundColor: colors.card,
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.card,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: colors.cardBorder,
    padding: 3,
    alignSelf: "flex-start",
  },
  toggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 17,
  },
  toggleOptionActive: {
    backgroundColor: colors.card,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  toggleLabelActive: {
    color: colors.text,
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
});
