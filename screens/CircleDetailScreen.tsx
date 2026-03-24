import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { supabase, CircleMember, Event, UserProfile } from "../lib/supabase";
import { EventCard } from "../src/components/cards/EventCard";

type Props = NativeStackScreenProps<RootStackParamList, "CircleDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "feed" | "members" | "requests";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Public",
  request: "Request to join",
  private: "Private",
};

export default function CircleDetailScreen({ route, navigation }: Props) {
  const { id, name, description, visibility, owner_id } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const nav = useNavigation<Nav>();

  const isOwner = user?.id === owner_id;

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [memberCount, setMemberCount] = useState(route.params.member_count);
  const [membership, setMembership] = useState<CircleMember | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [requests, setRequests] = useState<CircleMember[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load current user's membership status
  useEffect(() => {
    if (!user) return;
    supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setMembership(data));
  }, [id, user]);

  // Load fresh member count
  useEffect(() => {
    supabase
      .from("circle_members")
      .select("*", { count: "exact", head: true })
      .eq("circle_id", id)
      .eq("status", "active")
      .then(({ count }) => {
        if (count !== null) setMemberCount(count);
      });
  }, [id]);

  // Load pending request count for owner badge
  useEffect(() => {
    if (!isOwner) return;
    supabase
      .from("circle_members")
      .select("*", { count: "exact", head: true })
      .eq("circle_id", id)
      .eq("status", "requested")
      .then(({ count }) => setRequestCount(count ?? 0));
  }, [id, isOwner]);

  // Load requests list when on requests tab
  useEffect(() => {
    if (activeTab !== "requests" || !isOwner) return;
    setLoadingRequests(true);
    supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", id)
      .eq("status", "requested")
      .then(async ({ data, error }) => {
        if (!error && data) {
          setRequests(data);
          const userIds = data.map((m: CircleMember) => m.user_id);
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("user_profiles")
              .select("user_id, display_name")
              .in("user_id", userIds);
            if (profiles) {
              const map: Record<string, string> = { ...profileMap };
              for (const p of profiles as UserProfile[]) {
                if (p.display_name) map[p.user_id] = p.display_name;
              }
              setProfileMap(map);
            }
          }
        }
        setLoadingRequests(false);
      });
  }, [id, activeTab, isOwner]);

  async function handleAccept(member: CircleMember) {
    const { error } = await supabase
      .from("circle_members")
      .update({ status: "active" })
      .eq("id", member.id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== member.id));
      setRequestCount((c) => Math.max(0, c - 1));
      setMemberCount((c) => c + 1);
    }
  }

  async function handleDecline(member: CircleMember) {
    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("id", member.id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== member.id));
      setRequestCount((c) => Math.max(0, c - 1));
    }
  }

  // Load feed
  useEffect(() => {
    if (activeTab !== "feed") return;
    setLoadingFeed(true);
    supabase
      .from("events")
      .select("*")
      .eq("circle_id", id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data);
        setLoadingFeed(false);
      });
  }, [id, activeTab]);

  // Load members
  useEffect(() => {
    if (activeTab !== "members") return;
    setLoadingMembers(true);
    supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", id)
      .eq("status", "active")
      .then(async ({ data, error }) => {
        if (!error && data) {
          setMembers(data);

          // Fetch profiles for all members to resolve names
          const userIds = data.map((m: CircleMember) => m.user_id);
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("user_profiles")
              .select("user_id, display_name")
              .in("user_id", userIds);

            if (profiles) {
              const map: Record<string, string> = {};
              for (const p of profiles as UserProfile[]) {
                if (p.display_name) map[p.user_id] = p.display_name;
              }
              setProfileMap(map);
            }
          }

          // Upsert current user's profile so others can see their name
          if (user) {
            const displayName = user.fullName ?? user.firstName ?? null;
            if (displayName) {
              supabase.from("user_profiles").upsert(
                { user_id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
                { onConflict: "user_id" }
              ).then(() => {});
            }
          }
        }
        setLoadingMembers(false);
      });
  }, [id, activeTab, user]);

  async function handleJoin() {
    if (!user || submitting) return;
    setSubmitting(true);

    const newStatus = visibility === "request" ? "requested" : "active";

    const basePayload = {
      circle_id: id,
      user_id: user.id,
      role: "member" as const,
      status: newStatus,
    };

    let { data, error } = await supabase
      .from("circle_members")
      .insert({
        ...basePayload,
        display_name: user.fullName ?? user.firstName ?? user.username ?? null,
      })
      .select()
      .single();

    if (error) {
      ({ data, error } = await supabase
        .from("circle_members")
        .insert(basePayload)
        .select()
        .single());
    }

    if (!error && data) {
      setMembership(data);
      if (newStatus === "active") setMemberCount((c) => c + 1);
    }
    setSubmitting(false);
  }

  async function handleLeave() {
    if (!user || submitting) return;
    setSubmitting(true);

    const wasActive = membership?.status === "active";
    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", id)
      .eq("user_id", user.id);

    if (!error) {
      setMembership(null);
      if (wasActive) setMemberCount((c) => Math.max(0, c - 1));
    }
    setSubmitting(false);
  }

  const isMember = membership?.status === "active";
  const isRequested = membership?.status === "requested";

  function handleDelete() {
    Alert.alert(
      "Delete Circle",
      "This will permanently delete the circle and remove all members. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("circles")
              .delete()
              .eq("id", id);
            if (!error) navigation.goBack();
          },
        },
      ]
    );
  }

  function renderJoinButton() {
    if (isOwner) return null;

    if (isMember) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={handleLeave}
          disabled={submitting}
        >
          <Text style={styles.actionButtonTextOutline}>Leave Circle</Text>
        </TouchableOpacity>
      );
    }

    if (isRequested) {
      return (
        <View style={[styles.actionButton, styles.actionButtonOutline]}>
          <Text style={styles.actionButtonTextOutline}>Requested</Text>
        </View>
      );
    }

    if (visibility === "private") return null;

    return (
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleJoin}
        disabled={submitting}
      >
        <Text style={styles.actionButtonText}>
          {visibility === "request" ? "Request to Join" : "Join Circle"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Back button */}
      <View style={[styles.backRow, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{name}</Text>

        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{memberCount} {memberCount === 1 ? "member" : "members"}</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaText}>{VISIBILITY_LABEL[visibility]}</Text>
        </View>

        <View style={styles.divider} />

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "feed" && styles.tabActive]}
            onPress={() => setActiveTab("feed")}
          >
            <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "members" && styles.tabActive]}
            onPress={() => setActiveTab("members")}
          >
            <Text style={[styles.tabText, activeTab === "members" && styles.tabTextActive]}>Members</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              style={[styles.tab, activeTab === "requests" && styles.tabActive]}
              onPress={() => setActiveTab("requests")}
            >
              <View style={styles.tabWithBadge}>
                <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>Requests</Text>
                {requestCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{requestCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Feed tab */}
        {activeTab === "feed" && (
          loadingFeed ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet</Text>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                organizer={event.organizer}
                date={event.date_label}
                time={event.time_label}
                location={event.location}
                going={event.going}
                maybe={event.maybe}
                onPress={() =>
                  nav.navigate("EventDetail", {
                    id: event.id,
                    title: event.title,
                    organizer: event.organizer,
                    date: event.date_label,
                    time: event.time_label,
                    location: event.location,
                    going: event.going,
                    maybe: event.maybe,
                    description: event.description,
                  })
                }
              />
            ))
          )
        )}

        {/* Members tab */}
        {activeTab === "members" && (
          loadingMembers ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>No members yet</Text>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={member.user_id === owner_id}
                currentUserId={user?.id}
                currentUserName={user?.fullName ?? user?.firstName ?? null}
                profileMap={profileMap}
              />
            ))
          )
        )}

        {/* Requests tab (owner only) */}
        {activeTab === "requests" && (
          loadingRequests ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : requests.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests</Text>
          ) : (
            requests.map((req) => {
              const name =
                (req.user_id === user?.id && (user?.fullName ?? user?.firstName))
                  ? (user.fullName ?? user.firstName ?? req.user_id)
                  : (profileMap[req.user_id] ?? req.display_name ?? req.user_id);
              const parts = name.trim().split(" ");
              const initials = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase();
              return (
                <View key={req.id} style={styles.requestRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <Text style={styles.memberUserId} numberOfLines={1}>{name}</Text>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(req)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(req)}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {/* Fixed footer: join/leave */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        {renderJoinButton()}
      </View>
    </View>
  );
}

function MemberRow({
  member,
  isOwner,
  currentUserId,
  currentUserName,
  profileMap,
}: {
  member: CircleMember;
  isOwner: boolean;
  currentUserId?: string;
  currentUserName?: string | null;
  profileMap: Record<string, string>;
}) {
  const name =
    (member.user_id === currentUserId && currentUserName)
      ? currentUserName
      : (profileMap[member.user_id] ?? member.display_name ?? member.user_id);
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return (
    <View style={styles.memberRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.memberUserId} numberOfLines={1}>{name}</Text>
      {isOwner && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>OWNER</Text>
        </View>
      )}
      {!isOwner && member.role === "admin" && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>ADMIN</Text>
        </View>
      )}
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
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metaIcon: {
    marginRight: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  metaSep: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  loader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textMuted,
  },
  memberUserId: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
  },
  roleBadge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
  },
  footer: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.text,
    borderRadius: 999,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#2C2A26",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  actionButtonOutline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: "500" as const,
  },
  actionButtonTextOutline: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500" as const,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  acceptButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: spacing.sm,
  },
  acceptButtonText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tabBadge: {
    backgroundColor: colors.text,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: colors.card,
    fontSize: 10,
    fontWeight: "700" as const,
  },
});
