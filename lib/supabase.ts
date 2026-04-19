import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Event = {
  id: string;
  title: string;
  organizer: string;
  date_label: string;
  time_label: string;
  duration_minutes?: number | null;
  location: string;
  description: string;
  image_url?: string | null;
  max_participants?: number | null;
  contact_info?: string | null;
  price_info?: string | null;
  going: number;
  maybe: number;
  created_at: string;
  circle_id: string | null;
  visibility: 'public' | 'circle';
  created_by: string | null;
};

export type Circle = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  visibility: 'public' | 'request' | 'private';
  category: string | null;
  location: string | null;
  organizer: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
};

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
  user_type: string | null;
  updated_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: {
    event_id?: string;
    event_title?: string;
    circle_id?: string;
    circle_name?: string;
    inviter_name?: string;
    invitee_id?: string;
  } | null;
  read: boolean;
  created_at: string;
};

export type EventNote = {
  id: string;
  event_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

export type CircleNote = {
  id: string;
  circle_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

export type CircleMember = {
  id: string;
  circle_id: string;
  user_id: string;
  display_name: string | null;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'requested' | 'invited';
  joined_at: string;
};
