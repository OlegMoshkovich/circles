import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "../types";

// Shared navigation ref so non-component code (e.g. the push-notification tap
// handler in App.tsx) can navigate without a hook/context.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
