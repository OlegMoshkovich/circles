import React, { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { EventCard } from "../src/components/cards/EventCard";
import { CreateEventModal, NewEventData } from "../src/components/modals/CreateEventModal";
import { GradientRingLoader } from "../src/components/loaders/GradientRingLoader";
import { Colors } from "../src/theme/colors";

import { useUser } from "@clerk/clerk-expo";
import { useLanguage } from "../src/i18n/LanguageContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { supabase, Event } from "../lib/supabase";

type EventWithCircle = Event & { circles?: { name: string } | null };
type Filter = "all" | "circles" | "hosting";
type SortBy = "newest" | "recent" | "popular" | "activity" | "new_activity";
type RsvpFilter = "all" | "going" | "maybe";
type ContentType = "all" | "events" | "activity";
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { user } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>("all");
  const [events, setEvents] = useState<EventWithCircle[]>([]);
  const [rsvpStatusMap, setRsvpStatusMap] = useState<Record<string, "going" | "maybe">>({});
  const [noteCountMap, setNoteCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [lastViewedMap, setLastViewedMap] = useState<Record<string, number>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);

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
    } else if (filter === "hosting") {
      query = query.eq("created_by", user.id);
    } else {
      // All: public events + events in user's circles + own events (any visibility)
      if (circleIds.length > 0) {
        query = query.or(`visibility.eq.public,circle_id.in.(${circleIds.join(",")}),created_by.eq.${user.id}`);
      } else {
        query = query.or(`visibility.eq.public,created_by.eq.${user.id}`);
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
          .select("event_id, created_at, user_id")
          .in("event_id", eventIds);
        if (noteCounts) {
          const map: Record<string, number> = {};
          const latestMap: Record<string, number> = {};
          for (const row of noteCounts as any[]) {
            map[row.event_id] = (map[row.event_id] ?? 0) + 1;
            if (user?.id && row.user_id === user.id) continue;
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
    const { data: inserted, error } = await supabase.from("events").insert({
      title: event.title,
      organizer: event.organizer,
      date_label: event.date,
      time_label: event.time,
      duration_minutes: event.duration ?? null,
      location: event.location,
      description: event.description,
      image_url: event.image_url || null,
      max_participants: event.max_participants,
      contact_info: event.contact_info || null,
      price_info: event.price_info || null,
      visibility: event.visibility,
      circle_id: event.circle_id,
      invited_user_ids: event.invited_user_ids.length > 0 ? event.invited_user_ids : null,
      is_activity: event.is_activity,
      created_by: user?.id ?? null,
    }).select("id").single();
    if (!error && inserted && user) {
      await supabase.from("event_rsvps").insert({
        event_id: inserted.id,
        user_id: user.id,
        status: "going",
      });
      setModalVisible(false);
      await fetchEvents();
      return true;
    }
    console.error("Failed to create event", error);
    Alert.alert("Could not create event", error?.message ?? "Unknown error");
    return false;
  }

  async function handleShareEvent(event: EventWithCircle) {
    const shareUrl = "https://valmia.ch";
    const lines = [
      event.title,
      `${event.date_label} · ${event.time_label}`,
      event.location,
      event.circles?.name ? `${t.nav.circles}: ${event.circles.name}` : null,
      event.description?.trim() ? event.description.trim() : null,
      shareUrl,
    ].filter(Boolean);

    try {
      await Share.share({
        title: event.title,
        message: lines.join("\n"),
        url: shareUrl,
      });
    } catch {
      Alert.alert("Error", "Could not open share menu.");
    }
  }

  function parseEventDateTime(dateLabel: string, timeLabel: string): number {
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const dateMatch = dateLabel.trim().match(/^(?:\w{3},\s*)?([A-Za-z]{3})\s+(\d{1,2})$/);
    if (!dateMatch) return 0;
    const monthIdx = monthMap[dateMatch[1].toLowerCase()];
    const day = parseInt(dateMatch[2], 10);
    if (monthIdx == null || Number.isNaN(day)) return 0;

    const timeMatch = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!timeMatch) return 0;
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const ampm = (timeMatch[3] ?? "").toUpperCase();
    if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
    if (ampm === "AM" && hour === 12) hour = 0;
    if (ampm === "PM" && hour < 12) hour += 12;

    const now = new Date();
    const year = now.getFullYear();
    const eventDate = new Date(year, monthIdx, day, hour, minute, 0, 0);

    // Events are seasonally recurring in this UI; if a parsed date is far behind,
    // treat it as the upcoming year's instance.
    if (eventDate.getTime() < now.getTime() - 180 * 24 * 60 * 60 * 1000) {
      eventDate.setFullYear(year + 1);
    }

    return eventDate.getTime();
  }

  function isEventPast(event: EventWithCircle): boolean {
    const ts = parseEventDateTime(event.date_label, event.time_label);
    return ts > 0 && ts < Date.now();
  }

  const visibleEvents = events.filter((e) => showPastEvents || !isEventPast(e));

  const displayedEvents = visibleEvents
    .filter((e) => rsvpFilter === "all" || rsvpStatusMap[e.id] === rsvpFilter)
    .filter((e) => {
      if (contentType === "events") return !e.is_activity;
      if (contentType === "activity") return !!e.is_activity;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "new_activity") {
        const aNew = (activityMap[a.id] ?? 0) > (lastViewedMap[a.id] ?? 0) ? 1 : 0;
        const bNew = (activityMap[b.id] ?? 0) > (lastViewedMap[b.id] ?? 0) ? 1 : 0;
        return bNew - aNew;
      }
      if (sortBy === "recent") return parseEventDateTime(a.date_label, a.time_label) - parseEventDateTime(b.date_label, b.time_label);
      if (sortBy === "popular") return (b.going + b.maybe) - (a.going + a.maybe);
      if (sortBy === "activity") return (noteCountMap[b.id] ?? 0) - (noteCountMap[a.id] ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filterActive = sortBy !== "newest" || rsvpFilter !== "all" || showDismissed || showPastEvents || contentType !== "all";

  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const screenBgColor = colors.background;

  return (
    <>
      <ScreenLayout
        backgroundColor={screenBgColor}
        contentStyle={loading ? styles.scrollContentLoader : undefined}
        onRefresh={async () => { setRefreshing(true); await fetchEvents(true); setRefreshing(false); }}
        refreshing={refreshing}
        stickyTop={<ScreenHeaderCard>
          <NavbarTitle
            title={t.nav.events}
            rightElement={
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TouchableOpacity
                  style={[styles.filterIconButton, (filter !== "all" || filterActive) && styles.filterIconButtonActive]}
                  onPress={() => setShowFilterPanel((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color={(filter !== "all" || filterActive) ? colors.iconbBg : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.addButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add" size={16} color={colors.textOnIconBg} />
                </TouchableOpacity>
              </View>
            }
          />
          {/* <TextBlock subtitle={t.events.subtitle} /> */}

          {showFilterPanel && (
            <View style={styles.filterPanel}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.events.filterAll} / {t.events.filterMyCircles}</Text>
                <View style={styles.filterChipRow}>
                  {(["all", "circles", "hosting"] as Filter[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, filter === opt && styles.filterChipActive]}
                      onPress={() => setFilter(opt)}
                    >
                      <Text style={[styles.filterChipText, filter === opt && styles.filterChipTextActive]}>
                        {opt === "all" ? t.events.filterAll : opt === "circles" ? t.events.filterMyCircles : t.events.filterHosting}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.common.sort}</Text>
                <View style={styles.filterChipRow}>
                  {(["newest", "recent", "popular", "activity", "new_activity"] as SortBy[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, sortBy === opt && styles.filterChipActive]}
                      onPress={() => setSortBy(opt)}
                    >
                      <Text style={[styles.filterChipText, sortBy === opt && styles.filterChipTextActive]}>
                        {opt === "newest" ? t.events.sortNewest : opt === "recent" ? t.events.sortRecent : opt === "popular" ? t.events.sortPopular : opt === "activity" ? t.events.sortActive : t.events.sortNewActivity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.events.contentTypeLabel}</Text>
                <View style={styles.filterChipRow}>
                  {(["all", "events", "activity"] as ContentType[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, contentType === opt && styles.filterChipActive]}
                      onPress={() => setContentType(opt)}
                    >
                      <Text style={[styles.filterChipText, contentType === opt && styles.filterChipTextActive]}>
                        {opt === "all" ? t.events.contentTypeAll : opt === "events" ? t.events.contentTypeEvents : t.events.contentTypeActivity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.events.rsvpLabel}</Text>
                <View style={styles.filterChipRow}>
                  {(["all", "going", "maybe"] as RsvpFilter[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, rsvpFilter === opt && styles.filterChipActive]}
                      onPress={() => setRsvpFilter(opt)}
                    >
                      <Text style={[styles.filterChipText, rsvpFilter === opt && styles.filterChipTextActive]}>
                        {opt === "all" ? t.common.all : opt === "going" ? t.events.rsvpGoing : t.events.rsvpMaybe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.common.view}</Text>
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, showDismissed && styles.filterChipActive]}
                    onPress={() => setShowDismissed((v) => !v)}
                  >
                    <Text style={[styles.filterChipText, showDismissed && styles.filterChipTextActive]}>
                      {t.common.dismissed}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, showPastEvents && styles.filterChipActive]}
                    onPress={() => setShowPastEvents((v) => !v)}
                  >
                    <Text style={[styles.filterChipText, showPastEvents && styles.filterChipTextActive]}>
                      Past events
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScreenHeaderCard>}
      >
        {loading ? (
          <View style={styles.loader}>
            <GradientRingLoader size={40} strokeWidth={7} />
          </View>
        ) : showDismissed ? (
          visibleEvents.filter((e) => dismissedIds.has(e.id)).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t.events.noDismissed}</Text>
            </View>
          ) : (
            visibleEvents.filter((e) => dismissedIds.has(e.id)).map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                organizer={event.organizer}
                date={event.date_label}
                time={event.time_label}
                location={event.location}
                going={event.going}
                maybe={event.maybe}
                maxParticipants={event.max_participants ?? null}
                isActivity={event.is_activity ?? false}
                rsvp={rsvpStatusMap[event.id]}
                isOwner={!!user && event.created_by === user.id}
                circleName={event.circles?.name ?? null}
                noteCount={noteCountMap[event.id] ?? 0}
                hasNewActivity={false}
                onSharePress={() => handleShareEvent(event)}
                actionIcon="refresh"
                onActionPress={() => {
                  setDismissedIds((prev) => { const next = new Set(prev); next.delete(event.id); return next; });
                  if (user) {
                    supabase.from("dismissed_items").delete()
                      .eq("user_id", user.id).eq("item_type", "event").eq("item_id", event.id).then(() => {});
                  }
                }}
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
                    image_url: event.image_url ?? null,
                    max_participants: event.max_participants ?? null,
                    contact_info: event.contact_info ?? null,
                    price_info: event.price_info ?? null,
                    created_by: event.created_by,
                    circleName: event.circles?.name ?? null,
                    circle_id: event.circle_id,
                  });
                }}
              />
            ))
          )
        ) : displayedEvents.filter((e) => !dismissedIds.has(e.id)).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === "circles" ? t.events.noEventsCircles : t.events.noEventsDefault}
            </Text>
          </View>
        ) : (
          displayedEvents
            .filter((e) => !dismissedIds.has(e.id))
            .map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              organizer={event.organizer}
              date={event.date_label}
              time={event.time_label}
              location={event.location}
              going={event.going}
              maybe={event.maybe}
              maxParticipants={event.max_participants ?? null}
              isActivity={event.is_activity ?? false}
              rsvp={rsvpStatusMap[event.id]}
              isOwner={!!user && event.created_by === user.id}
              circleName={event.circles?.name ?? null}
              noteCount={noteCountMap[event.id] ?? 0}
              hasNewActivity={!!lastViewedMap[event.id] && (activityMap[event.id] ?? 0) > lastViewedMap[event.id]}
              onSharePress={() => handleShareEvent(event)}
              actionIcon={!!user && event.created_by === user.id ? undefined : "close"}
              onActionPress={
                !!user && event.created_by === user.id
                  ? undefined
                  : () => {
                      setDismissedIds((prev) => new Set(prev).add(event.id));
                      if (user) {
                        supabase.from("dismissed_items").insert({
                          user_id: user.id,
                          item_type: "event",
                          item_id: event.id,
                        }).then(() => {});
                      }
                    }
              }
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
                  image_url: event.image_url ?? null,
                  max_participants: event.max_participants ?? null,
                  contact_info: event.contact_info ?? null,
                  price_info: event.price_info ?? null,
                  created_by: event.created_by,
                  circleName: event.circles?.name ?? null,
                  circle_id: event.circle_id,
                  hasNewActivity: !!lastViewedMap[event.id] && (activityMap[event.id] ?? 0) > lastViewedMap[event.id],
                });
              }}
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

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: colors.iconbBg,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContentLoader: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIconButtonActive: {
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.iconbBg,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
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
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  filterChipActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.text,
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: isOnboarding ? colors.text : colors.background,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.cardBorder,
    padding: 3,
    alignSelf: "flex-start",
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
  },
  toggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 17,
  },
  toggleOptionActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.card,
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
