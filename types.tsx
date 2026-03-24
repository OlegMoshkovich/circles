import { NativeStackScreenProps } from "@react-navigation/native-stack";

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type EventDetailParams = {
  id: string;
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  going: number;
  maybe: number;
  rsvp?: "going" | "maybe";
  description: string;
  created_by?: string | null;
};

export type PromptDetailParams = {
  title: string;
  badge: string;
  meta: string;
  description: string;
  quote: string;
  attribution: string;
};

export type CircleDetailParams = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'request' | 'private';
  owner_id: string;
  member_count: number;
};

export type RootStackParamList = {
  Root: undefined;
  Home: undefined;
  SignUp: undefined;
  SignIn: undefined;
  MyProfile: undefined;
  VerifyCode: undefined;
  EventDetail: EventDetailParams;
  PromptDetail: PromptDetailParams;
  CircleDetail: CircleDetailParams;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;
