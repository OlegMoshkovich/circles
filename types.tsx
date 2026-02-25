import { NativeStackScreenProps } from "@react-navigation/native-stack";

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type EventDetailParams = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  going: number;
  maybe: number;
  rsvp?: "going" | "maybe";
  description: string;
};

export type RootStackParamList = {
  Root: undefined;
  Home: undefined;
  SignUp: undefined;
  SignIn: undefined;
  MyProfile: undefined;
  VerifyCode: undefined;
  EventDetail: EventDetailParams;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;
