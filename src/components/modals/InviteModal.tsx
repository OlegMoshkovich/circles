import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { colors } from "../../theme/colors";
import { supabase, UserProfile } from "../../../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  circleId: string;
  circleName: string;
};

export function InviteModal({ visible, onClose, eventId, eventTitle, circleId, circleName }: Props) {
  const { user } = useUser();
  const [members, setMembers] = useState<{ user_id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    setSelected(new Set());

    supabase
      .from("circle_members")
      .select("user_id, display_name")
      .eq("circle_id", circleId)
      .eq("status", "active")
      .neq("user_id", user.id)
      .then(async ({ data: memberData }) => {
        if (!memberData) { setLoading(false); return; }

        const userIds = memberData.map((m: any) => m.user_id);

        // Resolve display names from user_profiles
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const profileMap: Record<string, string> = {};
        for (const p of (profiles ?? []) as UserProfile[]) {
          if (p.display_name) profileMap[p.user_id] = p.display_name;
        }

        // Exclude members who already have an RSVP for this event
        const { data: rsvps } = await supabase
          .from("event_rsvps")
          .select("user_id")
          .eq("event_id", eventId);

        const rsvpSet = new Set((rsvps ?? []).map((r: any) => r.user_id));

        const eligible = memberData
          .filter((m: any) => !rsvpSet.has(m.user_id))
          .map((m: any) => ({
            user_id: m.user_id,
            name: profileMap[m.user_id] ?? m.display_name ?? m.user_id,
          }));

        setMembers(eligible);
        setLoading(false);
      });
  }, [visible, user, circleId, eventId]);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSend() {
    if (!user || selected.size === 0 || sending) return;
    setSending(true);

    const inviterName = user.fullName ?? user.firstName ?? "Someone";
    const inserts = Array.from(selected).map((inviteeId) => ({
      user_id: inviteeId,
      type: "event_invitation",
      title: `You're invited to ${eventTitle}`,
      body: `${inviterName} invited you · ${circleName}`,
      data: {
        event_id: eventId,
        event_title: eventTitle,
        circle_name: circleName,
        inviter_name: inviterName,
        invitee_id: inviteeId,
      },
      read: false,
    }));

    await supabase.from("notifications").insert(inserts);
    setSending(false);
    onClose();
  }

  const initials = (name: string) => {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invite Members</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>
              All circle members have already been invited or are attending.
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {members.map((m) => {
                const isSelected = selected.has(m.user_id);
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                    onPress={() => toggle(m.user_id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(m.name)}</Text>
                    </View>
                    <Text style={[styles.memberName, isSelected && styles.memberNameSelected]}>
                      {m.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={colors.card} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.sendButton, (selected.size === 0 || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={selected.size === 0 || sending}
          >
            <Text style={styles.sendButtonText}>
              {sending
                ? "Sending…"
                : selected.size > 0
                ? `Invite ${selected.size} ${selected.size === 1 ? "person" : "people"}`
                : "Select people to invite"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_300Light",
    color: colors.text,
  },
  loader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 24,
    textAlign: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    backgroundColor: colors.card,
  },
  memberRowSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textMuted,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  memberNameSelected: {
    color: colors.card,
  },
  sendButton: {
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
