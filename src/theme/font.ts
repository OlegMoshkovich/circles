import { createElement, Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Platform, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FontOption = "serif" | "sans";

const STORAGE_KEY = "profile_font_v1";
const SANS_FAMILY = Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif";

let fontOption: FontOption = "serif";
let revision = 0;
let appliedRevision = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getFontOption(): FontOption {
  return fontOption;
}

export function setFontOption(next: FontOption) {
  if (next === fontOption) return;
  fontOption = next;
  revision += 1;
  void AsyncStorage.setItem(STORAGE_KEY, next);
  emit();
  queueMicrotask(() => {
    appliedRevision = revision;
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isSerifFamily(family: string) {
  return family.startsWith("Lora") || family.startsWith("Cormorant");
}

StyleSheet.setStyleAttributePreprocessor("fontFamily", (value: unknown) => {
  if (typeof value !== "string") return value;
  if (fontOption === "sans" && isSerifFamily(value)) return SANS_FAMILY;
  return value;
});

type FontAttribute = { process?: (value: unknown) => unknown; diff?: (prev: unknown, next: unknown) => boolean };
const styleAttributes = require("react-native/Libraries/Components/View/ReactNativeStyleAttributes")
  .default as { fontFamily?: boolean | FontAttribute };
const fontFamilyAttribute = styleAttributes.fontFamily;
if (fontFamilyAttribute && typeof fontFamilyAttribute === "object") {
  fontFamilyAttribute.diff = () => revision !== appliedRevision;
}

export function useFont() {
  const font = useSyncExternalStore(subscribe, getFontOption, getFontOption);
  return { font, setFont: setFontOption };
}

export function FontProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "sans" || val === "serif") setFontOption(val);
    });
  }, []);
  return children;
}

// Remount the screens when the face changes. Style objects keep the same
// identity, so an in-place update never reaches the text renderer.
export function FontScope({ children }: { children: ReactNode }) {
  const { font } = useFont();
  return createElement(Fragment, { key: font }, children);
}
