import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { EventCard } from "../src/components/cards/EventCard";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EVENTS = [
  {
    title: "Morning Lake Swim",
    organizer: "Sophie Martin",
    date: "Dec 18",
    time: "7:00 AM",
    location: "Lake",
    going: 5,
    maybe: 2,
    rsvp: "going" as const,
    description:
      "A refreshing early morning swim at the lake. All levels welcome—bring a towel and good energy.",
  },
  {
    title: "Afternoon Coffee",
    organizer: "Lucas Weber",
    date: "Dec 19",
    time: "3:00 PM",
    location: "Common Room",
    going: 4,
    maybe: 1,
    rsvp: undefined,
    description:
      "An informal drop-in coffee hour in the common room. Come for a chat or bring something to work on.",
  },
  {
    title: "Weekend Garden Work",
    organizer: "Emma Schneider",
    date: "Dec 21",
    time: "10:00 AM",
    location: "Rooftop Garden",
    going: 6,
    maybe: 3,
    rsvp: "maybe" as const,
    description:
      "Let's prepare the garden beds for spring. All skill levels welcome.",
  },
];

const EVENTS_SUBTITLE =
  "Gentle opportunities for connection—\nsmall, meaningful gatherings";

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScreenLayout
      header={
        <NavbarTitle
          title="Events"
          rightElement={
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={16} color={colors.card} />
            </TouchableOpacity>
          }
        />
      }
    >
      <TextBlock subtitle={EVENTS_SUBTITLE} />
      {EVENTS.map((event, i) => (
        <EventCard
          key={i}
          title={event.title}
          organizer={event.organizer}
          date={event.date}
          time={event.time}
          location={event.location}
          going={event.going}
          maybe={event.maybe}
          rsvp={event.rsvp}
          onPress={() =>
            navigation.navigate("EventDetail", {
              title: event.title,
              organizer: event.organizer,
              date: event.date,
              time: event.time,
              location: event.location,
              going: event.going,
              maybe: event.maybe,
              rsvp: event.rsvp,
              description: event.description,
            })
          }
        />
      ))}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
});
