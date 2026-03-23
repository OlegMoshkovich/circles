import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export type NewEventData = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  description: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (event: NewEventData) => void;
};

export function CreateEventModal({ visible, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const canSave = title.trim() && organizer.trim() && date.trim() && time.trim() && location.trim();

  function handleSave() {
    if (!canSave) return;
    onSave({ title: title.trim(), organizer: organizer.trim(), date: date.trim(), time: time.trim(), location: location.trim(), description: description.trim() });
    resetForm();
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  function resetForm() {
    setTitle("");
    setOrganizer("");
    setDate("");
    setTime("");
    setLocation("");
    setDescription("");
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kav}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>New Event</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="Title" value={title} onChangeText={setTitle} placeholder="Morning Lake Swim" />
              <Field label="Organiser" value={organizer} onChangeText={setOrganizer} placeholder="Your name" />
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Field label="Date" value={date} onChangeText={setDate} placeholder="Jan 10" />
                </View>
                <View style={styles.halfField}>
                  <Field label="Time" value={time} onChangeText={setTime} placeholder="7:00 AM" />
                </View>
              </View>
              <Field label="Location" value={location} onChangeText={setLocation} placeholder="Lakeside Dock" />
              <Field label="Description" value={description} onChangeText={setDescription} placeholder="A few words about the event…" multiline />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
};

function Field({ label, value, onChangeText, placeholder, multiline }: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  kav: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "90%",
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 8,
  },
  inputRowMultiline: {
    paddingBottom: 4,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    height: 36,
  },
  inputMultiline: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.35,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
