import React, { useEffect, useState } from "react";
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
import { useAuth, useUser } from "@clerk/clerk-expo";
import { RootStackParamList } from "../types";
import { Colors } from "../src/theme/colors";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { useLanguage } from "../src/i18n/LanguageContext";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { supabase, getAuthClient, EventNote } from "../lib/supabase";
import {
  fetchReportedHiddenNoteIds,
  promptReportContent,
} from "../lib/contentReports";
import { InviteModal } from "../src/components/modals/InviteModal";
import { EditEventModal, EditEventData } from "../src/components/modals/EditEventModal";
import { PublicProfileModal } from "../src/components/modals/PublicProfileModal";
import { ThemedBackground } from "../src/components/layout/ThemedBackground";

type Props = NativeStackScreenProps<RootStackParamList, "EventDetail">;

export default function EventDetailScreen({ route, navigation }: Props) {
  const { id, created_by, circleName, circle_id, hasNewActivity: initialHasNewActivity } = route.params;
  const insets = useSafeAreaInsets();
  const footerBottomInset = 0;
  const { user } = useUser();
  const { getToken } = useAuth();

  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const isCreator = !!user && !!created_by && user.id === created_by;
  const [inviteVisible, setInviteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(!!initialHasNewActivity);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Mutable local copies of editable fields
  const [title, setTitle] = useState(route.params.title);
  const [organizer, setOrganizer] = useState(route.params.organizer);
  const [date, setDate] = useState(route.params.date);
  const [time, setTime] = useState(route.params.time);
  const [location, setLocation] = useState(route.params.location);
  const [description, setDescription] = useState(route.params.description ?? "");
  const [imageUrl, setImageUrl] = useState(route.params.image_url ?? "");
  const [maxParticipants, setMaxParticipants] = useState(route.params.max_participants ?? null);
  const [contactInfo, setContactInfo] = useState(route.params.contact_info ?? "");
  const [priceInfo, setPriceInfo] = useState(route.params.price_info ?? "");

  async function handleDelete() {
    Alert.alert(
      t.events.deleteTitle,
      t.events.deleteMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: async () => {
            let token: string | null = null;
            try { token = await getToken({ template: "supabase" }); } catch (_) {}
            const client = token ? getAuthClient(token) : supabase;
            // Delete child records first to avoid FK constraint failures
            await client.from("event_rsvps").delete().eq("event_id", id);
            await client.from("event_notes").delete().eq("event_id", id);
            const { data: deleted, error } = await client
              .from("events")
              .delete()
              .eq("id", id)
              .select("id");
            if (error) {
              Alert.alert("Error", error.message);
            } else if (!deleted || deleted.length === 0) {
              Alert.alert("Permission denied", "Your Supabase RLS policy is blocking this delete.\n\nRun in Supabase SQL Editor:\n\nCREATE POLICY \"del_events\" ON events FOR DELETE USING (true);\nCREATE POLICY \"del_rsvps\" ON event_rsvps FOR DELETE USING (true);\nCREATE POLICY \"del_notes\" ON event_notes FOR DELETE USING (true);");
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  }

  const [going, setGoing] = useState(route.params.going);
  const [maybe, setMaybe] = useState(route.params.maybe);
  const [rsvp, setRsvp] = useState<"going" | "maybe" | undefined>(route.params.rsvp);
  const [submitting, setSubmitting] = useState(false);

  const [notes, setNotes] = useState<EventNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  async function handleShare() {
    const shareUrl = "https://valmia.ch";
    const lines = [
      title,
      `${date} · ${time}`,
      location,
      circleName ? `${t.nav.circles}: ${circleName}` : null,
      description.trim().length > 0 ? description.trim() : null,
      shareUrl,
    ].filter(Boolean);

    try {
      await Share.share({
        title,
        message: lines.join("\n"),
        url: shareUrl,
      });
    } catch {
      Alert.alert("Error", "Could not open share menu.");
    }
  }

  // Load fresh counts + this user's RSVP on every mount
  useEffect(() => {
    Promise.all([
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
    ]).then(([goingResult, maybeResult, rsvpResult]) => {
      const g = "count" in goingResult ? goingResult.count : null;
      const m = "count" in maybeResult ? maybeResult.count : null;
      const rsvpData =
        rsvpResult && "data" in rsvpResult && rsvpResult.data && !Array.isArray(rsvpResult.data)
          ? rsvpResult.data
          : null;

      if (g !== null) setGoing(g);
      if (m !== null) setMaybe(m);
      if (rsvpData) setRsvp(rsvpData.status as "going" | "maybe");
    });
  }, [id, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("event_notes")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (cancelled || !data?.length) {
        if (!cancelled) setNotes(data ?? []);
        return;
      }
      const hidden = await fetchReportedHiddenNoteIds(
        "event_note",
        data.map((n: EventNote) => n.id)
      );
      if (!cancelled) setNotes(data.filter((n: EventNote) => !hidden.has(n.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handlePostNote() {
    if (!user || !noteText.trim() || postingNote) return;
    setPostingNote(true);
    const { data, error } = await supabase
      .from("event_notes")
      .insert({
        event_id: id,
        user_id: user.id,
        display_name: user.fullName ?? user.firstName ?? user.username ?? null,
        avatar_url: (user.externalAccounts?.find((a: any) => a.provider === "oauth_google" || a.provider === "google") as any)?.imageUrl ?? null,
        content: noteText.trim(),
      })
      .select()
      .single();
    if (error) {
      Alert.alert("Could not post note", error.message);
    } else if (data) {
      setNotes((prev) => [data, ...prev]);
      setNoteText("");
    }
    setPostingNote(false);
  }

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
    <ThemedBackground backgroundColor={colors.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Fixed back button */}
      <View style={[styles.backRow, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backLabel}>{t.common.back}</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerAction}
          >
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowChat((v) => !v); setHasNewActivity(false); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerAction}
          >
            <View style={{ position: "relative" }}>
              <Ionicons
                name={showChat ? "document-text-outline" : "chatbubble-outline"}
                size={22}
                color={colors.text}
              />
              {hasNewActivity && !showChat && (
                <View style={styles.chatDot} />
              )}
            </View>
          </TouchableOpacity>
          {isCreator && (
            <>
              <TouchableOpacity
                onPress={() => setEditVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerAction}
              >
                <Ionicons name="create-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </>
          )}
          {user?.id && !isCreator ? (
            <TouchableOpacity
              onPress={() =>
                promptReportContent({
                  reporterUserId: user.id,
                  targetType: "event",
                  targetId: id,
                  reportedUserId: created_by ?? null,
                  onReported: () => navigation.goBack(),
                })
              }
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headerAction}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Info card mode - scrollable */}
      {!showChat && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerCard}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.eventImage} />
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.organizerRow}>
            <Text style={styles.organizer}>
              {t.events.hostedBy}{" "}
              <Text
                style={styles.organizerLink}
                onPress={() => created_by ? setProfileModalVisible(true) : undefined}
              >
                {organizer}
              </Text>
            </Text>
            {circleName ? (
              <View style={styles.circlePill}>
                <Ionicons name="people-outline" size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.circlePillText}>{circleName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
            <Text style={styles.metaText}>{date}</Text>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} style={[styles.metaIcon, { marginLeft: 12 }]} />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
            <Text style={styles.metaText}>{location}</Text>
          </View>

          {description.trim().length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.description}>{description}</Text>
            </>
          ) : null}

          {(maxParticipants !== null || contactInfo.trim() || priceInfo.trim()) && <View style={styles.divider} />}
          {maxParticipants !== null ? (
            <View style={styles.metaRow}>
              <Ionicons name="people-circle-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{t.events.maxParticipants}: {maxParticipants}</Text>
            </View>
          ) : null}
          {contactInfo.trim() ? (
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{contactInfo}</Text>
            </View>
          ) : null}
          {priceInfo.trim() ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{priceInfo}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Attendees */}
          <View style={styles.attendeesHeader}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
            <Text style={styles.sectionLabel}>{t.events.attendees}</Text>
          </View>
          <View style={styles.attendeesRow}>
            <View style={styles.attendeeStat}>
              <Text style={styles.attendeeCount}>{going}</Text>
              <Text style={styles.attendeeLabel}>{t.events.rsvpGoing}</Text>
            </View>
            <View style={styles.attendeeStat}>
              <Text style={styles.attendeeCount}>{maybe}</Text>
              <Text style={styles.attendeeLabel}>{t.events.rsvpMaybe}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          </View>
        </ScrollView>
      )}

      {/* Chat mode: sticky compose + scrollable notes */}
      {showChat && (
        <View style={styles.chatContainer}>
          {user && (
            <View style={styles.composeBox}>
              <View style={styles.composeRow}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.text} style={styles.composeIcon} />
                <TextInput
                  style={styles.composeInput}
                  placeholder={t.events.notePlaceholder}
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
            {notes.map((note) => {
              const n = note.display_name ?? "?";
              const parts = n.trim().split(" ");
              const initials = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : n.slice(0, 2).toUpperCase();
              const diff = Date.now() - new Date(note.created_at).getTime();
              const mins = Math.floor(diff / 60000);
              const timeAgo = mins < 1 ? "just now"
                : mins < 60 ? `${mins}m ago`
                : mins < 1440 ? `${Math.floor(mins / 60)}h ago`
                : `${Math.floor(mins / 1440)}d ago`;
              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.avatar}>
                      {note.avatar_url ? (
                        <Image source={{ uri: note.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.noteHeaderText}>
                      <Text style={styles.noteName}>{note.display_name ?? "Guest"}</Text>
                      <Text style={styles.noteTime}>{timeAgo}</Text>
                    </View>
                    <View style={styles.noteHeaderActions}>
                      {user?.id && note.user_id !== user.id ? (
                        <TouchableOpacity
                          onPress={() =>
                            promptReportContent({
                              reporterUserId: user.id,
                              targetType: "event_note",
                              targetId: note.id,
                              reportedUserId: note.user_id,
                              onReported: (noteId) =>
                                setNotes((prev) => prev.filter((n) => n.id !== noteId)),
                            })
                          }
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                      {note.user_id === user?.id ? (
                        <TouchableOpacity
                          onPress={async () => {
                            await supabase.from("event_notes").delete().eq("id", note.id);
                            setNotes((prev) => prev.filter((n) => n.id !== note.id));
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Fixed RSVP bar */}
      {!showChat && <View style={[styles.rsvpBar, { paddingBottom: footerBottomInset }]}>
        {isCreator && circle_id ? (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setInviteVisible(true)}
          >
            {/* <Ionicons name="person-add-outline" size={16} color={styles.inviteButtonText.color} style={styles.rsvpIcon} /> */}
            <Text style={styles.inviteButtonText}>{t.common.inviteMembers}</Text>
          </TouchableOpacity>
        ) : (() => {
          const isFilled = maxParticipants != null && going >= maxParticipants && rsvp !== "going";
          if (isFilled) {
            return (
              <View style={[styles.rsvpButtons]}>
                <View style={[styles.rsvpButton, styles.rsvpButtonFull, { flex: 1 }]}>
                  <Text style={[styles.rsvpButtonText, styles.rsvpButtonTextFull]}>Event is Full</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  rsvp === "going" ? styles.rsvpButtonActive : styles.rsvpButtonOutline,
                ]}
                onPress={() => handleRsvp("going")}
                disabled={submitting}
              >
                <Text style={[
                  styles.rsvpButtonText,
                  rsvp === "going" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline,
                ]}>
                  {t.events.rsvpGoing}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rsvpButton, rsvp === "maybe" ? styles.rsvpButtonActive : styles.rsvpButtonOutline]}
                onPress={() => handleRsvp("maybe")}
                disabled={submitting}
              >
                <Text style={[styles.rsvpButtonText, rsvp === "maybe" ? styles.rsvpButtonTextActive : styles.rsvpButtonTextOutline]}>
                  {t.events.rsvpMaybe}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </View>}

      <InviteModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        eventId={id}
        eventTitle={title}
        circleId={circle_id ?? ""}
        circleName={circleName ?? ""}
      />

      {created_by ? (
        <PublicProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
          userId={created_by}
          displayName={organizer}
        />
      ) : null}

      <EditEventModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={(data: EditEventData) => {
          setTitle(data.title);
          setOrganizer(data.organizer);
          setDate(data.date);
          setTime(data.time);
          setLocation(data.location);
          setDescription(data.description);
          setImageUrl(data.image_url);
          setMaxParticipants(data.max_participants);
          setContactInfo(data.contact_info);
          setPriceInfo(data.price_info);
          navigation.setParams({
            title: data.title,
            organizer: data.organizer,
            date: data.date,
            time: data.time,
            location: data.location,
            description: data.description,
            image_url: data.image_url,
            max_participants: data.max_participants,
            contact_info: data.contact_info,
            price_info: data.price_info,
          });
        }}
        eventId={id}
        initialValues={{ title, organizer, date, time, location, description, image_url: imageUrl, max_participants: maxParticipants, contact_info: contactInfo, price_info: priceInfo }}
      />
      </View>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) { return StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: isOnboarding ? "transparent" : colors.background,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
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
  eventImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  organizer: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },
  organizerLink: {
    textDecorationLine: "underline" as const,
    color: colors.textMuted,
  },
  circlePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: spacing.sm,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
  },
  circlePillText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textMuted,
    letterSpacing: 0.3,
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
  rsvpBar: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 16,
    backgroundColor: isOnboarding ? "transparent" : colors.background,
    fontFamily: "Lora_400Regular",
  },
  rsvpButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.78)" : colors.text,
    borderRadius: 999,
    height: 54,
    gap: 8,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? "rgba(239,237,225,0.28)" : "transparent",
  },
  inviteButtonText: {
    color: isOnboarding ? colors.text : colors.background,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
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
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.78)" : colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rsvpButtonActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0,
    borderColor: "transparent",
  },
  rsvpIcon: {
    marginRight: 4,
  },
  rsvpButtonText: {
    fontSize: 16,
    fontWeight: "400" as const,
    fontFamily: "Lora_400Regular",
  },
  rsvpButtonTextOutline: {
    color: colors.text,
  },
  rsvpButtonTextActive: {
    color: colors.background,
  },
  rsvpButtonDisabled: {
    opacity: 0.4,
  },
  rsvpButtonTextDisabled: {
    color: colors.textMuted,
  },
  rsvpButtonFull: {
    backgroundColor: colors.badgeBg,
    borderColor: colors.cardBorder,
    opacity: 0.7,
  },
  rsvpButtonTextFull: {
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.68)" : "transparent",
    borderRadius: 999,
    paddingHorizontal: isOnboarding ? 16 : 0,
    paddingVertical: isOnboarding ? 8 : 0,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
  },
  headerAction: {},
  chatDot: {
    position: "absolute",
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D00",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.md,
  },
  composeBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isOnboarding ? 0.12 : 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      default: {},
    }),
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
    borderWidth: 1,
    borderColor: "rgba(27,36,23,0.12)",
  },
  postButtonText: {
    color: "#35412A",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
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
  noteHeaderText: {
    flex: 1,
  },
  noteHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noteName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
  },
  noteTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  noteContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
  },
}); }
