import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useLanguage } from "../../i18n/LanguageContext";

type MemberStatus = "owner" | "active" | "requested" | null;

type CircleCardProps = {
  name: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "request" | "private";
  memberCount: number;
  memberStatus: MemberStatus;
  location?: string | null;
  organizer?: string | null;
  pendingRequests?: number;
  hasNewActivity?: boolean;
  onPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

const VISIBILITY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  public: "globe-outline",
  request: "lock-open-outline",
  private: "lock-closed-outline",
};

export function CircleCard({
  name,
  description,
  category,
  visibility,
  memberCount,
  memberStatus,
  location,
  organizer,
  pendingRequests = 0,
  hasNewActivity = false,
  onPress,
  onActionPress,
  actionIcon,
}: CircleCardProps) {
  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.headerRight}>
          {hasNewActivity && (
            <View style={styles.activityBell}>
              <Ionicons name="notifications-outline" size={11} color="#FFFFFF" />
            </View>
          )}
   
          {category ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          ) : null}
                 {actionIcon && onActionPress ? (
            <TouchableOpacity style={styles.headerAction} onPress={onActionPress} activeOpacity={0.8}>
              <Ionicons name={actionIcon} size={12} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.footerIcon} />
            <Text style={styles.footerText}>{memberCount} {memberCount === 1 ? t.circles.typeMember.toLowerCase() : t.circles.members.toLowerCase()}</Text>
          </View>
          {location ? (
            <View style={styles.footerRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.footerIcon} />
              <Text style={styles.footerText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          {organizer ? (
            <View style={styles.footerRow}>
              <Ionicons name="person-outline" size={14} color={colors.textMuted} style={styles.footerIcon} />
              <Text style={styles.footerText} numberOfLines={1}>{organizer}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerRight}>
          <Ionicons name={VISIBILITY_ICON[visibility]} size={14} color={colors.textMuted} style={styles.footerIcon} />
          {memberStatus === "owner" && (
            <View style={styles.ownerBadgeRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{t.circles.typeOwner}</Text>
              </View>
              {pendingRequests > 0 && (
                <View style={styles.requestDot}>
                  <Text style={styles.requestDotText}>{pendingRequests}</Text>
                </View>
              )}
            </View>
          )}
          {memberStatus === "active" && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{t.circles.typeMember}</Text>
            </View>
          )}
          {memberStatus === "requested" && (
            <View style={[styles.statusBadge, styles.statusBadgeMuted]}>
              <Text style={styles.statusBadgeText}>{t.circles.requested}</Text>
            </View>
          )}
          {memberStatus === null && visibility !== "private" && (
            <View style={styles.joinButton}>
              <Text style={styles.joinButtonText}>
                {visibility === "request" ? t.circles.request : t.circles.typeJoin}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    activityBell: {
      backgroundColor: "#FF4D00",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginRight: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      flexShrink: 0,
    },
    name: {
      fontSize: 18,
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    headerAction: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.badgeBg,
      marginLeft: spacing.sm,
    },
    badge: {
      backgroundColor: colors.badgeBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.6,
      color: colors.textMuted,
      textTransform: "uppercase" as const,
    },
    description: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      fontFamily: "Lora_400Regular",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    footerLeft: {
      flexDirection: "column",
      gap: 4,
      flex: 1,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    footerIcon: {
      marginRight: spacing.xs,
    },
    footerText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    statusBadge: {
      backgroundColor: colors.badgeBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusBadgeMuted: {
      backgroundColor: colors.badgeBg,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.4,
      color: colors.textMuted,
    },
    joinButton: {
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.12)" : colors.text,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
    },
    joinButtonText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: isOnboarding ? colors.text : colors.background,
      letterSpacing: 0.3,
    },
    ownerBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    requestDot: {
      backgroundColor: colors.text,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    requestDotText: {
      color: colors.background,
      fontSize: 10,
      fontWeight: "700" as const,
    },
  });
}
