import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  containsObjectionableContentInAny,
  OBJECTIONABLE_CONTENT_MESSAGE,
} from "../../../lib/contentModeration";
import { supabase } from "../../../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function FeedbackModal({ visible, onClose }: Props) {
  const { user } = useUser();
  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMessage("");
    setSaving(false);
    setSent(false);
    setError(null);
  }, [visible]);

  const canSend = message.trim().length > 0 && !saving && !sent;

  async function handleSend() {
    const text = message.trim();
    if (!text || saving || !user?.id) return;
    if (containsObjectionableContentInAny(text)) {
      Alert.alert(t.circles.feedbackTitle, OBJECTIONABLE_CONTENT_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      message: text,
    });
    setSaving(false);
    if (insertError) {
      setError(t.circles.feedbackError);
      return;
    }
    setSent(true);
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
          <View style={styles.sheetBacking}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.circles.feedbackTitle}</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {sent ? (
                <Text style={styles.thanks}>{t.circles.feedbackThanks}</Text>
              ) : (
                <>
                  <View style={[styles.inputRow, styles.inputRowMultiline]}>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder={t.circles.feedbackPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, styles.inputMultiline]}
                      multiline
                      autoFocus
                      maxLength={4000}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <TouchableOpacity
                    style={[styles.saveButton, !canSend && styles.saveButtonDisabled]}
                    onPress={handleSend}
                    disabled={!canSend}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? t.circles.feedbackSending : t.circles.feedbackSend}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
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
    kav: {
      justifyContent: "flex-end",
    },
    sheetBacking: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
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
    inputRow: {
      minHeight: 52,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isOnboarding ? colors.badgeBg : colors.background,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    inputRowMultiline: {
      minHeight: 140,
      alignItems: "flex-start",
      paddingTop: 12,
    },
    input: {
      color: colors.text,
      fontSize: 16,
      minHeight: 24,
      fontFamily: "Lora_400Regular",
      width: "100%",
    },
    inputMultiline: {
      minHeight: 116,
      textAlignVertical: "top",
    },
    saveButton: {
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.14)" : colors.text,
      borderRadius: 50,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? "rgba(239,237,225,0.28)" : "transparent",
    },
    saveButtonDisabled: {
      opacity: 0.35,
    },
    saveButtonText: {
      color: isOnboarding ? colors.text : colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    errorText: {
      fontSize: 13,
      color: "#C0392B",
      marginTop: 12,
      textAlign: "center",
    },
    thanks: {
      fontSize: 16,
      fontFamily: "Lora_400Regular",
      color: colors.text,
      lineHeight: 24,
      marginBottom: 8,
    },
  });
}
