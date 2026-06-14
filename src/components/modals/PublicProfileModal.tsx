import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { Colors } from "../../theme/colors";
import { Spinner } from "../loaders/Spinner";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { useReport } from "../../contexts/ReportProvider";
import { supabase, UserProfile } from "../../../lib/supabase";
import { blockUser, isUserBlocked, unblockUser } from "../../../lib/userBlocks";

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  /** Called after the viewer blocks this user, so the parent can drop their content immediately. */
  onBlocked?: (userId: string) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function PublicProfileModal({ visible, onClose, userId, displayName, onBlocked }: Props) {
  const { user } = useUser();
  const { report } = useReport();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockWorking, setBlockWorking] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    setProfile(null);
    supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoading(false);
      });
  }, [visible, userId]);

  useEffect(() => {
    if (!visible || !user?.id || user.id === userId) {
      setBlocked(false);
      return;
    }
    let cancelled = false;
    isUserBlocked(user.id, userId).then((b) => {
      if (!cancelled) setBlocked(b);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id, userId]);

  const name = profile?.display_name ?? displayName;
  const canModerate = !!user?.id && user.id !== userId;

  async function confirmBlock() {
    if (!user?.id || blockWorking) return;
    Alert.alert(
      `Block ${name}?`,
      "You won't see their circles, events, or notes anymore, and our team will be notified to review them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBlockWorking(true);
            const { error } = await blockUser(user.id, userId);
            setBlockWorking(false);
            if (error) {
              Alert.alert("Could not block", error.message);
              return;
            }
            setBlocked(true);
            onBlocked?.(userId);
            onClose();
            Alert.alert("Blocked", `You won't see content from ${name} anymore.`);
          },
        },
      ]
    );
  }

  async function handleUnblock() {
    if (!user?.id || blockWorking) return;
    setBlockWorking(true);
    const { error } = await unblockUser(user.id, userId);
    setBlockWorking(false);
    if (error) {
      Alert.alert("Could not unblock", error.message);
      return;
    }
    setBlocked(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetBacking}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View />
              <View style={styles.headerActions}>
                {user?.id && user.id !== userId ? (
                  <TouchableOpacity
                    onPress={() => {
                      const reporterId = user.id;
                      // Close this full-screen modal first, otherwise the report
                      // modal (rendered higher in the tree) opens behind it and
                      // is only visible after dismissing this sheet.
                      onClose();
                      setTimeout(
                        () =>
                          report({
                            reporterUserId: reporterId,
                            targetType: "user_profile",
                            targetId: userId,
                            reportedUserId: userId,
                          }),
                        350
                      );
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loader}>
                <Spinner size="small" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Avatar + name row */}
                <View style={styles.avatarRow}>
                  <View style={styles.avatar}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{initials(name)}</Text>
                    )}
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={styles.name}>{name}</Text>
                  </View>
                </View>

                {/* Bio */}
                {profile?.bio ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Bio</Text>
                    <Text style={styles.bio}>{profile.bio}</Text>
                  </View>
                ) : null}

                {/* Interests */}
                {profile?.interests && profile.interests.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Interests</Text>
                    <View style={styles.tagsRow}>
                      {profile.interests.map((interest) => (
                        <View key={interest} style={styles.tag}>
                          <Text style={styles.tagText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {!profile?.bio && !profile?.interests?.length ? (
                  <Text style={styles.emptyText}>No profile information yet.</Text>
                ) : null}

                {canModerate ? (
                  <TouchableOpacity
                    style={styles.blockButton}
                    onPress={blocked ? handleUnblock : confirmBlock}
                    disabled={blockWorking}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={blocked ? "person-add-outline" : "ban-outline"}
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.blockButtonText}>
                      {blockWorking
                        ? "Working…"
                        : blocked
                        ? `Unblock ${name}`
                        : `Block ${name}`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "flex-end",
    },
    sheetBacking: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "85%",
    },
    sheet: {
      backgroundColor: isOnboarding ? "#3F4837" : colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      // Matches blockButton.marginTop so the gap above and below the button is equal.
      paddingBottom: 24,
      paddingTop: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.divider,
      alignSelf: "center",
      marginBottom: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "CormorantGaramond_300Light",
      color: colors.text,
    },
    loader: {
      paddingVertical: 32,
      alignItems: "center",
    },
    content: {
      paddingBottom: 0,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 24,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    avatarText: {
      fontSize: 20,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    nameBlock: {
      flex: 1,
    },
    name: {
      fontSize: 22,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    location: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    section: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    bio: {
      fontSize: 15,
      fontFamily: "Lora_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.badgeBg,
    },
    tagText: {
      fontSize: 13,
      color: colors.text,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
      paddingVertical: 24,
      textAlign: "center",
    },
    blockButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.6)",
    },
    blockButtonText: {
      fontSize: 15,
      fontFamily: "Lora_400Regular",
      color: "#ffffff",
    },
  });
}
