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
import { useLanguage } from "../src/i18n/LanguageContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATIC_EVENTS = [
  { organizer: "Sophie Martin", date: "Dec 18", time: "7:00 AM",  location: "Lake",           going: 5, maybe: 2, rsvp: "going" as const },
  { organizer: "Lucas Weber",   date: "Dec 19", time: "3:00 PM",  location: "Common Room",    going: 4, maybe: 1, rsvp: undefined },
  { organizer: "Emma Schneider",date: "Dec 21", time: "10:00 AM", location: "Rooftop Garden", going: 6, maybe: 3, rsvp: "maybe" as const },
];

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();

  return (
    <ScreenLayout
      header={
        <NavbarTitle
          title={t.nav.events}
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
      <TextBlock subtitle={t.events.subtitle} />
      {t.events.items.map((item, i) => {
        const s = STATIC_EVENTS[i];
        return (
          <EventCard
            key={i}
            title={item.title}
            organizer={s.organizer}
            date={s.date}
            time={s.time}
            location={s.location}
            going={s.going}
            maybe={s.maybe}
            rsvp={s.rsvp}
            onPress={() =>
              navigation.navigate("EventDetail", {
                title: item.title,
                organizer: s.organizer,
                date: s.date,
                time: s.time,
                location: s.location,
                going: s.going,
                maybe: s.maybe,
                rsvp: s.rsvp,
                description: item.description,
              })
            }
          />
        );
      })}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: colors.iconbBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
