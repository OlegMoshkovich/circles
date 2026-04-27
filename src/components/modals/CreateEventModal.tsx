import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
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
  image_url: string;
  max_participants: number | null;
  contact_info: string;
  price_info: string;
  visibility: "public" | "circle" | "friends" | "private";
  circle_id: string | null;
  invited_user_ids: string[];
  is_activity: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (event: NewEventData) => Promise<boolean | void>;
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
  const { bgOption } = useBackground();

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
  const [imageUrl, setImageUrl] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [eventVisibility, setEventVisibility] = useState<"public" | "circle" | "friends" | "private">(
    defaultCircleId ? "circle" : "public"
  );
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(defaultCircleId ?? null);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [friendsSearch, setFriendsSearch] = useState("");
  const [friendsSearchResults, setFriendsSearchResults] = useState<{ user_id: string; display_name: string }[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<{ user_id: string; display_name: string }[]>([]);
  const [isActivity, setIsActivity] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

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

  useEffect(() => {
    if (eventVisibility !== "friends" || !friendsSearch.trim()) {
      setFriendsSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${friendsSearch.trim()}%`)
        .limit(8);
      const selectedIds = new Set(selectedFriends.map((f) => f.user_id));
      setFriendsSearchResults((data ?? []).filter((u: any) => !selectedIds.has(u.user_id)));
    }, 300);
    return () => clearTimeout(timeout);
  }, [friendsSearch, eventVisibility, selectedFriends]);

  const canSave =
    !!title.trim() &&
    !!organizer.trim() &&
    (eventVisibility === "public" ||
      eventVisibility === "friends" ||
      eventVisibility === "private" ||
      selectedCircleId !== null ||
      !!defaultCircleId);

  async function handleSave() {
    if (!canSave) return;
    try {
      const didSave = await onSave({
      title: title.trim(),
      organizer: organizer.trim(),
      date: fmtDate(selectedDate),
      time: fmtTime(selectedDate),
      duration,
      location: location.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      max_participants: maxParticipants.trim() ? Number(maxParticipants.trim()) : null,
      contact_info: contactInfo.trim(),
      price_info: priceInfo.trim(),
      visibility: eventVisibility,
      circle_id: eventVisibility === "circle" ? selectedCircleId : null,
      invited_user_ids: eventVisibility === "friends" ? selectedFriends.map((f) => f.user_id) : [],
      is_activity: isActivity,
      });
      if (didSave !== false) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to create event", error);
      Alert.alert("Could not create event", "Please try again.");
    }
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
    setImageUrl("");
    setMaxParticipants("");
    setContactInfo("");
    setPriceInfo("");
    setEventVisibility(defaultCircleId ? "circle" : "public");
    setSelectedCircleId(defaultCircleId ?? null);
    setFriendsSearch("");
    setFriendsSearchResults([]);
    setSelectedFriends([]);
    setIsActivity(false);
  }

  function handlePickerChange(_: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setPickerMode(null);
    if (date) setSelectedDate(date);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
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
            <View style={styles.sheetBacking}>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.headerTitle}>New Event</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Event / Activity toggle */}
                <View style={styles.typeToggleRow}>
                  <TouchableOpacity
                    style={[styles.typeToggleBtn, !isActivity && styles.typeToggleBtnActive]}
                    onPress={() => setIsActivity(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={14} color={!isActivity ? colors.background : colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={[styles.typeToggleText, !isActivity && styles.typeToggleTextActive]}>Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeToggleBtn, isActivity && styles.typeToggleBtnActive]}
                    onPress={() => setIsActivity(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="body-outline" size={14} color={isActivity ? colors.background : colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={[styles.typeToggleText, isActivity && styles.typeToggleTextActive]}>Activity</Text>
                  </TouchableOpacity>
                </View>

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
                  <View style={styles.locationInputRow}>
                    <Ionicons
                      name={location ? "location" : "location-outline"}
                      size={16}
                      color={location ? colors.iconbBg : colors.textMuted}
                      style={styles.locationIcon}
                    />
                    <TextInput
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Enter an address"
                      placeholderTextColor={colors.textMuted}
                      style={styles.locationInput}
                      numberOfLines={1}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.locationMapButton}
                    onPress={() => setShowMap(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={14} color={colors.textMuted} style={styles.pickerIcon} />
                    <Text style={styles.locationMapButtonText}>
                      Choose on map instead
                    </Text>
                  </TouchableOpacity>
                </View>

                <Field label="Description" value={description} onChangeText={setDescription} placeholder="A few words about the event…" multiline />
                <Field label="Image URL" value={imageUrl} onChangeText={setImageUrl} placeholder="https://example.com/event.jpg" keyboardType="url" />
                <Field
                  label="Maximum Participants"
                  value={maxParticipants}
                  onChangeText={(v) => setMaxParticipants(v.replace(/[^0-9]/g, ""))}
                  placeholder="Limit number of participants"
                  keyboardType="number-pad"
                />
                <Field label="Contact Info" value={contactInfo} onChangeText={setContactInfo} placeholder="Phone / Email" keyboardType="email-address" />
                <Field label="Price" value={priceInfo} onChangeText={setPriceInfo} placeholder="Free / Paid" />

                {!defaultCircleId && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Visibility</Text>
                    <View style={styles.toggleRow}>
                      {(["public", "circle", "friends", "private"] as const).map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.toggleButton, eventVisibility === opt && styles.toggleButtonActive]}
                          onPress={() => {
                            setEventVisibility(opt);
                            if (opt !== "circle") setSelectedCircleId(null);
                            if (opt !== "friends") { setFriendsSearch(""); setFriendsSearchResults([]); }
                            if (opt === "circle" || opt === "friends") {
                              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                            }
                          }}
                        >
                          <Text style={[styles.toggleText, eventVisibility === opt && styles.toggleTextActive]}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Circle sub-picker */}
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

                {/* Friends sub-picker */}
                {!defaultCircleId && eventVisibility === "friends" && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Invite Friends</Text>
                    {selectedFriends.length > 0 && (
                      <View style={styles.selectedFriendsRow}>
                        {selectedFriends.map((f) => (
                          <TouchableOpacity
                            key={f.user_id}
                            style={styles.friendChip}
                            onPress={() => setSelectedFriends((prev) => prev.filter((x) => x.user_id !== f.user_id))}
                          >
                            <Text style={styles.friendChipText}>{f.display_name ?? "User"}</Text>
                            <Ionicons name="close" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <View style={styles.locationInputRow}>
                      <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.locationIcon} />
                      <TextInput
                        value={friendsSearch}
                        onChangeText={setFriendsSearch}
                        placeholder="Search by name…"
                        placeholderTextColor={colors.textMuted}
                        style={styles.locationInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {friendsSearchResults.length > 0 && (
                      <View style={styles.searchResultsList}>
                        {friendsSearchResults.map((u) => (
                          <TouchableOpacity
                            key={u.user_id}
                            style={styles.searchResultRow}
                            onPress={() => {
                              setSelectedFriends((prev) => [...prev, u]);
                              setFriendsSearch("");
                            }}
                          >
                            <Text style={styles.searchResultName}>{u.display_name ?? "User"}</Text>
                            <Ionicons name="add" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {friendsSearch.trim().length > 0 && friendsSearchResults.length === 0 && (
                      <Text style={styles.noCirclesHint}>No users found.</Text>
                    )}
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
                      themeVariant="dark"
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
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

function DurationWheelPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
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
  keyboardType?: "default" | "number-pad" | "email-address" | "phone-pad" | "url";
};

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: FieldProps) {
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
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "url" || keyboardType === "email-address" ? "none" : "sentences"}
          autoCorrect={keyboardType === "url" || keyboardType === "email-address" ? false : true}
        />
      </View>
    </View>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) { return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "flex-end",
  },
  kav: { justifyContent: "flex-end" },
  sheetBacking: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "95%",
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
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputRowMultiline: { paddingBottom: 10 },
  input: { color: colors.text, fontSize: 16, height: 24, fontFamily: "Lora_400Regular" },
  inputMultiline: { height: 72, textAlignVertical: "top", paddingTop: 0 },
  // Date / time picker buttons
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: isOnboarding ? colors.card : colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: isOnboarding ? 1 : 0,
    borderColor: isOnboarding ? colors.cardBorder : "transparent",
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
    color: colors.text,
  },
  picker: { width: "100%" },
  // Location
  locationInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: 24,
    fontFamily: "Lora_400Regular",
    paddingVertical: 0,
    margin: 0,
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationMapButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  locationIcon: { marginRight: 8 },
  locationMapButtonText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  // Save
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
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: isOnboarding ? colors.text : colors.background, fontSize: 16, fontWeight: "600" },
  // Event/Activity type toggle
  typeToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  typeToggleBtnActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.18)" : colors.text,
    borderColor: isOnboarding ? "rgba(239,237,225,0.4)" : colors.text,
  },
  typeToggleText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: colors.textMuted,
  },
  typeToggleTextActive: {
    color: isOnboarding ? colors.text : colors.background,
  },
  // Visibility
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  toggleText: { fontSize: 14, fontFamily: "Lora_400Regular", color: colors.textMuted },
  toggleTextActive: { color: isOnboarding ? colors.text : colors.background },
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
    backgroundColor: isOnboarding ? colors.badgeBg : colors.card,
  },
  circleRowActive: {
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.16)" : colors.text,
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
  },
  circleCheck: { marginRight: 6 },
  circleName: { fontSize: 15, color: colors.text, fontFamily: "Lora_400Regular" },
  circleNameActive: { color: isOnboarding ? colors.text : colors.card },
  noCirclesHint: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
  selectedFriendsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
    backgroundColor: isOnboarding ? "rgba(255,255,255,0.1)" : colors.text,
  },
  friendChipText: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: isOnboarding ? colors.text : colors.background,
  },
  searchResultsList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchResultName: {
    fontSize: 15,
    fontFamily: "Lora_400Regular",
    color: colors.text,
  },
  readOnlyValue: { fontSize: 16, color: colors.textMuted, height: 24, textAlignVertical: "center", fontFamily: "Lora_400Regular" },
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
}); }
