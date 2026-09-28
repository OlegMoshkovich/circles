import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { useColors } from "../../contexts/BackgroundContext";
import { Spinner } from "../loaders/Spinner";
import { RootStackParamList } from "../../../types";
import { belongsToPlace, matchesKeptPlace } from "../../../lib/allowedPlaces";

type CircleItem = {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private" | "request";
  owner_id: string;
  organizer: string | null;
  location: string | null;
};
type EventItem = {
  id: string;
  title: string;
  organizer: string;
  date_label: string;
  time_label: string;
  location: string;
  description: string;
  image_url?: string | null;
  max_participants?: number | null;
  contact_info?: string | null;
  price_info?: string | null;
  event_url?: string | null;
  going: number;
  maybe: number;
  created_by?: string | null;
  circle_id?: string | null;
  circleName?: string | null;
};

type Props = {
  circles: CircleItem[];
  events: EventItem[];
  loading?: boolean;
};

export function ProfileActivity({ circles, events, loading = false }: Props) {
  const { t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [circlesExpanded, setCirclesExpanded] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setCirclesExpanded((open) => !open)}
        activeOpacity={0.7}
      >
        <Text style={styles.rowLabel}>{t.profile.communities}</Text>
        <View style={styles.headerRight}>
          {loading ? (
            <Spinner size={14} color={colors.textMuted} />
          ) : (
            <Text style={styles.rowValue}>{circles.length}</Text>
          )}
          <Ionicons
            name={circlesExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.textMuted}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>
          {circlesExpanded
            ? circles.map((circle) => {
                const parentPlace = circles.find(
                  (place) => matchesKeptPlace(place.name) && belongsToPlace(circle, place)
                );
                return (
                  <TouchableOpacity
                    key={circle.id}
                    style={styles.subRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("CircleDetail", {
                        id: circle.id,
                        name: circle.name,
                        description: circle.description,
                        visibility: circle.visibility,
                        owner_id: circle.owner_id,
                        member_count: 0,
                        organizer: circle.organizer,
                        location: circle.location,
                        backLabel: t.nav.profile,
                        mode: parentPlace ? "circle" : "place",
                      })
                    }
                  >
                    <Text style={styles.rowValue} numberOfLines={1}>{circle.name}</Text>
                  </TouchableOpacity>
                );
              })
            : null}

      <View style={styles.rowDivider} />
      <TouchableOpacity
            style={styles.row}
            onPress={() => setEventsExpanded((open) => !open)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{t.profile.events}</Text>
            <View style={styles.headerRight}>
              {loading ? (
                <Spinner size={14} color={colors.textMuted} />
              ) : (
                <Text style={styles.rowValue}>{events.length}</Text>
              )}
              <Ionicons
                name={eventsExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.textMuted}
                style={{ marginLeft: 6 }}
              />
            </View>
          </TouchableOpacity>
          {eventsExpanded
            ? events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.subRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate("EventDetail", {
                      id: event.id,
                      title: event.title,
                      organizer: event.organizer,
                      date: event.date_label,
                      time: event.time_label,
                      location: event.location,
                      going: event.going,
                      maybe: event.maybe,
                      description: event.description,
                      image_url: event.image_url ?? null,
                      max_participants: event.max_participants ?? null,
                      contact_info: event.contact_info ?? null,
                      price_info: event.price_info ?? null,
                      event_url: event.event_url ?? null,
                      created_by: event.created_by ?? null,
                      circleName: event.circleName ?? null,
                      circle_id: event.circle_id ?? null,
                      backLabel: t.nav.profile,
                    })
                  }
                >
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventDate}>{event.date_label}</Text>
                </TouchableOpacity>
              ))
            : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: 14,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: spacing.cardPadding,
    },
    subRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.cardPadding + spacing.sm,
      paddingVertical: 10,
    },
    eventTitle: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
      flex: 1,
    },
    eventDate: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
      flexShrink: 0,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
    },
  });
}
