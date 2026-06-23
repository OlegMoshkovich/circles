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
import { Spinner } from "../src/components/loaders/Spinner";
import { Colors } from "../src/theme/colors";

import { useUser } from "@clerk/clerk-expo";
import { useLanguage } from "../src/i18n/LanguageContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { fetchHiddenAuthorIds, fetchReportedHiddenContentIds } from "../lib/contentReports";
import { isObjectionableContentError, OBJECTIONABLE_CONTENT_MESSAGE } from "../lib/contentModeration";
import { fetchEventNoteStats } from "../lib/activityStats";
import { supabase, Event } from "../lib/supabase";
import { parseEventDateTime, isPastEvent } from "../lib/events";
import { getCachedScreenData, setCachedScreenData } from "../lib/screenCache";

type EventWithCircle = Event & { circles?: { name: string } | null };
type Filter = "all" | "circles" | "hosting";
type SortBy = "newest" | "recent" | "popular" | "activity" | "new_activity";
type RsvpFilter = "all" | "going" | "maybe";
type ContentType = "all" | "events" | "activity";
type Nav = NativeStackNavigationProp<RootStackParamList>;

// Snapshot of everything a render needs, cached in memory so returning to
// this tab paints instantly while a silent refetch runs in the background.
type EventsSnapshot = {
  events: EventWithCircle[];
  rsvpStatusMap: Record<string, "going" | "maybe">;
  noteCountMap: Record<string, number>;
  activityMap: Record<string, number>;
  lastViewedMap: Record<string, number>;
  dismissedIds: string[];
};


const eventKeyExtractor = (item: EventWithCircle) => item.id;

type EventRowProps = {
  event: EventWithCircle;
  /** True when shown in the "dismissed" view (restore action, no badges). */
  dismissedView: boolean;
  rsvp?: "going" | "maybe";
  isOwner: boolean;
  noteCount: number;
  hasNewActivity: boolean;
  onOpen: (event: EventWithCircle, fromDismissed: boolean) => void;
  onShare: (event: EventWithCircle) => void;
  onDismiss: (event: EventWithCircle) => void;
  onRestore: (event: EventWithCircle) => void;
};

