import React, { useCallback, useState } from "react";
import * as Location from "expo-location";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUser } from "@clerk/clerk-expo";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { CircleCard } from "../src/components/cards/CircleCard";
import { CreateCircleModal, NewCircleData } from "../src/components/modals/CreateCircleModal";
import { colors } from "../src/theme/colors";
import { useLanguage } from "../src/i18n/LanguageContext";
import { supabase, Circle } from "../lib/supabase";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MemberStatusMap = Record<string, "owner" | "active" | "requested">;
type PendingRequestsMap = Record<string, number>;
type Filter = "all" | "mine";
type SortBy = "newest" | "members";

const PRESET_CATEGORIES = ["Culture", "Friends", "Nature", "Sport", "Food", "Travel"];

export default function CirclesScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { user } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"owner" | "active" | "join" | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [nearMeCity, setNearMeCity] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [circles, setCircles] = useState<(Circle & { member_count: number })[]>([]);
  const [memberStatusMap, setMemberStatusMap] = useState<MemberStatusMap>({});
  const [pendingRequestsMap, setPendingRequestsMap] = useState<PendingRequestsMap>({});
  const [loading, setLoading] = useState(true);

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

  const fetchCircles = useCallback(async () => {
    setLoading(true);

    const [circlesResult, membershipsResult] = await Promise.all([
      supabase
        .from("circles")
        .select("*, circle_members(count)")
        .order("created_at", { ascending: false }),
      user
        ? supabase
            .from("circle_members")
            .select("circle_id, role, status")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Build membership map first so we can filter private circles
    const map: MemberStatusMap = {};
    if (!membershipsResult.error && membershipsResult.data) {
      for (const m of membershipsResult.data as any[]) {
        map[m.circle_id] = m.role === "owner" ? "owner" : m.status;
      }
      setMemberStatusMap(map);
    }

    if (!circlesResult.error && circlesResult.data) {
      const mapped = circlesResult.data
        .map((row: any) => ({
          ...row,
          member_count: row.circle_members?.[0]?.count ?? 0,
        }))
        // Hide private circles unless the user is already a member/owner
        .filter((circle: any) =>
          circle.visibility !== "private" || map[circle.id] != null
        );
      setCircles(mapped);
    }

    if (!membershipsResult.error && membershipsResult.data) {

      // Fetch pending request counts for circles the current user owns
      const ownedIds = Object.entries(map).filter(([, v]) => v === "owner").map(([k]) => k);
      if (ownedIds.length > 0) {
        const { data: pending } = await supabase
          .from("circle_members")
          .select("circle_id")
          .in("circle_id", ownedIds)
          .eq("status", "requested");
        if (pending) {
          const reqMap: PendingRequestsMap = {};
          for (const row of pending as any[]) {
            reqMap[row.circle_id] = (reqMap[row.circle_id] ?? 0) + 1;
          }
          setPendingRequestsMap(reqMap);
        }
      } else {
        setPendingRequestsMap({});
      }
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchCircles();
      // Keep this user's profile up to date so others can see their name
      if (user) {
        const displayName = user.fullName ?? user.firstName ?? null;
        if (displayName) {
          supabase.from("user_profiles").upsert(
            { user_id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          ).then(() => {});
        }
      }
    }, [fetchCircles, user])
  );

  async function handleSave(data: NewCircleData) {
    if (!user) throw new Error("Not signed in.");
    const { data: inserted, error } = await supabase
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
    const { error: memberError } = await supabase.from("circle_members").insert({
      ...memberPayload,
      display_name: user.fullName ?? user.firstName ?? user.username ?? null,
    });

    if (memberError) {
      await supabase.from("circle_members").insert(memberPayload);
    }

    setModalVisible(false);
    fetchCircles();
  }

  return (
    <>
      <ScreenLayout
        header={
          <NavbarTitle
            title={t.nav.circles}
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
        stickyTop={
          <View>
            <TextBlock subtitle={t.circles.subtitle} />

            <View style={styles.filterRow}>
              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, filter === "all" && styles.toggleOptionActive]}
                  onPress={() => setFilter("all")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleLabel, filter === "all" && styles.toggleLabelActive]}>
                    {t.circles.filterAll}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, filter === "mine" && styles.toggleOptionActive]}
                  onPress={() => setFilter("mine")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleLabel, filter === "mine" && styles.toggleLabelActive]}>
                    {t.circles.filterMyCircles}
                  </Text>
                </TouchableOpacity>
              </View>

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
            </View>

            {showFilterPanel && (
              <View style={styles.filterPanel}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionLabel}>Sort</Text>
                  <View style={styles.filterChipRow}>
                    {(["newest", "members"] as SortBy[]).map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.filterChip, sortBy === opt && styles.filterChipActive]}
                        onPress={() => setSortBy(opt)}
                      >
                        <Text style={[styles.filterChipText, sortBy === opt && styles.filterChipTextActive]}>
                          {opt === "newest" ? "Newest" : "Most Members"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionLabel}>Type</Text>
                  <View style={styles.filterChipRow}>
                    {([
                      { value: "owner", label: "Owner" },
                      { value: "active", label: "Member" },
                      { value: "join",   label: "Join" },
                    ] as { value: "owner" | "active" | "join"; label: string }[]).map(({ value, label }) => (
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
                  <Text style={styles.filterSectionLabel}>Category</Text>
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
                  <Text style={styles.filterSectionLabel}>Location</Text>
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
                        {nearMeLoading ? "Locating…" : nearMe && nearMeCity ? nearMeCity : "Near Me"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        }
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : (
          circles
            .filter((circle) => {
              if (filter === "mine" && memberStatusMap[circle.id] !== "owner" && memberStatusMap[circle.id] !== "active") return false;
              if (roleFilter === "owner" && memberStatusMap[circle.id] !== "owner") return false;
              if (roleFilter === "active" && memberStatusMap[circle.id] !== "active") return false;
              if (roleFilter === "join" && memberStatusMap[circle.id] != null) return false;
              if (categoryFilter !== null && circle.category !== categoryFilter) return false;
              if (locationFilter !== null && circle.location !== locationFilter) return false;
              if (nearMe && nearMeCity && !(circle.location ?? "").toLowerCase().includes(nearMeCity.toLowerCase())) return false;
              return true;
            })
            .sort((a, b) =>
              sortBy === "members"
                ? b.member_count - a.member_count
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .map((circle) => (
            <CircleCard
              key={circle.id}
              name={circle.name}
              description={circle.description}
              category={circle.category}
              visibility={circle.visibility}
              memberCount={circle.member_count}
              memberStatus={memberStatusMap[circle.id] ?? null}
              location={circle.location}
              organizer={circle.organizer}
              pendingRequests={pendingRequestsMap[circle.id] ?? 0}
              onPress={() =>
                navigation.navigate("CircleDetail", {
                  id: circle.id,
                  name: circle.name,
                  description: circle.description,
                  visibility: circle.visibility,
                  owner_id: circle.owner_id,
                  member_count: circle.member_count,
                  organizer: circle.organizer,
                })
              }
            />
          ))
          )}
      </ScreenLayout>

      <CreateCircleModal
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
  filterChipNearMe: {
    flexDirection: "row",
    alignItems: "center",
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
});
