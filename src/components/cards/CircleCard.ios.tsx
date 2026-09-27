import React from "react";
import { Host, VStack, HStack, Text, Label, Image, Button, Spacer } from "@expo/ui/swift-ui";
import { padding, glassEffect } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { type SFSymbol } from "sf-symbols-typescript";
import { useLanguage } from "../../i18n/LanguageContext";

/**
 * Native SwiftUI CircleCard (iOS), rendered via `@expo/ui`.
 *
 * Same name / props as `CircleCard.tsx` (the Android/web fallback). Custom
 * glass/blur styling is replaced by `@expo/ui`'s native `glassEffect()` default
 * and SF Symbols / system typography.
 */

type MemberStatus = "owner" | "active" | "requested" | "invited" | null;

type CircleCardProps = {
  name: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "private" | "request";
  memberCount: number;
  circleCount?: number;
  eventCount?: number;
  memberStatus: MemberStatus;
  location?: string | null;
  organizer?: string | null;
  pendingRequests?: number;
  hasNewActivity?: boolean;
  onPress?: () => void;
  onJoinPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

const VISIBILITY_SYMBOL: Record<CircleCardProps["visibility"], SFSymbol> = {
  public: "globe",
  private: "lock",
  request: "hand.raised",
};

const CARD_GLASS = glassEffect({ glass: { variant: "regular" }, shape: "rectangle" });
const PILL_GLASS = glassEffect({ glass: { variant: "clear" }, shape: "capsule" });
const PILL_PAD = padding({ top: 4, bottom: 4, leading: 10, trailing: 10 });

export function CircleCard({
  name,
  description,
  category,
  visibility,
  memberCount,
  circleCount,
  eventCount = 0,
  memberStatus,
  location,
  organizer,
  pendingRequests = 0,
  hasNewActivity = false,
  onPress,
  onJoinPress,
  onActionPress,
  actionIcon,
}: CircleCardProps) {
  const { t } = useLanguage();

  return (
    <Host matchContents style={{ width: "100%", marginBottom: 12 }}>
      <VStack alignment="leading" spacing={6} onPress={onPress} modifiers={[padding({ all: 16 }), CARD_GLASS]}>
        <HStack alignment="center">
          <Text size={18} weight="medium" lineLimit={1}>{name}</Text>
          <Spacer />
          {hasNewActivity ? <Image systemName="bell.fill" size={12} /> : null}
          {category ? (
            <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{category.toUpperCase()}</Text>
          ) : null}
          {actionIcon && onActionPress ? (
            <Image systemName="ellipsis" size={14} onPress={onActionPress} />
          ) : null}
        </HStack>

        {description ? <Text size={13} lineLimit={2}>{description}</Text> : null}

        <HStack alignment="center">
          <VStack alignment="leading" spacing={4}>
            {circleCount != null ? (
              <Label
                title={`${circleCount} ${circleCount === 1 ? t.circles.typeCircle.toLowerCase() : t.circles.circlesTab.toLowerCase()}`}
                systemImage="circle"
              />
            ) : null}
            <Label
              title={`${eventCount} ${eventCount === 1 ? t.circles.typeEvent.toLowerCase() : t.circles.eventsTab.toLowerCase()}`}
              systemImage="calendar"
            />
            <Label
              title={`${memberCount} ${memberCount === 1 ? t.circles.typeMember.toLowerCase() : t.circles.members.toLowerCase()}`}
              systemImage="person.2"
            />
            {location ? <Label title={location} systemImage="mappin.and.ellipse" /> : null}
            {organizer ? <Label title={organizer} systemImage="person" /> : null}
          </VStack>

          <Spacer />

          <HStack alignment="center" spacing={6}>
            <Image systemName={VISIBILITY_SYMBOL[visibility]} size={14} />
            {memberStatus === "owner" ? (
              <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{t.circles.typeOwner}</Text>
            ) : null}
            {memberStatus === "owner" && pendingRequests > 0 ? (
              <Text size={11} weight="bold" modifiers={[PILL_PAD, PILL_GLASS]}>{String(pendingRequests)}</Text>
            ) : null}
            {memberStatus === "active" ? (
              <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{t.circles.typeMember}</Text>
            ) : null}
            {memberStatus === "requested" ? (
              <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{t.circles.requested}</Text>
            ) : null}
            {memberStatus === "invited" ? (
              <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{t.circles.badgeInvited}</Text>
            ) : null}
            {memberStatus === null && visibility !== "private" ? (
              <Button variant="bordered" onPress={onJoinPress}>{t.circles.typeJoin}</Button>
            ) : null}
          </HStack>
        </HStack>
      </VStack>
    </Host>
  );
}
