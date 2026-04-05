import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
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
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { MapPickerView } from "./LocationPickerModal";

export type NewCircleData = {
  name: string;
  description: string;
  category: string;
  visibility: "public" | "request" | "private";
  location: string;
  organizer: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (circle: NewCircleData) => Promise<void>;
};

const VISIBILITY_OPTIONS: { value: "public" | "request" | "private"; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "request", label: "Request" },
  { value: "private", label: "Private" },
];

const PRESET_CATEGORIES = ["Culture", "Friends", "Nature", "Sport", "Food", "Travel"];

export function CreateCircleModal({ visible, onClose, onSave }: Props) {
  const { user } = useUser();
  const { bgOption } = useBackground();

  function defaultOrganizer() {
    return user?.fullName
      ?? user?.firstName
      ?? user?.username
      ?? user?.emailAddresses?.[0]?.emailAddress
      ?? "";
  }

  const [name, setName] = useState("");
  const [organizer, setOrganizer] = useState(defaultOrganizer);
  const [description, setDescription] = useState("");
  const [categoryPreset, setCategoryPreset] = useState("");
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [visibility, setVisibility] = useState<"public" | "request" | "private">("public");
  const [location, setLocation] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  useEffect(() => {
    if (visible) {
      setName("");
      setOrganizer(defaultOrganizer());
      setDescription("");
      setCategoryPreset("");
      setCustomCategoryText("");
      setVisibility("public");
      setLocation("");
      setShowMap(false);
      setError(null);
    }
  }, [visible]);

  const canSave = name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const category = categoryPreset === "custom" ? customCategoryText.trim() : categoryPreset;
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        visibility,
        location: location.trim(),
        organizer: organizer.trim(),
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to create circle. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    onClose();
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
            <View style={styles.sheetBacking}>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.headerTitle}>New Circle</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label="Name" value={name} onChangeText={setName} placeholder="Hiking Group" />
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Organiser</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.readOnlyValue}>{organizer}</Text>
                  </View>
                </View>
                <Field label="Description" value={description} onChangeText={setDescription} placeholder="A few words about this circle…" multiline />
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.categoryGrid}>
                    {PRESET_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryPill, categoryPreset === cat && styles.categoryPillActive]}
                        onPress={() => setCategoryPreset(categoryPreset === cat ? "" : cat)}
                      >
                        <Text style={[styles.categoryPillText, categoryPreset === cat && styles.categoryPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.categoryPill, categoryPreset === "custom" && styles.categoryPillActive]}
                      onPress={() => setCategoryPreset(categoryPreset === "custom" ? "" : "custom")}
                    >
                      <Text style={[styles.categoryPillText, categoryPreset === "custom" && styles.categoryPillTextActive]}>
                        Custom
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {categoryPreset === "custom" && (
                    <View style={[styles.inputRow, { marginTop: 12 }]}>
                      <TextInput
                        value={customCategoryText}
                        onChangeText={setCustomCategoryText}
                        placeholder="e.g. Yoga, Chess, Photography…"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Visibility</Text>
                  <View style={styles.toggleRow}>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.toggleButton, visibility === opt.value && styles.toggleButtonActive]}
                        onPress={() => setVisibility(opt.value)}
                      >
                        <Text style={[styles.toggleText, visibility === opt.value && styles.toggleTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                      {location || "Tap to choose on map (optional)"}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveButtonText}>{saving ? "Creating…" : "Create Circle"}</Text>
              </TouchableOpacity>
            </View>
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
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
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

function makeStyles(colors: Colors, isOnboarding: boolean) { return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  kav: {
    justifyContent: "flex-end",
  },
  sheetBacking: {
    backgroundColor: isOnboarding ? "rgba(15,13,10,0.45)" : colors.background,
    borderTopLeftRadius: isOnboarding ? 28 : 20,
    borderTopRightRadius: isOnboarding ? 28 : 20,
    height: "94%",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: isOnboarding ? 28 : 20,
    borderTopRightRadius: isOnboarding ? 28 : 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    flex: 1,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
  },
  mapSheet: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
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
    borderBottomWidth: isOnboarding ? 0 : 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: isOnboarding ? 0 : 8,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
    backgroundColor: isOnboarding ? colors.badgeBg : "transparent",
    borderRadius: isOnboarding ? 16 : 0,
    paddingHorizontal: isOnboarding ? 14 : 0,
    paddingVertical: isOnboarding ? 10 : 0,
  },
  inputRowMultiline: {
    paddingBottom: isOnboarding ? 10 : 4,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    height: 36,
    fontFamily: "Lora_400Regular",
  },
  inputMultiline: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  categoryPillActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.text,
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: isOnboarding ? colors.text : colors.card,
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
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  toggleButtonActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.text,
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: isOnboarding ? colors.text : colors.background,
  },
  saveButton: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.14)" : colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
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
    marginBottom: 8,
    textAlign: "center",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: isOnboarding ? 0 : 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: isOnboarding ? 12 : 10,
    paddingTop: isOnboarding ? 12 : 2,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
    backgroundColor: isOnboarding ? colors.badgeBg : "transparent",
    borderRadius: isOnboarding ? 16 : 0,
    paddingHorizontal: isOnboarding ? 14 : 0,
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
  readOnlyValue: { fontSize: 16, color: colors.textMuted, height: 36, textAlignVertical: "center", fontFamily: "Lora_400Regular" },
}); }
