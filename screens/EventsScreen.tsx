import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PageContainer } from "../src/components/layout/PageContainer";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { EventCard } from "../src/components/cards/EventCard";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";

const EVENTS = [
  {
    title: "Morning Lake Swim",
    organizer: "Sophie Martin",
    date: "Dec 18 · 7:00 AM",
    location: "Lake",
    going: 5,
    maybe: 2,
    rsvp: "going" as const,
  },
  {
    title: "Afternoon Coffee",
    organizer: "Lucas Weber",
    date: "Dec 19 · 3:00 PM",
    location: "Common Room",
    going: 4,
    maybe: 1,
    rsvp: undefined,
  },
  {
    title: "Weekend Garden Work",
    organizer: "Emma Schneider",
    date: "Dec 21 · 10:00 AM",
    location: "Rooftop Garden",
    going: 6,
    maybe: 3,
    rsvp: "maybe" as const,
  },
];

export default function EventsScreen() {
  return (
    <PageContainer>
      <NavbarTitle
        title="Events"
        rightElement={
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color={colors.card} />
          </TouchableOpacity>
        }
      />
      <TextBlock subtitle="Gentle opportunities for connection—\nsmall, meaningful gatherings" />
      {EVENTS.map((event, i) => (
        <EventCard
          key={i}
          title={event.title}
          organizer={event.organizer}
          date={event.date}
          location={event.location}
          going={event.going}
          maybe={event.maybe}
          rsvp={event.rsvp}
        />
      ))}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
});
