import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { MapPickerView } from "./LocationPickerModal";
import { supabase } from "../../../lib/supabase";

export type EditEventData = {
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
  onSaved: (data: EditEventData) => void;
  eventId: string;
  initialValues: EditEventData;
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function parseDateTimeStrings(dateStr: string, timeStr: string): Date {
  // Try to parse e.g. "Sat, Mar 29" + "10:00 AM"
  try {
    const year = new Date().getFullYear();
    const d = new Date(`${dateStr} ${year} ${timeStr}`);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  const fallback = new Date();
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

export function EditEventModal({ visible, onClose, onSaved, eventId, initialValues }: Props) {
  const [title, setTitle] = useState(initialValues.title);
  const [organizer, setOrganizer] = useState(initialValues.organizer);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateTimeStrings(initialValues.date, initialValues.time)
  );
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [location, setLocation] = useState(initialValues.location);
  const [description, setDescription] = useState(initialValues.description);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initialValues.title);
      setOrganizer(initialValues.organizer);
      setSelectedDate(parseDateTimeStrings(initialValues.date, initialValues.time));
      setPickerMode(null);
      setLocation(initialValues.location);
      setDescription(initialValues.description);
      setShowMap(false);
      setError(null);
    }
  }, [visible]);

  const canSave =
    !saving &&
    !!title.trim() &&
    !!organizer.trim() &&
    !!location.trim();

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        organizer: organizer.trim(),
        date_label: fmtDate(selectedDate),
        time_label: fmtTime(selectedDate),
        location: location.trim(),
        description: description.trim(),
      })
      .eq("id", eventId);

    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      setSaving(false);
      onSaved({
        title: title.trim(),
        organizer: organizer.trim(),
        date: fmtDate(selectedDate),
        time: fmtTime(selectedDate),
        location: location.trim(),
        description: description.trim(),
      });
      onClose();
    }
  }

  function handlePickerChange(_: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setPickerMode(null);
    if (date) setSelectedDate(date);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={showMap ? () => setShowMap(false) : pickerMode ? () => setPickerMode(null) : onClose}
    >
      <View style={styles.overlay}>
        {showMap ? (
          <View style={styles.mapSheet}>
            <MapPickerView
              onBack={() => setShowMap(false)}
              onConfirm={(addr) => { setLocation(addr); setShowMap(false); }}
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.kav}
          >
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.headerTitle}>Edit Event</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label="Title" value={title} onChangeText={setTitle} placeholder="Morning Lake Swim" />
                <Field label="Organiser" value={organizer} onChangeText={setOrganizer} placeholder="Your name" />

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setPickerMode("date")}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={styles.pickerIcon} />
                        <Text style={styles.pickerButtonText}>{fmtDate(selectedDate)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.halfField}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Time</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setPickerMode("time")}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} style={styles.pickerIcon} />
                        <Text style={styles.pickerButtonText}>{fmtTime(selectedDate)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {pickerMode !== null && Platform.OS === "android" && (
                  <DateTimePicker
                    value={selectedDate}
                    mode={pickerMode}
                    onChange={handlePickerChange}
                  />
                )}

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => setShowMap(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={location ? "location" : "location-outline"}
                      size={16}
                      color={location ? colors.iconbBg : colors.textMuted}
                      style={styles.locationIcon}
                    />
                    <Text style={[styles.locationButtonText, !location && styles.locationButtonPlaceholder]} numberOfLines={1}>
                      {location || "Tap to choose on map"}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Field label="Description" value={description} onChangeText={setDescription} placeholder="A few words about the event…" multiline />
              </ScrollView>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Changes"}</Text>
              </TouchableOpacity>

              {pickerMode !== null && Platform.OS === "ios" && (
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerOverlayHeader}>
                      <Text style={styles.pickerOverlayTitle}>
                        {pickerMode === "date" ? "Choose Date" : "Choose Time"}
                      </Text>
                      <TouchableOpacity onPress={() => setPickerMode(null)}>
                        <Text style={styles.pickerOverlayDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode={pickerMode}
                      display={pickerMode === "date" ? "inline" : "spinner"}
                      onChange={handlePickerChange}
                      style={styles.picker}
                      themeVariant="light"
                      accentColor={colors.iconbBg}
                      textColor={colors.text}
                    />
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
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
  kav: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    height: "88%",
  },
  mapSheet: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
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
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  fieldContainer: { marginBottom: 20 },
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
  inputRowMultiline: { paddingBottom: 4 },
  input: { color: colors.text, fontSize: 16, height: 36 },
  inputMultiline: { height: 72, textAlignVertical: "top", paddingTop: 4 },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 10,
    paddingTop: 2,
  },
  pickerIcon: { marginRight: 6 },
  pickerButtonText: {
    fontSize: 15,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  pickerCard: {
    width: "92%",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pickerOverlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerOverlayTitle: {
    fontSize: 17,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  pickerOverlayDone: {
    fontSize: 17,
    fontFamily: "Lora_400Regular",
    color: colors.iconbBg,
  },
  picker: { width: "100%" },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 10,
    paddingTop: 2,
  },
  locationIcon: { marginRight: 8 },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  locationButtonPlaceholder: { color: colors.textMuted },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: { fontSize: 13, color: "#C0392B", marginBottom: 8, textAlign: "center" },
});
