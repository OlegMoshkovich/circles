import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { typography } from "../../theme/typography";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

export function DeleteConfirmationModal({ visible, onClose, title = "Delete account", children }: Props) {
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text style={styles.title}>{title}</Text>
              {children}
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
    content: {
      paddingBottom: 16,
    },
    title: {
      ...typography.body,
      fontSize: 20,
      color: colors.text,
      fontFamily: "Lora_400Regular",
      marginBottom: 10,
    },
  });
}
