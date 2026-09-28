import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useColors } from "../../contexts/BackgroundContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { FeedbackModal } from "../modals/FeedbackModal";

export function ProfileMission() {
  const colors = useColors();
  const { t } = useLanguage();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  return (
    <>
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setExpanded((open) => !open)}
        activeOpacity={0.7}
      >
        <Text style={styles.rowLabel}>{t.profile.mission}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.tagline}>{t.missionText.tagline}</Text>

          <Text style={styles.heading}>{t.missionText.heading}</Text>
          <Text style={styles.copy}>{t.missionText.body}</Text>

          <Text style={styles.heading}>{t.missionText.valuesHeading}</Text>
          {t.missionText.values.map((value) => (
            <Text key={value.name} style={styles.copy}>
              <Text style={styles.emphasis}>{value.name}. </Text>
              {value.desc}
            </Text>
          ))}

          <Text style={styles.heading}>{t.missionText.principlesHeading}</Text>
          <Text style={styles.copy}>{t.missionText.principlesIntro}</Text>
          {t.missionText.principles.map((principle) => (
            <View key={principle} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{principle}</Text>
            </View>
          ))}

          <Text style={styles.heading}>{t.missionText.moderationHeading}</Text>
          <Text style={styles.copy}>{t.missionText.moderation}</Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => setFeedbackVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.rowLabel}>{t.circles.feedbackTitle}</Text>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>

    <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
    </>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: 14,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: spacing.cardPadding,
    },
    body: {
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: spacing.cardPadding,
    },
    tagline: {
      fontSize: 16,
      fontFamily: "Lora_400Regular",
      color: colors.text,
      lineHeight: 24,
      marginBottom: 8,
    },
    heading: {
      fontSize: 15,
      fontFamily: "Lora_400Regular",
      fontWeight: "700",
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    copy: {
      fontSize: 14,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 8,
    },
    emphasis: {
      fontFamily: "Lora_400Regular",
      fontWeight: "700",
      color: colors.text,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    bulletDot: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 22,
      width: 16,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      lineHeight: 22,
    },
  });
}