// Memoized so list-wide state changes (filter panel, unrelated rows) don't
// re-render every card; only rows whose own props changed re-render.
const EventRow = React.memo(function EventRow({
  event,
  dismissedView,
  rsvp,
  isOwner,
  noteCount,
  hasNewActivity,
  onOpen,
  onShare,
  onDismiss,
  onRestore,
}: EventRowProps) {
  return (
    <EventCard
      title={event.title}
      organizer={event.organizer}
      date={event.date_label}
      time={event.time_label}
      location={event.location}
      going={event.going}
      maybe={event.maybe}
      maxParticipants={event.max_participants ?? null}
      isActivity={event.is_activity ?? false}
      rsvp={rsvp}
      isOwner={isOwner}
      circleName={event.circles?.name ?? null}
      noteCount={noteCount}
      hasNewActivity={hasNewActivity}
      onSharePress={() => onShare(event)}
      actionIcon={dismissedView ? "refresh" : isOwner ? undefined : "close"}
      onActionPress={
        dismissedView ? () => onRestore(event) : isOwner ? undefined : () => onDismiss(event)
      }
      onPress={() => onOpen(event, dismissedView)}
    />
  );
});

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

  const cacheKey = user ? `events_${user.id}_${filter}` : null;

  const applySnapshot = useCallback((snap: EventsSnapshot) => {
    setEvents(snap.events);
    setRsvpStatusMap(snap.rsvpStatusMap);
    setNoteCountMap(snap.noteCountMap);
    setActivityMap(snap.activityMap);
    setLastViewedMap(snap.lastViewedMap);
    setDismissedIds(new Set(snap.dismissedIds));
    setLoading(false);
  }, []);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);

    try {
      const key = `events_${user.id}_${filter}`;
      const finish = (snap: EventsSnapshot) => {
        setCachedScreenData(key, snap);
        applySnapshot(snap);
      };

      // Dismissed items, RSVPs and memberships are independent -- fetch in one round-trip.
      const [dismissedRes, rsvpRes, membershipRes] = await Promise.all([
        supabase.from("dismissed_items").select("item_id").eq("user_id", user.id).eq("item_type", "event"),
        supabase.from("event_rsvps").select("event_id, status").eq("user_id", user.id),
        supabase.from("circle_members").select("circle_id").eq("user_id", user.id).eq("status", "active"),
      ]);

      const dismissed: string[] = ((dismissedRes.data ?? []) as any[]).map((r) => r.item_id);

      const statusMap: Record<string, "going" | "maybe"> = {};
      for (const r of (rsvpRes.data ?? []) as any[]) {
        statusMap[r.event_id] = r.status;
      }

      const circleIds: string[] = (membershipRes.data as any[])?.map((m) => m.circle_id) ?? [];

      let query = supabase.from("events").select("*, circles(name)");

      if (filter === "circles") {
        if (circleIds.length === 0) {
          finish({ events: [], rsvpStatusMap: statusMap, noteCountMap: {}, activityMap: {}, lastViewedMap: {}, dismissedIds: dismissed });
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
      if (error || !data) {
        setLoading(false);
        return;
      }

      const rows = data as EventWithCircle[];
      // Moderation filters and note stats only depend on the event rows --
      // run all three in a single round-trip instead of the previous
      // reported -> hidden -> notes sequence. Note stats are aggregated
      // server-side (one row per event) when the RPC is available.
      const [reportedEventIds, hiddenAuthorIds, noteStats] = await Promise.all([
        fetchReportedHiddenContentIds("event", rows.map((e) => e.id)),
        fetchHiddenAuthorIds(rows.map((e) => e.created_by).filter((id): id is string => !!id), user.id),
        fetchEventNoteStats(rows.map((e) => e.id), user.id),
      ]);

      const visible = rows.filter((e) => {
        const isOwn = e.created_by === user?.id;
        if (isOwn) return true;
        if (reportedEventIds.has(e.id)) return false;
        if (e.created_by && hiddenAuthorIds.has(e.created_by)) return false;
        return true;
      });

      const noteMap = noteStats.noteCountMap;
      const latestMap = noteStats.latestOtherNoteMap;

      // Read last-viewed timestamps (local storage, fast)
      const lvMap: Record<string, number> = {};
      const keys = Object.keys(latestMap).map((id) => `lastViewed_event_${id}`);
      if (keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [k, val] of pairs) {
          if (val) lvMap[k.replace("lastViewed_event_", "")] = parseInt(val, 10);
        }
      }

      finish({
        events: visible,
        rsvpStatusMap: statusMap,
        noteCountMap: noteMap,
        activityMap: latestMap,
        lastViewedMap: lvMap,
        dismissedIds: dismissed,
      });
    } catch (e) {
      // Any failure (network, auth token, AsyncStorage) must still clear the
      // spinner -- otherwise the screen is stuck loading forever.
      console.error("fetchEvents failed:", e);
    } finally {
      setLoading(false);
    }
  }, [user, filter, applySnapshot]);

  useFocusEffect(
    useCallback(() => {
      // Stale-while-revalidate: paint the last snapshot immediately (no
      // spinner on tab switches), then refresh silently in the background.
      const cached = cacheKey ? getCachedScreenData<EventsSnapshot>(cacheKey) : undefined;
      if (cached) {
        applySnapshot(cached);
        fetchEvents(true);
      } else {
        fetchEvents();
      }
    }, [cacheKey, applySnapshot, fetchEvents])
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
      event_url: event.event_url || null,
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
    if (isObjectionableContentError(error?.message)) {
      Alert.alert("Can't create this event", OBJECTIONABLE_CONTENT_MESSAGE);
    } else {
      Alert.alert("Could not create event", error?.message ?? "Unknown error");
    }
    return false;
  }

  const handleShareEvent = useCallback(async (event: EventWithCircle) => {
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
  }, [t]);

  // Parse each event's date string once per fetched list instead of inside
  // filter/sort callbacks on every render (the sort comparator alone used to
  // re-parse O(n log n) date strings per render).
  const eventTimeMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) map[e.id] = parseEventDateTime(e.date_label, e.time_label);
    return map;
  }, [events]);

  const visibleEvents = React.useMemo(
    () => events.filter((e) => showPastEvents || !isPastEvent(e)),
    [events, showPastEvents]
  );

  const displayedEvents = React.useMemo(
    () =>
      visibleEvents
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
          if (sortBy === "recent") return (eventTimeMap[a.id] ?? 0) - (eventTimeMap[b.id] ?? 0);
          if (sortBy === "popular") return (b.going + b.maybe) - (a.going + a.maybe);
          if (sortBy === "activity") return (noteCountMap[b.id] ?? 0) - (noteCountMap[a.id] ?? 0);
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
    [visibleEvents, rsvpFilter, contentType, sortBy, rsvpStatusMap, activityMap, lastViewedMap, noteCountMap, eventTimeMap]
  );

  const handleOpenEvent = useCallback((event: EventWithCircle, fromDismissed: boolean) => {
    const hasNew =
      !fromDismissed && !!lastViewedMap[event.id] && (activityMap[event.id] ?? 0) > lastViewedMap[event.id];
    if (!fromDismissed) {
      AsyncStorage.setItem(`lastViewed_event_${event.id}`, Date.now().toString());
      setLastViewedMap((prev) => ({ ...prev, [event.id]: Date.now() }));
    }
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
      event_url: event.event_url ?? null,
      created_by: event.created_by,
      circleName: event.circles?.name ?? null,
      circle_id: event.circle_id,
      ...(fromDismissed ? {} : { hasNewActivity: hasNew }),
    });
  }, [navigation, rsvpStatusMap, lastViewedMap, activityMap]);

  const handleDismissEvent = useCallback((event: EventWithCircle) => {
    setDismissedIds((prev) => new Set(prev).add(event.id));
    if (user) {
      supabase.from("dismissed_items").insert({
        user_id: user.id,
        item_type: "event",
        item_id: event.id,
      }).then(() => {});
    }
  }, [user?.id]);

  const handleRestoreEvent = useCallback((event: EventWithCircle) => {
    setDismissedIds((prev) => { const next = new Set(prev); next.delete(event.id); return next; });
    if (user) {
      supabase.from("dismissed_items").delete()
        .eq("user_id", user.id).eq("item_type", "event").eq("item_id", event.id).then(() => {});
    }
  }, [user?.id]);

  // The rows the virtualized list actually shows.
  const listEvents = React.useMemo(
    () =>
      showDismissed
        ? visibleEvents.filter((e) => dismissedIds.has(e.id))
        : displayedEvents.filter((e) => !dismissedIds.has(e.id)),
    [showDismissed, visibleEvents, displayedEvents, dismissedIds]
  );

  const renderEventRow = useCallback(
    ({ item }: { item: EventWithCircle }) => (
      <EventRow
        event={item}
        dismissedView={showDismissed}
        rsvp={rsvpStatusMap[item.id]}
        isOwner={!!user && item.created_by === user.id}
        noteCount={noteCountMap[item.id] ?? 0}
        hasNewActivity={
          !showDismissed && !!lastViewedMap[item.id] && (activityMap[item.id] ?? 0) > lastViewedMap[item.id]
        }
        onOpen={handleOpenEvent}
        onShare={handleShareEvent}
        onDismiss={handleDismissEvent}
        onRestore={handleRestoreEvent}
      />
    ),
    [showDismissed, rsvpStatusMap, noteCountMap, lastViewedMap, activityMap, user?.id, handleOpenEvent, handleShareEvent, handleDismissEvent, handleRestoreEvent]
  );

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
        onRefresh={async () => { setRefreshing(true); try { await fetchEvents(true); } finally { setRefreshing(false); } }}
        refreshing={refreshing}
        listData={loading ? [] : listEvents}
        renderItem={renderEventRow}
        keyExtractor={eventKeyExtractor}
        listEmptyComponent={
          loading ? (
            <View style={styles.loader}>
              <Spinner size="large" />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {showDismissed
                  ? t.events.noDismissed
                  : filter === "circles"
                    ? t.events.noEventsCircles
                    : t.events.noEventsDefault}
              </Text>
            </View>
          )
        }
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
      />

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
