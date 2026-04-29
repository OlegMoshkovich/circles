import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { Colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { useLanguage, Language } from "../src/i18n/LanguageContext";
import { supabase, AppNotification, getAuthClient } from "../lib/supabase";
import { useNotificationContext } from "../src/contexts/NotificationContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { DeleteConfirmationModal } from "../src/components/modals/DeleteConfirmationModal";

async function handleSignOut(signOut: () => Promise<void>) {
  try {
    await signOut();
  } catch (_) {}
}

function getErrorMessage(e: unknown) {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const anyErr = e as any;
  return anyErr?.message || anyErr?.errors?.[0]?.longMessage || "Something went wrong";
}

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "de", flag: "🇨🇭", label: "DE" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

const ALL_INTERESTS = [
  "Hiking", "Sports", "Food", "Culture", "Music", "Art",
  "Family", "Nature", "Wellness", "Yoga", "Skiing", "Biking",
  "Community", "Volunteering", "Business", "Entrepreneurs",
];

export default function MyProfileScreen() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const navigation = useNavigation<any>();
const { language, setLanguage, t } = useLanguage();
  const { setUnreadCount } = useNotificationContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [circleCount, setCircleCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [profileBio, setProfileBio] = useState<string | null>(null);
  const [profileLocation, setProfileLocation] = useState<string | null>(null);
  const [profileInterests, setProfileInterests] = useState<string[]>([]);
  const [profileCircles, setProfileCircles] = useState<{ id: string; name: string }[]>([]);
  const [profileEvents, setProfileEvents] = useState<{ id: string; title: string; date_label: string; time_label: string }[]>([]);
  const [circlesExpanded, setCirclesExpanded] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [profileUserType, setProfileUserType] = useState<"local" | "visitor" | null>(null);
  const [editingField, setEditingField] = useState<"bio" | "location" | "interests" | "userType" | null>(null);
  const [editText, setEditText] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const editInputRef = useRef<TextInput>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const headerCardStyle = React.useMemo(
    () => ({
      marginBottom: spacing.md,
      ...(bgOption === "onboarding" ? { borderRadius: 16, paddingTop: 0 } : null),
    }),
    [bgOption]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false });
    if (data) {
      setNotifications(data as AppNotification[]);
      setUnreadCount(data.length);
    }
  }, [user, setUnreadCount]);

  const fetchProfileCounts = useCallback(async () => {
    if (!user) return;

    const [circlesResult, eventsResult, profileResult, circleNamesResult] = await Promise.all([
      supabase
        .from("circle_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("event_rsvps")
        .select("event_id, events(id, title, date_label, time_label)")
        .eq("user_id", user.id),
      supabase
        .from("user_profiles")
        .select("bio, location, interests, user_type")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("circle_members")
        .select("circle_id, circles(id, name)")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    setCircleCount(circlesResult.count ?? 0);

    if (eventsResult.data) {
      const evts = eventsResult.data
        .map((row: any) => row.events)
        .filter(Boolean) as { id: string; title: string; date_label: string; time_label: string }[];
      setProfileEvents(evts);
      setEventCount(evts.length);
    }

    if (profileResult.data) {
      setProfileBio(profileResult.data.bio ?? null);
      setProfileLocation(profileResult.data.location ?? null);
      setProfileInterests(profileResult.data.interests ?? []);
      setProfileUserType(profileResult.data.user_type ?? null);
    }

    if (circleNamesResult.data) {
      const circles = circleNamesResult.data
        .map((row: any) => row.circles)
        .filter(Boolean) as { id: string; name: string }[];
      setProfileCircles(circles);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
    fetchProfileCounts();
  }, [fetchNotifications, fetchProfileCounts]));

async function handleAccept(notif: AppNotification) {
    if (!user) return;

    if (notif.type === "circle_invitation" && notif.data?.circle_id) {
      await Promise.all([
        supabase.from("circle_members").upsert(
          { circle_id: notif.data.circle_id, user_id: user.id, role: "member", status: "active" },
          { onConflict: "circle_id,user_id" }
        ),
        supabase.from("notifications").update({ read: true }).eq("id", notif.id),
      ]);
    } else if (notif.type === "event_invitation" && notif.data?.event_id) {
      await Promise.all([
        supabase.from("event_rsvps").upsert(
          { event_id: notif.data.event_id, user_id: user.id, status: "going" },
          { onConflict: "event_id,user_id" }
        ),
        supabase.from("notifications").update({ read: true }).eq("id", notif.id),
      ]);
    }

    fetchNotifications();
  }

  async function handleDecline(notif: AppNotification) {
    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
    fetchNotifications();
  }

  function startEdit(field: "bio" | "location" | "interests") {
    if (field === "interests") {
      setEditInterests(profileInterests);
    } else {
      setEditText(field === "bio" ? (profileBio ?? "") : (profileLocation ?? ""));
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
    setEditingField(field);
  }

  async function saveField(userTypeValue?: "local" | "visitor") {
    if (!user || !editingField) return;
    const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
    if (editingField === "bio") {
      update.bio = editText.trim() || null;
      setProfileBio(editText.trim() || null);
    } else if (editingField === "location") {
      update.location = editText.trim() || null;
      setProfileLocation(editText.trim() || null);
    } else if (editingField === "interests") {
      update.interests = editInterests.length > 0 ? editInterests : null;
      setProfileInterests(editInterests);
    } else if (editingField === "userType" && userTypeValue) {
      update.user_type = userTypeValue;
      setProfileUserType(userTypeValue);
    }
    await supabase.from("user_profiles").upsert(update, { onConflict: "user_id" });
    setEditingField(null);
  }

  function cancelEdit() {
    setEditingField(null);
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleteError(null);
    if (deleteTyped.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setDeleteSubmitting(true);
    try {
      const userId = user.id;
      let client = supabase;
      try {
        const token = await getToken({ template: "supabase" });
        if (token) client = getAuthClient(token);
      } catch (_) {}

      const runDelete = async (query: any) => {
        const { error } = await query;
        if (error) throw error;
      };

      const { data: ownedCircles, error: ownedCirclesError } = await client
        .from("circles")
        .select("id")
        .eq("owner_id", userId);
      if (ownedCirclesError) throw ownedCirclesError;
      const ownedCircleIds = (ownedCircles ?? []).map((c: any) => c.id);

      const { data: createdEvents, error: createdEventsError } = await client
        .from("events")
        .select("id")
        .eq("created_by", userId);
      if (createdEventsError) throw createdEventsError;

      let ownedCircleEventIds: string[] = [];
      if (ownedCircleIds.length > 0) {
        const { data, error } = await client
          .from("events")
          .select("id")
          .in("circle_id", ownedCircleIds);
        if (error) throw error;
        ownedCircleEventIds = (data ?? []).map((e: any) => e.id);
      }

      const allEventIds = Array.from(
        new Set([...(createdEvents ?? []).map((e: any) => e.id), ...ownedCircleEventIds])
      );

      await runDelete(client.from("notifications").delete().eq("user_id", userId));
      await runDelete(client.from("dismissed_items").delete().eq("user_id", userId));
      await runDelete(client.from("event_rsvps").delete().eq("user_id", userId));
      await runDelete(client.from("event_notes").delete().eq("user_id", userId));
      await runDelete(client.from("circle_notes").delete().eq("user_id", userId));
      await runDelete(client.from("circle_members").delete().eq("user_id", userId));
      await runDelete(client.from("user_profiles").delete().eq("user_id", userId));

      if (allEventIds.length > 0) {
        await runDelete(client.from("dismissed_items").delete().eq("item_type", "event").in("item_id", allEventIds));
        await runDelete(client.from("event_rsvps").delete().in("event_id", allEventIds));
        await runDelete(client.from("event_notes").delete().in("event_id", allEventIds));
        await runDelete(client.from("events").delete().in("id", allEventIds));
      }

      if (ownedCircleIds.length > 0) {
        await runDelete(client.from("dismissed_items").delete().eq("item_type", "circle").in("item_id", ownedCircleIds));
        await runDelete(client.from("circle_notes").delete().in("circle_id", ownedCircleIds));
        await runDelete(client.from("circle_members").delete().in("circle_id", ownedCircleIds));
        await runDelete(client.from("circles").delete().in("id", ownedCircleIds));
      }

      await user.delete();
      try {
        await signOut();
      } catch (_) {}

      setDeleteModalVisible(false);
      // Auth flow will switch to the signed-out stack automatically.
    } catch (e) {
      setDeleteError(getErrorMessage(e));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const photoUrl = (() => {
    for (const account of (user?.externalAccounts ?? [])) {
      const url = (account as any).imageUrl || (account as any).avatarUrl;
      if (url) return url as string;
    }
    return null;
  })();
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "M";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(t.locale, {
        month: "long",
        year: "numeric",
      })
    : "—";

  const screenBgColor = colors.background;

  const stickyHeader = (
    <ScreenHeaderCard style={headerCardStyle}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={styles.avatarInfo}>
          <Text style={styles.name}>{name}</Text>
          {email.length > 0 && <Text style={styles.email}>{email}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => handleSignOut(signOut)}
          style={styles.iconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.textOnIconBg} />
        </TouchableOpacity>
      </View>
    </ScreenHeaderCard>
  );

  return (
    <>
    <ScreenLayout backgroundColor={screenBgColor} stickyTop={stickyHeader}>
      {/* Neighbourhood card */}
      {/* <Text style={styles.sectionLabel}>{t.profile.neighbourhood}</Text> */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => startEdit("userType")} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Type</Text>
          <View style={styles.userTypeValue}>
            {profileUserType ? (
              <Ionicons
                name={profileUserType === "local" ? "home-outline" : "airplane-outline"}
                size={14}
                color={colors.textMuted}
                style={{ marginRight: 5 }}
              />
            ) : null}
            <Text style={[styles.rowValue, !profileUserType && styles.rowValuePlaceholder]}>
              {profileUserType === "local" ? "Local" : profileUserType === "visitor" ? "Visitor" : "Add"}
            </Text>
          </View>
        </TouchableOpacity>
        {editingField === "userType" && (
          <View style={styles.userTypePicker}>
            {([
              { key: "local" as const, label: "Local", icon: "home-outline" as const, desc: "I live here year-round" },
              { key: "visitor" as const, label: "Visitor", icon: "airplane-outline" as const, desc: "I'm visiting for a while" },
            ]).map((opt) => {
              const sel = profileUserType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.userTypeOption, sel && styles.userTypeOptionSel]}
                  onPress={() => saveField(opt.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={opt.icon} size={18} color={sel ? colors.text : colors.textMuted} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, sel && { color: colors.text }]}>{opt.label}</Text>
                    <Text style={styles.rowValue}>{opt.desc}</Text>
                  </View>
                  {sel && <Ionicons name="checkmark-circle" size={18} color={colors.text} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={cancelEdit} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <Text style={styles.inlineCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.row} onPress={() => startEdit("location")} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>{t.profile.location}</Text>
          <Text style={[styles.rowValue, !profileLocation && styles.rowValuePlaceholder]}>
            {profileLocation ?? "Add location"}
          </Text>
        </TouchableOpacity>
        {editingField === "location" && (
          <View style={styles.inlineEditRow}>
            <TextInput
              ref={editInputRef}
              style={styles.inlineInput}
              value={editText}
              onChangeText={setEditText}
              placeholder="Your neighbourhood or city"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={saveField}
            />
            <TouchableOpacity onPress={saveField} style={styles.inlineBtn}>
              <Ionicons name="checkmark" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEdit} style={styles.inlineBtn}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* About card — always visible, editable */}
      <View style={styles.sectionGap} />
      <View style={styles.card}>
        {/* Bio row */}
        <TouchableOpacity style={styles.row} onPress={() => startEdit("bio")} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Bio</Text>
          <Text style={[styles.rowValue, !profileBio && styles.rowValuePlaceholder]} numberOfLines={2}>
            {profileBio ?? "Add bio"}
          </Text>
        </TouchableOpacity>
        {editingField === "bio" && (
          <View style={styles.inlineEditBlock}>
            <TextInput
              ref={editInputRef}
              style={[styles.inlineInput, styles.inlineInputMultiline]}
              value={editText}
              onChangeText={setEditText}
              placeholder="A few words about yourself..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.inlineEditActions}>
              <TouchableOpacity onPress={saveField} style={styles.inlineSaveBtn}>
                <Text style={styles.inlineSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.inlineCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Interests row */}
        <TouchableOpacity style={styles.row} onPress={() => startEdit("interests")} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Interests</Text>
          {profileInterests.length > 0 ? (
            <Text style={styles.rowValue}>{profileInterests.length} selected</Text>
          ) : (
            <Text style={styles.rowValuePlaceholder}>Add interests</Text>
          )}
        </TouchableOpacity>
        {profileInterests.length > 0 && editingField !== "interests" && (
          <View style={styles.chipRowInCard}>
            {profileInterests.map((i) => (
              <View key={i} style={styles.chip}><Text style={styles.chipText}>{i}</Text></View>
            ))}
          </View>
        )}
        {editingField === "interests" && (
          <View style={styles.interestPicker}>
            <View style={styles.chipRowInCard}>
              {ALL_INTERESTS.map((i) => {
                const selected = editInterests.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() =>
                      setEditInterests((prev) =>
                        selected ? prev.filter((x) => x !== i) : [...prev, i]
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{i}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.inlineEditActions}>
              <TouchableOpacity onPress={saveField} style={styles.inlineSaveBtn}>
                <Text style={styles.inlineSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.inlineCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {profileCircles.length > 0 ? (
        <>
          <View style={styles.sectionGap} />
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setCirclesExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>Communities</Text>
              <View style={styles.circlesHeaderRight}>
                <Text style={styles.rowValue}>{profileCircles.length}</Text>
                <Ionicons
                  name={circlesExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.textMuted}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </TouchableOpacity>
            {circlesExpanded && profileCircles.map((circle) => (
              <View key={circle.id} style={styles.row}>
                <Text style={styles.rowLabel}>{circle.name}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {profileEvents.length > 0 ? (
        <>
          <View style={styles.sectionGap} />
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setEventsExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>{t.nav.events}</Text>
              <View style={styles.circlesHeaderRight}>
                <Text style={styles.rowValue}>{profileEvents.length}</Text>
                <Ionicons
                  name={eventsExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.textMuted}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </TouchableOpacity>
            {eventsExpanded && profileEvents.map((event) => (
              <View key={event.id} style={styles.row}>
                <Text style={styles.rowLabel}>{event.title}</Text>
                <Text style={styles.rowValue}>{event.date_label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.sectionGap} />

      {/* Language selector */}
      {/* <Text style={styles.sectionLabel}>{t.profile.language}</Text> */}
      <View style={styles.flagRow}>
        {LANGUAGES.map(({ code, flag, label }) => {
          const selected = language === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => setLanguage(code)}
              style={[styles.flagButton, selected && styles.flagButtonSelected]}
              activeOpacity={0.7}
            >
              <Text style={styles.flagEmoji}>{flag}</Text>
              <Text style={[styles.flagLabel, selected && styles.flagLabelSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionGap} />

      <View
        style={[
          styles.card,
          {
            borderWidth: 1,
            borderColor: "rgba(255,107,107,0.35)",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.row}
          onPress={() => setDeleteModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.rowLabel, { color: "#ff6b6b" }]}>Delete account</Text>
          <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionGap} />

      {notifications.length > 0 ? (
        <>
          {notifications.map((notif) => (
            <View key={notif.id} style={styles.notifCard}>
              <View style={styles.notifIcon}>
                <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                {notif.body ? <Text style={styles.notifBody}>{notif.body}</Text> : null}
              </View>
              <View style={styles.notifActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(notif)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(notif)}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}

    </ScreenLayout>
    <DeleteConfirmationModal
      visible={deleteModalVisible}
      onClose={() => {
        setDeleteModalVisible(false);
        setDeleteConfirming(false);
        setDeleteTyped("");
        setDeleteError(null);
      }}
      title="Delete account"
    >
      <Text style={styles.deleteModalBody}>
        This permanently deletes your account and data. Type <Text style={styles.deleteInlineCode}>DELETE</Text> to confirm.
      </Text>
      {!deleteConfirming ? (
        <View style={styles.deleteActionsRow}>
          <TouchableOpacity
            style={styles.deleteDangerButton}
            onPress={() => setDeleteConfirming(true)}
            disabled={deleteSubmitting}
          >
            <Text style={styles.deleteDangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteCancelButton}
            onPress={() => {
              setDeleteModalVisible(false);
              setDeleteConfirming(false);
              setDeleteTyped("");
              setDeleteError(null);
            }}
            disabled={deleteSubmitting}
          >
            <Text style={styles.deleteCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            value={deleteTyped}
            onChangeText={setDeleteTyped}
            placeholder="DELETE"
            placeholderTextColor={colors.textMuted}
            style={styles.deleteInput}
            autoCapitalize="characters"
          />
          {deleteError ? <Text style={styles.deleteErrorText}>{deleteError}</Text> : null}
          <View style={styles.deleteActionsRow}>
            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={handleDeleteAccount}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteConfirmButtonText}>Confirm deletion</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={() => {
                setDeleteConfirming(false);
                setDeleteTyped("");
                setDeleteError(null);
              }}
              disabled={deleteSubmitting}
            >
              <Text style={styles.deleteCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </DeleteConfirmationModal>
    </>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    cardDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: spacing.md,
    },
    avatarSection: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.lg,
      gap: spacing.md,
    },
    avatarInfo: {
      flex: 1,
      justifyContent: "center",
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 36,
      backgroundColor: colors.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarImage: {
      width: 60,
      height: 60,
      borderRadius: 36,
    },
    avatarInitials: {
      fontSize: 24,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    name: {
      fontSize: 20,
      fontWeight: "400" as const,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    email: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    rowValuePlaceholder: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
      opacity: 0.5,
    },
    inlineEditRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: 12,
      gap: 8,
    },
    inlineEditBlock: {
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: 12,
    },
    inlineInput: {
      flex: 1,
      color: colors.text,
      fontFamily: "Lora_400Regular",
      fontSize: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingVertical: 4,
    },
    inlineInputMultiline: {
      height: 64,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      textAlignVertical: "top" as const,
      marginBottom: 10,
    },
    inlineBtn: {
      width: 30,
      height: 30,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    inlineEditActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 16,
    },
    inlineSaveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.text,
    },
    inlineSaveBtnText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: "600" as const,
    },
    inlineCancelText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    chipRowInCard: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: 14,
    },
    interestPicker: {
      paddingBottom: 4,
    },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: "transparent",
    },
    chipSelected: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    chipText: {
      fontSize: 13,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    chipTextSelected: {
      color: colors.background,
    },
    userTypeValue: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    userTypePicker: {
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: 4,
      gap: 6,
    },
    userTypeOption: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: "transparent",
      marginBottom: 6,
    },
    userTypeOptionSel: {
      borderColor: colors.text,
      backgroundColor: colors.badgeBg,
    },
    circlesHeaderRight: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    divider: {
      height: 1,
      // backgroundColor: colors.divider,
      marginVertical: spacing.md,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.8,
      color: colors.textMuted,
      textTransform: "uppercase" as const,
      marginBottom: spacing.sm,
    },
    sectionGap: {
      height: spacing.md,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: { elevation: 1 },
        default: {},
      }),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: 14,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: spacing.cardPadding,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      zIndex: 10,
    },
    paletteAnchor: {
      position: "relative",
      alignItems: "center",
    },
    iconButton: {
      width: 30,
      height: 30,
      borderRadius: 16,
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.12)" : colors.iconbBg,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? colors.cardBorder : "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    glassPalette: {
      position: "absolute",
      top: 38,
      alignItems: "center",
      gap: 8,
      zIndex: 20,
    },
    glassPaletteSwatchButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    glassPaletteSwatchButtonSelected: {
      borderColor: colors.text,
    },
    glassPaletteSwatch: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    glassPaletteCustomSwatch: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.55)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    hexInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 2,
      marginTop: 2,
    },
    glassPaletteCustomPlus: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 13,
      lineHeight: 16,
      fontWeight: "600" as const,
    },
    hexHash: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      fontFamily: "Lora_400Regular",
    },
    hexInput: {
      color: "#fff",
      fontSize: 13,
      fontFamily: "Lora_400Regular",
      width: 52,
      height: 24,
      padding: 0,
    },
    hexConfirm: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    hexConfirmText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600" as const,
    },
    flagRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    flagButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: colors.card,
    },
    flagButtonSelected: {
      borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
      backgroundColor: colors.card,
    },
    flagEmoji: {
      fontSize: 20,
    },
    flagLabel: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.textMuted,
    },
    flagLabelSelected: {
      color: colors.text,
    },
    notifCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: spacing.sm,
    },
    notifIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    notifContent: {
      flex: 1,
      marginRight: 8,
    },
    notifTitle: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.text,
      marginBottom: 2,
    },
    notifBody: {
      fontSize: 12,
      color: colors.textMuted,
    },
    notifActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    acceptBtn: {
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.14)" : colors.text,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? "rgba(239,237,225,0.28)" : "transparent",
    },
    acceptBtnText: {
      color: isOnboarding ? colors.text : colors.background,
      fontSize: 12,
      fontWeight: "600" as const,
    },
    declineBtn: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    bgRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    bgSwatch: {
      width: 52,
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    bgSwatchImage: {
      width: 52,
      height: 52,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    bgSwatchImageInner: {
      width: "100%",
      height: "100%",
    },
    bgSwatchSelected: {
      borderColor: colors.text,
      borderWidth: 2.5,
    },
    deleteModalBody: {
      ...typography.bodySmall,
      fontSize: 18,
      lineHeight: 26,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
      marginBottom: 14,
    },
    deleteInlineCode: {
      color: "#ff6b6b",
      fontWeight: "700" as const,
    },
    deleteDangerButton: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,107,107,0.45)",
      backgroundColor: "rgba(255,107,107,0.15)",
      paddingVertical: 14,
      alignItems: "center" as const,
    },
    deleteDangerButtonText: {
      color: "#ff6b6b",
      ...typography.body,
      fontSize: 18,
      fontFamily: "Lora_400Regular",
    },
    deleteInput: {
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      marginTop: 2,
      fontSize: 18,
      fontFamily: "Lora_400Regular",
    },
    deleteErrorText: {
      color: "#ff6b6b",
      fontSize: 13,
      marginTop: 10,
    },
    deleteActionsRow: {
      flexDirection: "row" as const,
      gap: 12,
      marginTop: 14,
    },
    deleteConfirmButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: "center" as const,
      backgroundColor: "#ff6b6b",
      borderWidth: 1,
      borderColor: "#ff6b6b",
    },
    deleteConfirmButtonText: {
      color: "#fff",
      ...typography.bodySmall,
      fontSize: 17,
      fontFamily: "Lora_400Regular",
    },
    deleteCancelButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 12,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: "transparent",
    },
    deleteCancelButtonText: {
      color: colors.textMuted,
      ...typography.bodySmall,
      fontSize: 17,
      fontFamily: "Lora_400Regular",
      textAlign: "center" as const,
    },
  });
}
