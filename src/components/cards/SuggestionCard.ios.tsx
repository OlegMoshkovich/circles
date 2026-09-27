import React from "react";
import { Host, VStack, HStack, Text, Spacer } from "@expo/ui/swift-ui";
import { padding, glassEffect } from "@expo/ui/swift-ui/modifiers";

/**
 * Native SwiftUI SuggestionCard (iOS), rendered via `@expo/ui`.
 *
 * Same name / props as `SuggestionCard.tsx` (the Android/web fallback). Custom
 * glass/blur styling is replaced by `@expo/ui`'s native `glassEffect()` default
 * and system typography.
 */

type SuggestionCardProps = {
  title: string;
  metaLeft?: string;
  metaRight?: string;
  badge?: string;
  description: string;
  onPress?: () => void;
};

const CARD_GLASS = glassEffect({ glass: { variant: "regular" }, shape: "rectangle" });
const PILL_GLASS = glassEffect({ glass: { variant: "clear" }, shape: "capsule" });
const PILL_PAD = padding({ top: 3, bottom: 3, leading: 8, trailing: 8 });

export function SuggestionCard({
  title,
  metaLeft,
  metaRight,
  badge,
  description,
  onPress,
}: SuggestionCardProps) {
  const meta =
    metaLeft && metaRight ? `${metaLeft} · ${metaRight}` : metaLeft ?? metaRight ?? "";

  return (
    <Host matchContents style={{ width: "100%", marginBottom: 12 }}>
      <VStack alignment="leading" spacing={6} onPress={onPress} modifiers={[padding({ all: 16 }), CARD_GLASS]}>
        <HStack alignment="center">
          <Text size={17} weight="medium" lineLimit={1}>{title}</Text>
          <Spacer />
          {badge != null ? (
            <Text size={11} weight="semibold" modifiers={[PILL_PAD, PILL_GLASS]}>{badge.toUpperCase()}</Text>
          ) : null}
        </HStack>
        {meta.length > 0 ? <Text size={12}>{meta}</Text> : null}
        <Text size={14}>{description}</Text>
      </VStack>
    </Host>
  );
}
