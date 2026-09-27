import React from "react";
import { Host, VStack, HStack, Text, Label, Image, Spacer } from "@expo/ui/swift-ui";
import { padding, glassEffect } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../i18n/LanguageContext";

/**
 * Native SwiftUI EventCard (iOS), rendered via `@expo/ui`.
 *
 * Same name / props as the React Native `EventCard.tsx` (which Metro keeps as
 * the Android/web fallback). The custom `expo-blur` + BackgroundContext glass
 * styling is replaced by `@expo/ui`'s native `glassEffect()` (SwiftUI's default
 * Liquid Glass) and system typography/colors — no custom hex, no BlurView.
 */

type EventCardProps = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  going: number;
  maybe: number;
  maxParticipants?: number | null;
  isActivity?: boolean | null;
  category?: string | null;
  rsvp?: "going" | "maybe";
  isOwner?: boolean;
  circleName?: string | null;
  noteCount?: number;
  hasNewActivity?: boolean;
  onPress?: () => void;
  onSharePress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

function formatDateWithYear(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return trimmed;
  if (/\b\d{4}\b/.test(trimmed) || /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} ${new Date().getFullYear()}`;
}

// Native Liquid Glass surface — the @expo/ui default that replaces the app's
// custom blur/glass. `regular` for the card, `clear` for the small pills.
const CARD_GLASS = glassEffect({ glass: { variant: "regular" }, shape: "rectangle" });
const PILL_GLASS = glassEffect({ glass: { variant: "clear" }, shape: "capsule" });
const PILL_PAD = padding({ top: 3, bottom: 3, leading: 10, trailing: 10 });

export function EventCard({
  title,
  organizer,
  date,
  time,
  location,
  going,
  maybe,
  maxParticipants,
  isActivity,
  category,
  rsvp,
  isOwner = false,
  circleName,
  noteCount = 0,
  onPress,
  onSharePress,
  onActionPress,
  actionIcon,
}: EventCardProps) {
  const { t } = useLanguage();
  const isFilled = maxParticipants != null && going >= maxParticipants;
  const dateWithYear = formatDateWithYear(date);

  const badge = isOwner
    ? t.events.badgeHost
    : rsvp === "going"
      ? t.events.badgeGoing
      : rsvp === "maybe"
        ? t.events.badgeMaybe
        : isFilled
          ? "Filled"
          : null;

  return (
    <Host matchContents style={{ width: "100%", marginBottom: 12 }}>
      <VStack alignment="leading" spacing={8} onPress={onPress} modifiers={[padding({ all: 16 }), CARD_GLASS]}>
        <HStack alignment="firstTextBaseline">
          <Text size={18} weight="medium">{title}</Text>
          <Spacer />
          {badge ? (
            <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{badge.toUpperCase()}</Text>
          ) : null}
          {actionIcon && onActionPress ? (
            <Image systemName="ellipsis" size={14} onPress={onActionPress} />
          ) : null}
        </HStack>

        <Text size={13}>{`${t.events.by} ${organizer}`}</Text>

        {category ? (
          <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{category.toUpperCase()}</Text>
        ) : null}

        <Label title={`${dateWithYear} · ${time}`} systemImage="calendar" />
        <Label title={location} systemImage="mappin.and.ellipse" />
        {circleName ? <Label title={circleName} systemImage="person.2" /> : null}

        <HStack spacing={8}>
          {isActivity ? (
            <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>ACTIVITY</Text>
          ) : null}
          <Text size={13}>{`${going} ${t.events.goingLabel}   ${maybe} ${t.events.maybeLabel}`}</Text>
          <Spacer />
          {onSharePress ? <Image systemName="square.and.arrow.up" size={16} onPress={onSharePress} /> : null}
          {noteCount > 0 ? <Text size={12}>{String(noteCount)}</Text> : null}
          <Image systemName="bubble.left" size={16} />
        </HStack>
      </VStack>
    </Host>
  );
}
