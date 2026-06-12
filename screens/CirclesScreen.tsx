import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { CircleCard } from "../src/components/cards/CircleCard";
import { CreateCircleModal, NewCircleData } from "../src/components/modals/CreateCircleModal";
import { Spinner } from "../src/components/loaders/Spinner";
import { Colors } from "../src/theme/colors";

import { useLanguage } from "../src/i18n/LanguageContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { useHomeReady } from "../src/contexts/HomeReadyContext";
import { fetchHiddenAuthorIds, fetchReportedHiddenContentIds } from "../lib/contentReports";
import { fetchCircleLatestActivity } from "../lib/activityStats";
import { supabase, getAuthClient, Circle } from "../lib/supabase";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MemberStatusMap = Record<string, "owner" | "active" | "requested" | "invited">;
type PendingRequestsMap = Record<string, number>;
type SortBy = "newest" | "members" | "new_activity";

const PRESET_CATEGORIES = ["Culture", "Friends", "Nature", "Sport", "Food", "Travel"];

type CircleWithCount = Circle & { member_count: number };

// Stale-while-revalidate cache for the Circles list. The first network load on
// a fresh login is two sequential round-trips; persisting the last result lets
// every subsequent open paint instantly from disk while the refresh runs
// silently in the background.
const circlesCacheKey = (userId: string) => `circles_cache_v1_${userId}`;

type CirclesCache = {
  circles: CircleWithCount[];
  memberStatusMap: MemberStatusMap;
  pendingRequestsMap: PendingRequestsMap;
  activityMap: Record<string, number>;
};

async function readCirclesCache(userId: string): Promise<CirclesCache | null> {
  try {
    const raw = await AsyncStorage.getItem(circlesCacheKey(userId));
    return raw ? (JSON.parse(raw) as CirclesCache) : null;
  } catch {
    return null;
  }
}

function writeCirclesCache(userId: string, payload: CirclesCache) {
  // Fire-and-forget: never block the UI on persistence.
  void AsyncStorage.setItem(circlesCacheKey(userId), JSON.stringify(payload)).catch(() => {});
}

const circleKeyExtractor = (item: CircleWithCount) => item.id;

type CircleRowProps = {
  circle: CircleWithCount;
  /** True when shown in the "dismissed" view (restore action, no badges). */
  dismissedView: boolean;
  memberStatus: "owner" | "active" | "requested" | "invited" | null;
  pendingRequests: number;
  hasNewActivity: boolean;
  onOpen: (circle: CircleWithCount, fromDismissed: boolean) => void;
  onDismiss: (circle: CircleWithCount) => void;
  onRestore: (circle: CircleWithCount) => void;
};

// Memoized so list-wide state changes (filter panel, unrelated rows) don't
// re-render every card; only rows whose own props changed re-render.
const CircleRow = React.memo(function CircleRow({
  circle,
  dismissedView,
  memberStatus,
  pendingRequests,
  hasNewActivity,
  onOpen,
  onDismiss,
  onRestore,
}: CircleRowProps) {
  return (
    <CircleCard
      name={circle.name}
      description={circle.description}
      category={circle.category}
      visibility={circle.visibility}
      memberCount={circle.member_count}
      memberStatus={memberStatus}
      location={circle.location}
      organizer={circle.organizer}
      pendingRequests={pendingRequests}
      hasNewActivity={hasNewActivity}
      actionIcon={dismissedView ? "refresh" : memberStatus === "owner" ? undefined : "close"}
      onActionPress={
        dismissedView ? () => onRestore(circle) : memberStatus === "owner" ? undefined : () => onDismiss(circle)
      }
      onPress={() => onOpen(circle, dismissedView)}
    />
  );
});

