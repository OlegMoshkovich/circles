import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useColors, useBackground } from "../../contexts/BackgroundContext";
import { useLanguage } from "../../i18n/LanguageContext";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CommunityValuesModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetBacking}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t.screens.values.title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.tagline}>{t.screens.values.tagline}</Text>

              <Text style={styles.heading}>{t.screens.values.ourMission}</Text>
              <Text style={styles.body}>{t.screens.values.missionBody}</Text>

              <Text style={styles.heading}>{t.screens.values.coreValuesHeading}</Text>
              {t.screens.values.coreValues.map((v) => (
                <Text key={v.name} style={styles.body}>
                  <Text style={styles.bodyEmphasis}>{v.name}. </Text>
                  {v.desc}
                </Text>
              ))}

              <Text style={styles.heading}>{t.screens.values.principlesHeading}</Text>
              <Text style={styles.body}>{t.screens.values.principlesIntro}</Text>
              {t.screens.values.principles.map((p) => (
                <View key={p} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{p}</Text>
                </View>
              ))}

              <Text style={styles.heading}>{t.screens.values.reportingHeading}</Text>
              <Text style={styles.body}>{t.screens.values.moderationBody}</Text>
            </ScrollView>
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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: "85%",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      flex: 1,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? colors.cardBorder : "transparent",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
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
      fontSize: 24,
      fontFamily: "CormorantGaramond_300Light",
      color: colors.text,
    },
    tagline: {
      fontSize: 18,
      fontFamily: "Lora_400Regular",
      color: colors.text,
      lineHeight: 26,
      marginBottom: 18,
    },
    heading: {
      fontSize: 16,
      fontFamily: "Lora_400Regular",
      fontWeight: "700",
      color: colors.text,
      marginTop: 18,
      marginBottom: 8,
    },
    body: {
      fontSize: 14,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 10,
    },
    bodyEmphasis: {
      fontFamily: "Lora_400Regular",
      fontWeight: "700",
      color: colors.text,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
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
