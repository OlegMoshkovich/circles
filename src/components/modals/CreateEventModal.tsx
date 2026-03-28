import React, { useEffect, useState } from "react";
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
import { useUser } from "@clerk/clerk-expo";
import { colors } from "../../theme/colors";
import { supabase, Circle } from "../../../lib/supabase";
import { MapPickerView } from "./LocationPickerModal";

export type NewEventData = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  description: string;
  visibility: "public" | "circle";
  circle_id: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (event: NewEventData) => void;
};

export function CreateEventModal({ visible, onClose, onSave }: Props) {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [description, setDescription] = useState("");
  const [eventVisibility, setEventVisibility] = useState<"public" | "circle">("public");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);

  useEffect(() => {
    if (!visible || !user) return;
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
    title.trim() &&
    organizer.trim() &&
    date.trim() &&
    time.trim() &&
    location.trim() &&
    (eventVisibility === "public" || selectedCircleId !== null);

  function handleSave() {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      organizer: organizer.trim(),
      date: date.trim(),
      time: time.trim(),
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
    setOrganizer("");
    setDate("");
    setTime("");
    setLocation("");
    setShowMap(false);
    setDescription("");
    setEventVisibility("public");
    setSelectedCircleId(null);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={showMap ? () => setShowMap(false) : handleClose}
    >
      <View style={styles.overlay}>
        {showMap ? (
          <View style={styles.mapSheet}>
            <MapPickerView
              onBack={() => setShowMap(false)}
              onConfirm={(addr) => {
                setLocation(addr);
                setShowMap(false);
              }}
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

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Visibility</Text>
                  <View style={styles.toggleRow}>
                    {(["public", "circle"] as const).map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.toggleButton, eventVisibility === opt && styles.toggleButtonActive]}
                        onPress={() => {
                          setEventVisibility(opt);
                          if (opt === "public") setSelectedCircleId(null);
                        }}
                      >
                        <Text style={[styles.toggleText, eventVisibility === opt && styles.toggleTextActive]}>
                          {opt === "public" ? "Public" : "Circle"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {eventVisibility === "circle" && myCircles.length > 0 && (
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

                {eventVisibility === "circle" && myCircles.length === 0 && (
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
    height: "92%",
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
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  toggleButtonActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.card,
  },
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
  circleRowActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  circleCheck: {
    marginRight: 6,
  },
  circleName: {
    fontSize: 15,
    color: colors.text,
  },
  circleNameActive: {
    color: colors.card,
  },
  noCirclesHint: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 10,
    paddingTop: 2,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  locationButtonPlaceholder: {
    color: colors.textMuted,
  },
});
