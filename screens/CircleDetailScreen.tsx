import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { Colors } from "../src/theme/colors";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { useLanguage } from "../src/i18n/LanguageContext";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { supabase, CircleMember, CircleNote, Event, UserProfile } from "../lib/supabase";
import { CircleInviteModal } from "../src/components/modals/CircleInviteModal";
import { EditCircleModal, EditCircleData } from "../src/components/modals/EditCircleModal";
import { CreateEventModal, NewEventData } from "../src/components/modals/CreateEventModal";
import { PublicProfileModal } from "../src/components/modals/PublicProfileModal";
import { EventCard } from "../src/components/cards/EventCard";
import { ThemedBackground } from "../src/components/layout/ThemedBackground";

type Props = NativeStackScreenProps<RootStackParamList, "CircleDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "events" | "feed" | "members" | "description";
type FeedItem =
  | { kind: "event"; data: Event }
  | { kind: "note"; data: CircleNote };

// VISIBILITY_LABEL is now built dynamically with translations (see visibilityLabel() inside the component)

export default function CircleDetailScreen({ route, navigation }: Props) {
  const { id, owner_id } = route.params;
  const insets = useSafeAreaInsets();
  const footerBottomInset = insets.bottom > 0 ? 0 : 24;
  const { user } = useUser();
  const nav = useNavigation<Nav>();

  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const isOwner = user?.id === owner_id;
  const visibilityLabel: Record<string, string> = {
    public: t.circles.public,
    request: t.circles.visibilityRequestToJoin,
    private: t.circles.private,
  };

  // Mutable display fields (can be updated via edit modal)
  const [name, setName] = useState(route.params.name);
  const [description, setDescription] = useState(route.params.description ?? "");
  const [visibility, setVisibility] = useState(route.params.visibility);
  const [organizer] = useState(route.params.organizer ?? null);

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [memberCount, setMemberCount] = useState(route.params.member_count);
  const [membership, setMembership] = useState<CircleMember | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [eventNoteCountMap, setEventNoteCountMap] = useState<Record<string, number>>({});
  const [prevViewedEventsAt, setPrevViewedEventsAt] = useState<number>(0);
  const lastViewedKey = `lastViewed_circle_events_${id}`;
  const [notes, setNotes] = useState<CircleNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [requests, setRequests] = useState<CircleMember[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [circleInviteVisible, setCircleInviteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [createEventVisible, setCreateEventVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [didAutoSelectInitialTab, setDidAutoSelectInitialTab] = useState(false);

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

  // Load pending invite notification for current user
  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "circle_invitation")
      .eq("read", false)
      .filter("data->>circle_id", "eq", id)
      .maybeSingle()
      .then(({ data }) => setPendingInviteId(data?.id ?? null));
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

  // Load requests list for the owner's description tab
  useEffect(() => {
    if (activeTab !== "description" || !isOwner) return;
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

  const loadFeed = useCallback(() => {
    setLoadingFeed(true);
    return Promise.all([
      supabase.from("events").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
      supabase.from("circle_notes").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
    ]).then(async ([eventsResult, notesResult]) => {
      if (!eventsResult.error && eventsResult.data) {
        setEvents(eventsResult.data);
        const eventIds = eventsResult.data.map((e: any) => e.id);
        if (eventIds.length > 0) {
          const { data: noteCounts } = await supabase
            .from("event_notes")
            .select("event_id")
            .in("event_id", eventIds);
          if (noteCounts) {
            const map: Record<string, number> = {};
            for (const row of noteCounts as any[]) {
              map[row.event_id] = (map[row.event_id] ?? 0) + 1;
            }
            setEventNoteCountMap(map);
          }
        }
      }
      if (!notesResult.error && notesResult.data) setNotes(notesResult.data);
      const eventRows = eventsResult.error ? [] : (eventsResult.data ?? []);
      const noteRows = notesResult.error ? [] : (notesResult.data ?? []);
      if (!didAutoSelectInitialTab) {
        const nextTab: Tab =
          eventRows.length > 0
            ? "events"
            : noteRows.length > 0
              ? "feed"
              : "description";
        setActiveTab(nextTab);
        setDidAutoSelectInitialTab(true);
      }
      setLoadingFeed(false);
    });
  }, [didAutoSelectInitialTab, id]);

  // Load circle events + feed items
  useEffect(() => {
    if (activeTab !== "events" && activeTab !== "feed") return;
    loadFeed();
  }, [activeTab, loadFeed]);

  // Track last-viewed timestamp for new event dots
  // Read previous visit time on mount, then update to now when events tab is viewed
  useEffect(() => {
    AsyncStorage.getItem(lastViewedKey).then((val) => {
      setPrevViewedEventsAt(val ? parseInt(val, 10) : 0);
      AsyncStorage.setItem(lastViewedKey, Date.now().toString());
    });
  }, [lastViewedKey]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "events" && activeTab !== "feed") return;
      loadFeed();
    }, [activeTab, loadFeed])
  );

  async function handleSaveEvent(data: NewEventData) {
    const { data: createdEvent, error } = await supabase.from("events").insert({
      title: data.title,
      organizer: data.organizer,
      date_label: data.date,
      time_label: data.time,
      duration_minutes: data.duration ?? null,
      location: data.location,
      description: data.description,
      image_url: data.image_url || null,
      max_participants: data.max_participants,
      contact_info: data.contact_info || null,
      price_info: data.price_info || null,
      visibility: data.visibility === "circle" ? "circle" : data.visibility,
      circle_id: id,
      invited_user_ids: data.invited_user_ids?.length > 0 ? data.invited_user_ids : null,
      is_activity: data.is_activity,
      created_by: user?.id ?? null,
    }).select("id").single();
    if (!error) {
      if (user?.id) {
        const { error: rsvpError } = await supabase
          .from("event_rsvps")
          .upsert(
            { event_id: createdEvent.id, user_id: user.id, status: "going" },
            { onConflict: "event_id,user_id" }
          );
        if (rsvpError) {
          console.error("Failed to auto-join event creator", rsvpError);
        }
      }
      setCreateEventVisible(false);
      // Reload circle events
      setActiveTab("events");
      await loadFeed();
      return true;
    }
    console.error("Failed to create circle event", error);
    Alert.alert("Could not create event", error.message);
    return false;
  }

  async function handlePostNote() {
    if (!user || !noteText.trim() || postingNote) return;
    setPostingNote(true);
    const { data, error } = await supabase
      .from("circle_notes")
      .insert({
        circle_id: id,
        user_id: user.id,
        display_name: user.fullName ?? user.firstName ?? user.username ?? null,
        avatar_url: (user.externalAccounts?.find((a: any) => a.provider === "oauth_google" || a.provider === "google") as any)?.imageUrl ?? null,
        content: noteText.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNoteText("");
    }
    setPostingNote(false);
  }

  async function handleShareEvent(event: Event) {
    const shareUrl = "https://valmia.ch";
    const lines = [
      event.title,
      `${event.date_label} · ${event.time_label}`,
      event.location,
      name ? `${t.nav.circles}: ${name}` : null,
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

  // Load members
  useEffect(() => {
    if (activeTab !== "members") return;
    setLoadingMembers(true);

    Promise.all([
      supabase.from("circle_members").select("*").eq("circle_id", id).eq("status", "active"),
      supabase
        .from("notifications")
        .select("data")
        .eq("type", "circle_invitation")
        .filter("data->>circle_id", "eq", id)
        .eq("read", false),
    ]).then(async ([membersResult, notifsResult]) => {
      if (!membersResult.error && membersResult.data) {
        setMembers(membersResult.data);

        // Fetch profiles for active members
        const userIds = membersResult.data.map((m: CircleMember) => m.user_id);
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

      // Extract invited users from pending notifications
      if (!notifsResult.error && notifsResult.data) {
        const seen = new Set<string>();
        const invited = (notifsResult.data as any[])
          .filter((n) => n.data?.invitee_id && !seen.has(n.data.invitee_id) && seen.add(n.data.invitee_id))
          .map((n) => ({
            user_id: n.data.invitee_id as string,
            name: n.data.invitee_id as string,
          }));

        // Resolve names for invited users
        const invitedIds = invited.map((u) => u.user_id);
        if (invitedIds.length > 0) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("user_id, display_name")
            .in("user_id", invitedIds);
          if (profiles) {
            const nameMap: Record<string, string> = {};
            for (const p of profiles as UserProfile[]) {
              if (p.display_name) nameMap[p.user_id] = p.display_name;
            }
            setInvitedUsers(invited.map((u) => ({ ...u, name: nameMap[u.user_id] ?? u.user_id })));
          } else {
            setInvitedUsers(invited);
          }
        } else {
          setInvitedUsers([]);
        }
      }

      setLoadingMembers(false);
    });
  }, [id, activeTab, user]);

  async function handleJoin() {
    if (!user || submitting) return;
    setSubmitting(true);

    // If accepting an invitation, always join as active regardless of visibility
    const newStatus = pendingInviteId ? "active" : (visibility === "request" ? "requested" : "active");

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

    // Mark the invitation notification as read
    if (pendingInviteId) {
      await supabase.from("notifications").update({ read: true }).eq("id", pendingInviteId);
      setPendingInviteId(null);
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
      t.circles.deleteTitle,
      t.circles.deleteMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
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
          <Text style={styles.actionButtonTextOutline}>{t.circles.leave}</Text>
        </TouchableOpacity>
      );
    }

    if (isRequested) {
      return (
        <View style={[styles.actionButton, styles.actionButtonOutline]}>
          <Text style={styles.actionButtonTextOutline}>{t.circles.requested}</Text>
        </View>
      );
    }

    if (pendingInviteId) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={handleJoin}
          disabled={submitting}
        >
          <Text style={styles.joinButtonText}>{t.circles.acceptInvitation}</Text>
        </TouchableOpacity>
      );
    }

    if (visibility === "private") return null;

    return (
      <TouchableOpacity
        style={[styles.actionButton, styles.joinButton]}
        onPress={handleJoin}
        disabled={submitting}
      >
        <Text style={styles.joinButtonText}>
          {visibility === "request" ? t.circles.requestToJoin : t.circles.join}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ThemedBackground backgroundColor={colors.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Back button */}
      <View style={[styles.backRow, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backLabel}>{t.common.back}</Text>
        </TouchableOpacity>
        {(isOwner || isMember) && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setCreateEventVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            {isOwner && (
            <TouchableOpacity
              onPress={() => setEditVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="create-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            )}
            {isOwner && (
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Header card - fixed, not scrollable */}
      <View style={[styles.headerCard, styles.headerCardOuter]}>
        <Text style={styles.title}>{name}</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <View style={styles.tabList}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "events" && styles.tabActive]}
              onPress={() => setActiveTab("events")}
            >
              <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>{t.circles.eventsTab}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "feed" && styles.tabActive]}
              onPress={() => setActiveTab("feed")}
            >
              <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>{t.circles.feed}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "members" && styles.tabActive]}
              onPress={() => setActiveTab("members")}
            >
              <Text style={[styles.tabText, activeTab === "members" && styles.tabTextActive]}>{t.circles.members}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "description" && styles.tabActive]}
              onPress={() => setActiveTab("description")}
            >
              <View style={styles.tabWithBadge}>
                <Text style={[styles.tabText, activeTab === "description" && styles.tabTextActive]}>{t.circles.descriptionTab}</Text>
                {isOwner && requestCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{requestCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed tab: sticky compose + scrollable notes */}
      {activeTab === "feed" && (
        <View style={styles.feedContainer}>
          {loadingFeed ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : (() => {
            const sortedNotes = [...notes].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return (
              <View style={[styles.tabContentCard, styles.feedCard, { flex: 1 }]}>
                {(isOwner || isMember) && (
                  <View style={styles.composeBox}>
                    <View style={styles.composeRow}>
                      <Ionicons name="chatbubble-outline" size={18} color={colors.text} style={styles.composeIcon} />
                      <TextInput
                        style={styles.composeInput}
                        placeholder={t.circles.notePlaceholder}
                        placeholderTextColor={colors.textMuted}
                        value={noteText}
                        onChangeText={setNoteText}
                        multiline
                        maxLength={500}
                      />
                    </View>
                    {noteText.trim().length > 0 && (
                      <TouchableOpacity
                        style={styles.postButton}
                        onPress={handlePostNote}
                        disabled={postingNote}
                      >
                        {postingNote ? (
                          <ActivityIndicator size="small" color={colors.card} />
                        ) : (
                          <Text style={styles.postButtonText}>{t.common.post}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {sortedNotes.length === 0 ? (
                    <Text style={styles.emptyText}>{t.circles.noFeed}</Text>
                  ) : (
                    sortedNotes.map((note) => {
                      const initials = (() => {
                        const n = note.display_name ?? "?";
                        const parts = n.trim().split(" ");
                        return parts.length >= 2
                          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          : n.slice(0, 2).toUpperCase();
                      })();
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(note.created_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return "just now";
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs / 24)}d ago`;
                      })();
                      return (
                        <View key={`note-${note.id}`} style={styles.noteCard}>
                          <View style={styles.noteHeader}>
                            <View style={styles.avatar}>
                              {note.avatar_url ? (
                                <Image source={{ uri: note.avatar_url }} style={styles.avatarImage} />
                              ) : (
                                <Text style={styles.avatarText}>{initials}</Text>
                              )}
                            </View>
                            <View style={styles.noteHeaderText}>
                              <Text style={styles.noteName}>{note.display_name ?? t.circles.typeMember}</Text>
                              <Text style={styles.noteTime}>{timeAgo}</Text>
                            </View>
                            {note.user_id === user?.id && (
                              <TouchableOpacity
                                onPress={async () => {
                                  await supabase.from("circle_notes").delete().eq("id", note.id);
                                  setNotes((prev) => prev.filter((n) => n.id !== note.id));
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.noteContent}>{note.content}</Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            );
          })()}
        </View>
      )}

      {/* Other tabs: scrollable content */}
      {activeTab !== "feed" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Circle Events tab */}
          {activeTab === "events" && (
            <>
              {loadingFeed ? (
                <View style={styles.loader}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
              ) : (() => {
                const sortedEvents = [...events].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                return (
                  <View style={styles.tabContentCard}>
                    {sortedEvents.length === 0 ? (
                      <Text style={styles.emptyText}>{t.circles.noCircleEvents}</Text>
                    ) : null}

                    {sortedEvents.map((event) => {
                      const eventCreatedAt = event.created_at ? new Date(event.created_at).getTime() : 0;
                      const isNewEvent = prevViewedEventsAt > 0
                        ? eventCreatedAt > prevViewedEventsAt && event.created_by !== user?.id
                        : false;
                      return (
                      <EventCard
                        key={`event-${event.id}`}
                        title={event.title}
                        organizer={event.organizer}
                        date={event.date_label}
                        time={event.time_label}
                        location={event.location}
                        going={event.going}
                        maybe={event.maybe}
                        maxParticipants={event.max_participants ?? null}
                        isActivity={event.is_activity ?? false}
                        noteCount={eventNoteCountMap[event.id] ?? 0}
                        hasNewActivity={isNewEvent}
                        onSharePress={() => handleShareEvent(event)}
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
                            image_url: event.image_url ?? null,
                            max_participants: event.max_participants ?? null,
                            contact_info: event.contact_info ?? null,
                            price_info: event.price_info ?? null,
                            created_by: event.created_by,
                            circleName: name,
                            circle_id: id,
                          })
                        }
                      />
                    );
                    })}
                  </View>
                );
              })()}
            </>
          )}

          {/* Members tab */}
          {activeTab === "members" && (
            loadingMembers ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.textMuted} />
              </View>
            ) : members.length === 0 && invitedUsers.length === 0 ? (
              <Text style={styles.emptyText}>{t.circles.noMembers}</Text>
            ) : (
              <View style={styles.membersPanel}>
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwner={member.user_id === owner_id}
                    currentUserId={user?.id}
                    currentUserName={user?.fullName ?? user?.firstName ?? null}
                    profileMap={profileMap}
                  />
                ))}
                {invitedUsers.map((u) => {
                  const parts = u.name.trim().split(" ");
                  const ini = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : u.name.slice(0, 2).toUpperCase();
                  return (
                    <View key={u.user_id} style={styles.memberRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{ini}</Text>
                      </View>
                      <Text style={styles.memberUserId} numberOfLines={1}>{u.name}</Text>
                      <View style={styles.invitedBadge}>
                        <Text style={styles.invitedBadgeText}>{t.circles.badgeInvited}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          )}

          {/* Description tab */}
          {activeTab === "description" && (
            loadingRequests ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.textMuted} />
              </View>
            ) : (
              <View style={styles.descriptionPanel}>
                <Text style={styles.sectionTitle}>{t.circles.about}</Text>
                <Text style={styles.descriptionBody}>
                  {description?.trim() ? description : t.circles.noDescription}
                </Text>

                <View style={styles.descriptionMetaList}>
                  <View style={styles.descriptionMetaRow}>
                    <Text style={styles.descriptionMetaLabel}>{t.circles.visibility}</Text>
                    <Text style={styles.descriptionMetaValue}>{visibilityLabel[visibility]}</Text>
                  </View>
                  {organizer ? (
                    <TouchableOpacity
                      style={styles.descriptionMetaRow}
                      onPress={() => setProfileModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.descriptionMetaLabel}>{t.circles.organizer}</Text>
                      <Text style={[styles.descriptionMetaValue, styles.descriptionMetaLink]}>{organizer}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.descriptionMetaRow}>
                    <Text style={styles.descriptionMetaLabel}>{t.circles.members}</Text>
                    <Text style={styles.descriptionMetaValue}>{memberCount}</Text>
                  </View>
                </View>

                {isOwner && (
                  <>
                    <View style={[styles.ownerSectionHeader, styles.ownerSectionHeaderAfterMeta]}>
                      <Text style={styles.sectionTitle}>{t.circles.pendingRequestsLabel}</Text>
                      {requestCount > 0 && (
                        <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>{requestCount}</Text>
                        </View>
                      )}
                    </View>
                    {requests.length === 0 ? (
                      <Text style={styles.emptyText}>{t.circles.noPendingRequests}</Text>
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
                              <Text style={styles.acceptButtonText}>{t.common.accept}</Text>
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
                    )}
                  </>
                )}
              </View>
            )
          )}
        </ScrollView>
      )}

      {/* Fixed footer: join/leave or invite */}
      <View style={[styles.footer, { paddingBottom: footerBottomInset }]}>
        {isOwner ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCircleInviteVisible(true)}
          >
            <Text style={styles.actionButtonText}>{t.common.inviteMembers}</Text>
          </TouchableOpacity>
        ) : (
          renderJoinButton()
        )}
      </View>

      <CircleInviteModal
        visible={circleInviteVisible}
        onClose={() => setCircleInviteVisible(false)}
        circleId={id}
        circleName={name}
      />

      <PublicProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userId={owner_id}
        displayName={organizer ?? name}
      />

      <CreateEventModal
        visible={createEventVisible}
        onClose={() => setCreateEventVisible(false)}
        onSave={handleSaveEvent}
        defaultCircleId={id}
      />

      <EditCircleModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={(data: EditCircleData) => {
          setName(data.name);
          setDescription(data.description);
          setVisibility(data.visibility);
        }}
        circleId={id}
        initialValues={{ name, description, visibility }}
      />
      </View>
      </KeyboardAvoidingView>
    </ThemedBackground>
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
  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
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
          <Text style={styles.roleBadgeText}>{t.circles.badgeOwner}</Text>
        </View>
      )}
      {!isOwner && member.role === "admin" && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{t.circles.badgeAdmin}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) { return StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: isOnboarding ? "transparent" : colors.background,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isOnboarding ? 0.14 : 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
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
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.68)" : "transparent",
    borderRadius: 999,
    paddingHorizontal: isOnboarding ? 12 : 0,
    paddingVertical: isOnboarding ? 8 : 0,
  },
  backLabel: {
    ...typography.body,
    color: colors.text,
    marginLeft: 2,
  },
  header: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.sm,
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
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tabList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    flex: 1,
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "transparent",
    minWidth: 0,
    flexShrink: 1,
  },
  tabActive: {
    borderBottomColor: colors.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.textMuted,
    flexShrink: 1,
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
    paddingHorizontal: spacing.cardPadding,
  },
  membersPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  descriptionPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.cardPadding,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600" as const,
    marginBottom: spacing.sm,
  },
  descriptionBody: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  descriptionMetaList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  descriptionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  descriptionMetaLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  descriptionMetaValue: {
    ...typography.bodySmall,
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  descriptionMetaLink: {
    textDecorationLine: "underline" as const,
    color: colors.text,
  },
  ownerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  ownerSectionHeaderAfterMeta: {
    marginTop: spacing.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
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
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: colors.text,
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
    paddingBottom: 16,
    backgroundColor: isOnboarding ? "transparent" : colors.background,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.78)" : colors.text,
    borderRadius: 999,
    height: 54,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isOnboarding ? 0.18 : 0.1,
        shadowRadius: isOnboarding ? 16 : 4,
      },
      android: { elevation: isOnboarding ? 4 : 2 },
      default: {},
    }),
  },
  actionButtonOutline: {
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.78)" : colors.card,
  },
  actionButtonText: {
    color: isOnboarding ? colors.text : colors.background,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
  },
  joinButton: {
    backgroundColor: "#F5EFE3",
  },
  joinButtonText: {
    color: "#35412A",
    fontSize: 16,
    fontFamily: "Lora_400Regular",
  },
  inviteActionButton: {
    backgroundColor: "#F5EFE3",
  },
  inviteActionButtonText: {
    color: "#35412A",
    fontSize: 16,
    fontFamily: "Lora_400Regular",
  },
  actionButtonTextOutline: {
    color: colors.text,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
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
  invitedBadge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  invitedBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.68)" : "transparent",
    borderRadius: 999,
    paddingHorizontal: isOnboarding ? 12 : 0,
    paddingVertical: isOnboarding ? 8 : 0,
  },
  headerCardOuter: {
    marginHorizontal: spacing.pageHorizontal,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: spacing.pageHorizontal,
  },
  messagesPanel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.cardPadding,
  },
  composeBox: {
    padding: spacing.cardPadding,
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  composeIcon: {
    marginRight: spacing.sm,
  },
  composeInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
  },
  postButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 10,
    minWidth: 84,
    alignItems: "center",
  },
  postButtonText: {
    color: "#35412A",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  noteCard: {
    padding: spacing.cardPadding,
    paddingBottom: spacing.lg,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  noteHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  noteHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  noteName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  noteTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  noteContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
  },
  tabContentCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  feedCard: {
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isOnboarding ? 0.14 : 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
}); }
