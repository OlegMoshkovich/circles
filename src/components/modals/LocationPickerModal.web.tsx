// Web-only stub for LocationPickerModal – replaces the map with a plain text input
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

type MapPickerViewProps = {
  onBack: () => void;
  onConfirm: (address: string) => void;
};

export function MapPickerView({ onBack, onConfirm }: MapPickerViewProps) {
  const [address, setAddress] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Choose Location</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Enter address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, City…"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.confirmButton, !address.trim() && styles.confirmButtonDisabled]}
          onPress={() => address.trim() && onConfirm(address.trim())}
          disabled={!address.trim()}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 15,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: colors.text,
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.35 },
  confirmButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
