import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useColors } from "../../contexts/BackgroundContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

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
}: CircleCardProps) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
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
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.footerIcon} />
            <Text style={styles.footerText}>{memberCount} {memberCount === 1 ? "member" : "members"}</Text>
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
                <Text style={styles.statusBadgeText}>Owner</Text>
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
              <Text style={styles.statusBadgeText}>Member</Text>
            </View>
          )}
          {memberStatus === "requested" && (
            <View style={[styles.statusBadge, styles.statusBadgeMuted]}>
              <Text style={styles.statusBadgeText}>Requested</Text>
            </View>
          )}
          {memberStatus === null && visibility !== "private" && (
            <View style={styles.joinButton}>
              <Text style={styles.joinButtonText}>
                {visibility === "request" ? "Request" : "Join"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: Colors) {
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
      borderRadius: 20,
      padding: spacing.cardPadding,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: "#2C2A26",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
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
    name: {
      fontSize: 18,
      fontFamily: "CormorantGaramond_300Light",
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
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
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: spacing.md,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.4,
      color: colors.textMuted,
    },
    joinButton: {
      backgroundColor: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
    },
    joinButtonText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.background,
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
