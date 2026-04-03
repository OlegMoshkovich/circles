import React, { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { EventCard } from "../src/components/cards/EventCard";
import { SwipeableCard } from "../src/components/layout/SwipeableCard";
import { CreateEventModal, NewEventData } from "../src/components/modals/CreateEventModal";
import { Colors } from "../src/theme/colors";

import { useUser } from "@clerk/clerk-expo";
import { useLanguage } from "../src/i18n/LanguageContext";
import { useColors } from "../src/contexts/BackgroundContext";
import { supabase, Event } from "../lib/supabase";

type EventWithCircle = Event & { circles?: { name: string } | null };
type Filter = "all" | "circles";
type SortBy = "newest" | "popular" | "activity" | "new_activity";
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
  const [noteCountMap, setNoteCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [lastViewedMap, setLastViewedMap] = useState<Record<string, number>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (user) {
      const { data: dismissedData } = await supabase
        .from("dismissed_items")
        .select("item_id")
        .eq("user_id", user.id)
        .eq("item_type", "event");
      if (dismissedData) setDismissedIds(new Set(dismissedData.map((r: any) => r.item_id)));
    }

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
    if (!error && data) {
      setEvents(data as EventWithCircle[]);
      // Fetch note counts for all loaded events
      const eventIds = data.map((e: any) => e.id);
      if (eventIds.length > 0) {
        const { data: noteCounts } = await supabase
          .from("event_notes")
          .select("event_id, created_at")
          .in("event_id", eventIds);
        if (noteCounts) {
          const map: Record<string, number> = {};
          const latestMap: Record<string, number> = {};
          for (const row of noteCounts as any[]) {
            map[row.event_id] = (map[row.event_id] ?? 0) + 1;
            const t = new Date(row.created_at).getTime();
            if (!latestMap[row.event_id] || t > latestMap[row.event_id]) latestMap[row.event_id] = t;
          }
          setNoteCountMap(map);
          setActivityMap(latestMap);

          // Read last-viewed timestamps
          const keys = Object.keys(latestMap).map((id) => `lastViewed_event_${id}`);
          if (keys.length > 0) {
            const pairs = await AsyncStorage.multiGet(keys);
            const lvMap: Record<string, number> = {};
            for (const [key, val] of pairs) {
              if (val) lvMap[key.replace("lastViewed_event_", "")] = parseInt(val, 10);
            }
            setLastViewedMap(lvMap);
          }
        }
      }
    }
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
      duration_minutes: event.duration ?? null,
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
    .sort((a, b) => {
      if (sortBy === "new_activity") {
        const aNew = (activityMap[a.id] ?? 0) > (lastViewedMap[a.id] ?? 0) ? 1 : 0;
        const bNew = (activityMap[b.id] ?? 0) > (lastViewedMap[b.id] ?? 0) ? 1 : 0;
        return bNew - aNew;
      }
      if (sortBy === "popular") return (b.going + b.maybe) - (a.going + a.maybe);
      if (sortBy === "activity") return (noteCountMap[b.id] ?? 0) - (noteCountMap[a.id] ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filterActive = sortBy !== "newest" || rsvpFilter !== "all";

  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const screenBgColor = colors.background;

  return (
    <>
      <ScreenLayout
        backgroundColor={screenBgColor}
      >
        <ScreenHeaderCard>
          <NavbarTitle
            title={t.nav.events}
            rightElement={
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.textOnIconBg} />
              </TouchableOpacity>
            }
          />
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
                  {(["newest", "popular", "activity", "new_activity"] as SortBy[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, sortBy === opt && styles.filterChipActive]}
                      onPress={() => setSortBy(opt)}
                    >
                      <Text style={[styles.filterChipText, sortBy === opt && styles.filterChipTextActive]}>
                        {opt === "newest" ? "Newest" : opt === "popular" ? "Most Popular" : opt === "activity" ? "Most Active" : "New Activity"}
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
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>View</Text>
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, showDismissed && styles.filterChipActive]}
                    onPress={() => setShowDismissed((v) => !v)}
                  >
                    <Text style={[styles.filterChipText, showDismissed && styles.filterChipTextActive]}>
                      Dismissed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScreenHeaderCard>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : showDismissed ? (
          events.filter((e) => dismissedIds.has(e.id)).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No dismissed events</Text>
            </View>
          ) : (
            events.filter((e) => dismissedIds.has(e.id)).map((event) => (
              <SwipeableCard
                key={event.id}
                onRestore={() => {
                  setDismissedIds((prev) => { const next = new Set(prev); next.delete(event.id); return next; });
                  if (user) {
                    supabase.from("dismissed_items").delete()
                      .eq("user_id", user.id).eq("item_type", "event").eq("item_id", event.id).then(() => {});
                  }
                }}
              >
                <EventCard
                  title={event.title}
                  organizer={event.organizer}
                  date={event.date_label}
                  time={event.time_label}
                  location={event.location}
                  going={event.going}
                  maybe={event.maybe}
                  rsvp={rsvpStatusMap[event.id]}
                  circleName={event.circles?.name ?? null}
                  noteCount={noteCountMap[event.id] ?? 0}
                  hasNewActivity={false}
                  onPress={() => {
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
                    });
                  }}
                />
              </SwipeableCard>
            ))
          )
        ) : displayedEvents.filter((e) => !dismissedIds.has(e.id)).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === "circles" ? "No events in your circles yet" : "No events yet"}
            </Text>
          </View>
        ) : (
          displayedEvents
            .filter((e) => !dismissedIds.has(e.id))
            .map((event) => (
            <SwipeableCard
              key={event.id}
              disabled={!!user && event.created_by === user.id}
              onDismiss={() => {
                setDismissedIds((prev) => new Set(prev).add(event.id));
                if (user) {
                  supabase.from("dismissed_items").insert({
                    user_id: user.id,
                    item_type: "event",
                    item_id: event.id,
                  }).then(() => {});
                }
              }}
            >
            <EventCard
              title={event.title}
              organizer={event.organizer}
              date={event.date_label}
              time={event.time_label}
              location={event.location}
              going={event.going}
              maybe={event.maybe}
              rsvp={rsvpStatusMap[event.id]}
              circleName={event.circles?.name ?? null}
              noteCount={noteCountMap[event.id] ?? 0}
              hasNewActivity={(activityMap[event.id] ?? 0) > (lastViewedMap[event.id] ?? 0)}
              onPress={() => {
                AsyncStorage.setItem(`lastViewed_event_${event.id}`, Date.now().toString());
                setLastViewedMap((prev) => ({ ...prev, [event.id]: Date.now() }));
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
                });
              }}
            />
            </SwipeableCard>
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

function makeStyles(colors: Colors) {
  return StyleSheet.create({
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 16,
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
    borderRadius: 16,
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
    color: colors.background,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 16,
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
  })
}