export default function CirclesScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { markHomeReady } = useHomeReady();
  const [modalVisible, setModalVisible] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"owner" | "active" | "invited" | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [nearMeCity, setNearMeCity] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [circles, setCircles] = useState<(Circle & { member_count: number })[]>([]);
  const [memberStatusMap, setMemberStatusMap] = useState<MemberStatusMap>({});
  const [pendingRequestsMap, setPendingRequestsMap] = useState<PendingRequestsMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [lastViewedMap, setLastViewedMap] = useState<Record<string, number>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  // Guards markHomeReady against a brief premature mount during the login
  // transition that immediately unmounts -- without this its in-flight fetch
  // could lift the splash overlay before the real (final) mount is ready.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleNearMe() {
    if (nearMe) {
      setNearMe(false);
      setNearMeCity(null);
      return;
    }
    setNearMeLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setNearMeLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      const city = geo?.city ?? geo?.subregion ?? geo?.region ?? null;
      setNearMeCity(city);
      setNearMe(true);
      setLocationFilter(null);
    } finally {
      setNearMeLoading(false);
    }
  }

  const fetchCircles = useCallback(async (silent = false) => {
    if (!silent) {
      // On the very first load, paint instantly from the cached snapshot (if
      // any) and let the network refresh run silently underneath -- only fall
      // back to the spinner when there's nothing cached to show.
      const cached = !hasLoadedOnceRef.current && user ? await readCirclesCache(user.id) : null;
      if (cached) {
        setCircles(cached.circles);
        setMemberStatusMap(cached.memberStatusMap);
        setPendingRequestsMap(cached.pendingRequestsMap);
        setActivityMap(cached.activityMap);
        setLoading(false);
        if (isMountedRef.current) markHomeReady();
      } else {
        setLoading(true);
      }
    }

    try {
      // Read through the Clerk-authed client so RLS evaluates with the user's
      // identity (reveals their memberships and any private circles they own/joined).
      const token = await getToken({ template: "supabase" });
      const client = token ? getAuthClient(token) : supabase;

      // All of these are independent of each other, so fetch them in one round-trip
      // instead of chaining awaits (dismissed → circles → activity were 3 hops).
      const [
        dismissedResult,
        circlesResult,
        membershipsResult,
        invitationsResult,
        latestActivityMap,
      ] = await Promise.all([
        user
          ? client.from("dismissed_items").select("item_id").eq("user_id", user.id).eq("item_type", "circle")
          : Promise.resolve({ data: [], error: null }),
        client.from("circles").select("*, circle_members(count)").order("created_at", { ascending: false }),
        user
          ? client.from("circle_members").select("circle_id, role, status").eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
        user
          ? client.from("notifications").select("data").eq("user_id", user.id).eq("type", "circle_invitation").eq("read", false)
          : Promise.resolve({ data: [], error: null }),
        // Aggregated server-side (one row per circle) when the RPC exists;
        // falls back to bounded notes/events scans otherwise.
        fetchCircleLatestActivity(user?.id ?? null, client),
      ]);

      if (dismissedResult.data) {
        setDismissedIds(new Set((dismissedResult.data as any[]).map((r) => r.item_id)));
      }

      // Build membership map first so we can filter private circles
      const map: MemberStatusMap = {};
      if (!membershipsResult.error && membershipsResult.data) {
        for (const m of membershipsResult.data as any[]) {
          map[m.circle_id] = m.role === "owner" ? "owner" : m.status;
        }
      }
      // Add invited status from pending notifications
      if (!invitationsResult.error && invitationsResult.data) {
        for (const n of invitationsResult.data as any[]) {
          const circleId = n.data?.circle_id;
          if (circleId && !map[circleId]) {
            map[circleId] = "invited";
          }
        }
      }
      setMemberStatusMap(map);

      // Post-filtering (reported/hidden) and owner pending-request counts both depend
      // on the batch above but not on each other -- run them in one more round-trip.
      const ownedIds = Object.entries(map).filter(([, v]) => v === "owner").map(([k]) => k);
      if (!circlesResult.error && circlesResult.data) {
        const mapped = (circlesResult.data as any[])
          .map((row) => ({
            ...row,
            member_count: row.circle_members?.[0]?.count ?? 0,
          }))
          // Hide private circles unless the user is already a member/owner
          .filter((circle) => circle.visibility !== "private" || map[circle.id] != null);
        const [reportedCircleIds, hiddenAuthorIds, pendingResult] = await Promise.all([
          fetchReportedHiddenContentIds("circle", mapped.map((c: any) => c.id)),
          fetchHiddenAuthorIds(mapped.map((c: any) => c.owner_id).filter((id: any): id is string => !!id)),
          ownedIds.length > 0
            ? client.from("circle_members").select("circle_id").in("circle_id", ownedIds).eq("status", "requested")
            : Promise.resolve({ data: [], error: null }),
        ]);
        const visibleCircles = mapped.filter((c: any) => {
          const isOwn = c.owner_id === user?.id;
          if (isOwn) return true;
          if (reportedCircleIds.has(c.id)) return false;
          if (c.owner_id && hiddenAuthorIds.has(c.owner_id)) return false;
          return true;
        });
        setCircles(visibleCircles);

        const reqMap: PendingRequestsMap = {};
        for (const row of (pendingResult.data ?? []) as any[]) {
          reqMap[row.circle_id] = (reqMap[row.circle_id] ?? 0) + 1;
        }
        setPendingRequestsMap(reqMap);

        // Persist this snapshot so the next open paints instantly from disk.
        if (user) {
          writeCirclesCache(user.id, {
            circles: visibleCircles,
            memberStatusMap: map,
            pendingRequestsMap: reqMap,
            activityMap: latestActivityMap,
          });
        }
      } else {
        setPendingRequestsMap({});
      }

      // Latest activity per circle (notes + events) -- fetched in the batch above
      setActivityMap(latestActivityMap);

      // Read last-viewed timestamps from AsyncStorage
      const circleIds = (circlesResult.data ?? []).map((c: any) => c.id);
      if (circleIds.length > 0) {
        const keys = circleIds.map((id: string) => `lastViewed_circle_${id}`);
        const pairs = await AsyncStorage.multiGet(keys);
        const lvMap: Record<string, number> = {};
        for (const [key, val] of pairs) {
          if (val) {
            const id = key.replace("lastViewed_circle_", "");
            lvMap[id] = parseInt(val, 10);
          }
        }
        setLastViewedMap(lvMap);
      }
    } catch (e) {
      // Any failure (network, auth token, AsyncStorage) must still clear the
      // spinner -- otherwise the screen is stuck loading forever.
      console.error("fetchCircles failed:", e);
    } finally {
      setLoading(false);
      // First load settled (success or failure) -- let the App lift the splash
      // overlay so a stalled fetch can't strand the user on the splash screen.
      if (isMountedRef.current) markHomeReady();
    }
  }, [user, getToken, markHomeReady]);

  useFocusEffect(
    useCallback(() => {
      const silent = hasLoadedOnceRef.current;
      void fetchCircles(silent).then(() => {
        hasLoadedOnceRef.current = true;
      });
      // Note: the user's profile upsert happens once per app open in
      // ProfileSync (App.tsx) -- doing it here too meant an extra token
      // fetch + network write on every tab focus.
    }, [fetchCircles])
  );

  async function handleSave(data: NewCircleData) {
    if (!user) throw new Error("Not signed in.");
    const token = await getToken({ template: "supabase" });
    if (!token) throw new Error("Could not authenticate. Please sign in again.");
    const client = getAuthClient(token);

    const { data: inserted, error } = await client
      .from("circles")
      .insert({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        visibility: data.visibility,
        location: data.location || null,
        organizer: data.organizer || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const memberPayload: any = {
      circle_id: inserted.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    };

    // Try with display_name first; fall back without it if the column doesn't exist yet
    const { error: memberError } = await client.from("circle_members").insert({
      ...memberPayload,
      display_name: user.fullName ?? user.firstName ?? user.username ?? null,
    });

    if (memberError) {
      await client.from("circle_members").insert(memberPayload);
    }

    setModalVisible(false);
    fetchCircles();
  }


  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const screenBgColor = colors.background;

  // Derived lists are memoized so toggling UI state (filter panel, modals)
  // doesn't re-filter/re-sort the whole array on every render.
  const dismissedCircles = React.useMemo(
    () => circles.filter((c) => dismissedIds.has(c.id)),
    [circles, dismissedIds]
  );

  const displayedCircles = React.useMemo(
    () =>
      circles
        .filter((circle) => {
          if (dismissedIds.has(circle.id)) return false;
          if (roleFilter === "owner" && memberStatusMap[circle.id] !== "owner") return false;
          if (roleFilter === "active" && memberStatusMap[circle.id] !== "active") return false;
          if (roleFilter === "invited" && memberStatusMap[circle.id] !== "invited") return false;
          if (categoryFilter !== null && circle.category !== categoryFilter) return false;
          if (locationFilter !== null && circle.location !== locationFilter) return false;
          if (nearMe && nearMeCity && !(circle.location ?? "").toLowerCase().includes(nearMeCity.toLowerCase())) return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === "new_activity") {
            const aNew = (activityMap[a.id] ?? 0) > (lastViewedMap[a.id] ?? 0) ? 1 : 0;
            const bNew = (activityMap[b.id] ?? 0) > (lastViewedMap[b.id] ?? 0) ? 1 : 0;
            return bNew - aNew;
          }
          return sortBy === "members"
            ? b.member_count - a.member_count
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
    [circles, dismissedIds, roleFilter, categoryFilter, locationFilter, nearMe, nearMeCity, sortBy, memberStatusMap, activityMap, lastViewedMap]
  );

  const handleOpenCircle = useCallback((circle: CircleWithCount, fromDismissed: boolean) => {
    if (!fromDismissed) {
      AsyncStorage.setItem(`lastViewed_circle_${circle.id}`, Date.now().toString());
      setLastViewedMap((prev) => ({ ...prev, [circle.id]: Date.now() }));
    }
    navigation.navigate("CircleDetail", {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      visibility: circle.visibility,
      owner_id: circle.owner_id,
      member_count: circle.member_count,
      organizer: circle.organizer,
    });
  }, [navigation]);

  const handleDismissCircle = useCallback((circle: CircleWithCount) => {
    setDismissedIds((prev) => new Set(prev).add(circle.id));
    if (user) {
      supabase.from("dismissed_items").insert({
        user_id: user.id,
        item_type: "circle",
        item_id: circle.id,
      }).then(() => {});
    }
  }, [user?.id]);

  const handleRestoreCircle = useCallback((circle: CircleWithCount) => {
    setDismissedIds((prev) => { const next = new Set(prev); next.delete(circle.id); return next; });
    if (user) {
      supabase.from("dismissed_items").delete()
        .eq("user_id", user.id).eq("item_type", "circle").eq("item_id", circle.id).then(() => {});
    }
  }, [user?.id]);

  const showLoader = loading && circles.length === 0;
  const listCircles = React.useMemo(
    () => (showLoader ? [] : showDismissed ? dismissedCircles : displayedCircles),
    [showLoader, showDismissed, dismissedCircles, displayedCircles]
  );

  const renderCircleRow = useCallback(
    ({ item }: { item: CircleWithCount }) => (
      <CircleRow
        circle={item}
        dismissedView={showDismissed}
        memberStatus={memberStatusMap[item.id] ?? null}
        pendingRequests={showDismissed ? 0 : pendingRequestsMap[item.id] ?? 0}
        hasNewActivity={
          !showDismissed && !!lastViewedMap[item.id] && (activityMap[item.id] ?? 0) > lastViewedMap[item.id]
        }
        onOpen={handleOpenCircle}
        onDismiss={handleDismissCircle}
        onRestore={handleRestoreCircle}
      />
    ),
    [showDismissed, memberStatusMap, pendingRequestsMap, lastViewedMap, activityMap, handleOpenCircle, handleDismissCircle, handleRestoreCircle]
  );

  return (
    <>
      <ScreenLayout
        backgroundColor={screenBgColor}
        contentStyle={showLoader ? styles.scrollContentLoader : undefined}
        onRefresh={async () => { setRefreshing(true); try { await fetchCircles(true); } finally { setRefreshing(false); } }}
        refreshing={refreshing}
        listData={listCircles}
        renderItem={renderCircleRow}
        keyExtractor={circleKeyExtractor}
        listEmptyComponent={
          showLoader ? (
            <View style={styles.loader}>
              <Spinner size="large" />
            </View>
          ) : showDismissed ? (
            <View style={styles.loader}>
              <Text style={{ fontSize: 14, fontFamily: "Lora_400Regular", color: colors.textMuted }}>{t.circles.noDismissed}</Text>
            </View>
          ) : null
        }
        stickyTop={<ScreenHeaderCard>
          <NavbarTitle
            title={t.nav.circles}
            rightElement={
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TouchableOpacity
                  style={[styles.filterIconButton, (sortBy !== "newest" || categoryFilter !== null || locationFilter !== null || nearMe || roleFilter !== null) && styles.filterIconButtonActive]}
                  onPress={() => setShowFilterPanel((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color={(sortBy !== "newest" || categoryFilter !== null || locationFilter !== null || nearMe || roleFilter !== null) ? colors.iconbBg : colors.textMuted}
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
          {/* <TextBlock subtitle={t.circles.subtitle} /> */}

          {showFilterPanel && (
            <View style={styles.filterPanel}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.circles.typeLabel}</Text>
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, roleFilter === null && styles.filterChipActive]}
                    onPress={() => setRoleFilter(null)}
                  >
                    <Text style={[styles.filterChipText, roleFilter === null && styles.filterChipTextActive]}>
                      {t.circles.filterAll}
                    </Text>
                  </TouchableOpacity>
                  {([
                    { value: "owner", label: t.circles.typeOwner },
                    { value: "active", label: t.circles.typeMember },
                    { value: "invited", label: t.circles.badgeInvited },
                  ] as { value: "owner" | "active" | "invited"; label: string }[]).map(({ value, label }) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterChip, roleFilter === value && styles.filterChipActive]}
                      onPress={() => setRoleFilter(roleFilter === value ? null : value)}
                    >
                      <Text style={[styles.filterChipText, roleFilter === value && styles.filterChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.common.sort}</Text>
                <View style={styles.filterChipRow}>
                  {(["newest", "members", "new_activity"] as SortBy[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, sortBy === opt && styles.filterChipActive]}
                      onPress={() => setSortBy(opt)}
                    >
                      <Text style={[styles.filterChipText, sortBy === opt && styles.filterChipTextActive]}>
                        {opt === "newest" ? t.circles.sortNewest : opt === "members" ? t.circles.sortMembers : t.circles.sortNewActivity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.circles.categoryLabel}</Text>
                <View style={styles.filterChipRow}>
                  {PRESET_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                      onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    >
                      <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>{t.circles.location}</Text>
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, nearMe && styles.filterChipActive, styles.filterChipNearMe]}
                    onPress={handleNearMe}
                    disabled={nearMeLoading}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={13}
                      color={nearMe ? colors.card : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.filterChipText, nearMe && styles.filterChipTextActive]}>
                      {nearMeLoading ? t.common.locating : nearMe && nearMeCity ? nearMeCity : t.common.nearMe}
                    </Text>
                  </TouchableOpacity>
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
                </View>
              </View>
            </View>
          )}
        </ScreenHeaderCard>}
      />

      <CreateCircleModal
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
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  filterIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIconButtonActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.iconbBg,
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
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
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  filterChipNearMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.text,
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
  })
}
