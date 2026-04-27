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
  image_url?: string | null;
  max_participants?: number | null;
  contact_info?: string | null;
  price_info?: string | null;
  created_by?: string | null;
  circleName?: string | null;
  circle_id?: string | null;
  hasNewActivity?: boolean;
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
  visibility: 'public' | 'private' | 'request';
  owner_id: string;
  member_count: number;
  organizer?: string | null;
};

export type RootStackParamList = {
  Root: undefined;
  Home: undefined;
  SignUp: undefined;
  SignIn: undefined;
  MyProfile: undefined;
  VerifyCode: undefined;
  ForgotPassword: { email?: string };
  EventDetail: EventDetailParams;
  PromptDetail: PromptDetailParams;
  CircleDetail: CircleDetailParams;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;
