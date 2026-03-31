import React, { useEffect, useRef, useState } from "react";
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
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { colors } from "../../theme/colors";
import { supabase, Circle } from "../../../lib/supabase";
import { MapPickerView } from "./LocationPickerModal";

export type NewEventData = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  duration: number | null;
  location: string;
  description: string;
  visibility: "public" | "circle";
  circle_id: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (event: NewEventData) => void;
  /** When provided the modal defaults visibility to "circle" and hides the visibility picker */
  defaultCircleId?: string | null;
};

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const DURATION_ITEM_HEIGHT = 44;
const DURATION_VISIBLE_ITEMS = 5;
const DURATION_OPTIONS: (number | null)[] = [
  null,
  ...Array.from({ length: 32 }, (_, i) => (i + 1) * 15),
];

function fmtDuration(minutes: number | null): string {
  if (minutes === null) return "None";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function CreateEventModal({ visible, onClose, onSave, defaultCircleId }: Props) {
  const { user } = useUser();

  function defaultOrganizer() {
    return user?.fullName
      ?? user?.firstName
      ?? user?.username
      ?? user?.emailAddresses?.[0]?.emailAddress
      ?? "";
  }

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState(defaultOrganizer);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [location, setLocation] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [description, setDescription] = useState("");
  const [eventVisibility, setEventVisibility] = useState<"public" | "circle">(
    defaultCircleId ? "circle" : "public"
  );
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(defaultCircleId ?? null);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || !user) return;
    setOrganizer((prev) => prev || defaultOrganizer());
    supabase
      .from("circle_members")
      .select("circle_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(async ({ data: memberships }) => {
        const circleIds = memberships?.map((m: any) => m.circle_id) ?? [];
        if (circleIds.length === 0) { setMyCircles([]); return; }
        const { data: circles } = await supabase.from("circles").select("*").in("id", circleIds);
        if (circles) setMyCircles(circles as Circle[]);
      });
  }, [visible, user]);

  const canSave =
    !!title.trim() &&
    !!organizer.trim() &&
    !!location.trim() &&
    (eventVisibility === "public" || selectedCircleId !== null || !!defaultCircleId);

  function handleSave() {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      organizer: organizer.trim(),
      date: fmtDate(selectedDate),
      time: fmtTime(selectedDate),
      duration,
      location: location.trim(),
      description: description.trim(),
      visibility: eventVisibility,
      circle_id: eventVisibility === "circle" ? selectedCircleId : null,
    });
    resetForm();
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  function resetForm() {
    setTitle("");
    setOrganizer(defaultOrganizer());
    setSelectedDate(defaultDate());
    setPickerMode(null);
    setDuration(null);
    setShowDurationPicker(false);
    setLocation("");
    setShowMap(false);
    setDescription("");
    setEventVisibility(defaultCircleId ? "circle" : "public");
    setSelectedCircleId(defaultCircleId ?? null);
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
      onRequestClose={showMap ? () => setShowMap(false) : pickerMode ? () => setPickerMode(null) : showDurationPicker ? () => setShowDurationPicker(false) : handleClose}
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
                <Text style={styles.headerTitle}>New Event</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label="Title" value={title} onChangeText={setTitle} placeholder="Morning Lake Swim" />
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Organiser</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.readOnlyValue}>{organizer}</Text>
                  </View>
                </View>

                {/* Date + Time row */}
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

                {/* Duration row */}
                <View style={[styles.row, { marginTop: -8 }]}>
                  <View style={styles.halfField}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Duration <Text style={styles.optionalLabel}>(optional)</Text></Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowDurationPicker(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} style={styles.pickerIcon} />
                        <Text style={[styles.pickerButtonText, duration === null && styles.pickerButtonPlaceholder]}>
                          {duration !== null ? fmtDuration(duration) : "—"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Android: render picker inline (shows as native dialog) */}
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

                {!defaultCircleId && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Visibility</Text>
                    <View style={styles.toggleRow}>
                      {(["public", "circle"] as const).map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.toggleButton, eventVisibility === opt && styles.toggleButtonActive]}
                          onPress={() => {
                            setEventVisibility(opt);
                            if (opt === "public") {
                              setSelectedCircleId(null);
                            } else {
                              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                            }
                          }}
                        >
                          <Text style={[styles.toggleText, eventVisibility === opt && styles.toggleTextActive]}>
                            {opt === "public" ? "Public" : "Circle"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {!defaultCircleId && eventVisibility === "circle" && myCircles.length > 0 && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Select Circle</Text>
                    {myCircles.map((circle) => (
                      <TouchableOpacity
                        key={circle.id}
                        style={[styles.circleRow, selectedCircleId === circle.id && styles.circleRowActive]}
                        onPress={() => setSelectedCircleId(circle.id)}
                      >
                        {selectedCircleId === circle.id && (
                          <Ionicons name="checkmark" size={14} color={colors.card} style={styles.circleCheck} />
                        )}
                        <Text style={[styles.circleName, selectedCircleId === circle.id && styles.circleNameActive]}>
                          {circle.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!defaultCircleId && eventVisibility === "circle" && myCircles.length === 0 && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.noCirclesHint}>Join a circle first to post circle-only events.</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveButtonText}>Create Event</Text>
              </TouchableOpacity>

              {/* iOS picker overlay — rendered inside the sheet */}
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

              {/* Duration picker overlay */}
              {showDurationPicker && (
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerOverlayHeader}>
                      <Text style={styles.pickerOverlayTitle}>Duration</Text>
                      <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                        <Text style={styles.pickerOverlayDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DurationWheelPicker value={duration} onChange={setDuration} />
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

function DurationWheelPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = DURATION_OPTIONS.indexOf(value);
    const startIdx = idx >= 0 ? idx : 0;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: startIdx * DURATION_ITEM_HEIGHT, animated: false });
    }, 50);
  }, []);

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const newIdx = Math.max(0, Math.min(Math.round(y / DURATION_ITEM_HEIGHT), DURATION_OPTIONS.length - 1));
    onChange(DURATION_OPTIONS[newIdx]);
  }

  return (
    <View style={styles.durationWheel}>
      <View style={styles.durationSelectionBar} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        snapToInterval={DURATION_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DURATION_ITEM_HEIGHT * Math.floor(DURATION_VISIBLE_ITEMS / 2) }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {DURATION_OPTIONS.map((opt, i) => (
          <View key={i} style={styles.durationItem}>
            <Text style={[styles.durationItemText, opt === value && styles.durationItemTextSelected]}>
              {fmtDuration(opt)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
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
    height: "95%",
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
  // Date / time picker buttons
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
  // iOS picker overlay
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
  // Location
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
  // Save
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
  // Visibility
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  toggleButtonActive: { backgroundColor: colors.text, borderColor: colors.text },
  toggleText: { fontSize: 14, fontWeight: "500" as const, color: colors.textMuted },
  toggleTextActive: { color: colors.card },
  // Circles
  circleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    backgroundColor: colors.card,
  },
  circleRowActive: { backgroundColor: colors.text, borderColor: colors.text },
  circleCheck: { marginRight: 6 },
  circleName: { fontSize: 15, color: colors.text },
  circleNameActive: { color: colors.card },
  noCirclesHint: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
  readOnlyValue: { fontSize: 16, color: colors.textMuted, height: 36, textAlignVertical: "center" },
  pickerButtonPlaceholder: { color: colors.textMuted },
  optionalLabel: { fontSize: 10, fontWeight: "400" as const, letterSpacing: 0, textTransform: "none" as const, color: colors.textMuted },
  // Duration wheel picker
  durationWheel: {
    height: DURATION_ITEM_HEIGHT * DURATION_VISIBLE_ITEMS,
    overflow: "hidden",
  },
  durationSelectionBar: {
    position: "absolute",
    top: DURATION_ITEM_HEIGHT * Math.floor(DURATION_VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: DURATION_ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  durationItem: {
    height: DURATION_ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  durationItemText: {
    fontSize: 18,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  durationItemTextSelected: {
    color: colors.text,
    fontSize: 20,
  },
});
