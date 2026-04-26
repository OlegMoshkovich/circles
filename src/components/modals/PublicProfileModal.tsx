import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { supabase, UserProfile } from "../../../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
};

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function PublicProfileModal({ visible, onClose, userId, displayName }: Props) {
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

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

  const name = profile?.display_name ?? displayName;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetBacking}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View />
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.textMuted} />
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
      height: "60%",
    },
    sheet: {
      backgroundColor: isOnboarding ? "#3F4837" : colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      flex: 1,
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
      paddingBottom: 16,
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
  });
}
