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
  circleId: string;
  circleName: string;
};

export function CircleInviteModal({ visible, onClose, circleId, circleName }: Props) {
  const { user } = useUser();
  const [candidates, setCandidates] = useState<{ user_id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alreadyInvited, setAlreadyInvited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    setSelected(new Set());
    setAlreadyInvited(new Set());

    // Fetch all known users, existing members, and pending invitations in parallel
    Promise.all([
      supabase.from("user_profiles").select("user_id, display_name"),
      supabase.from("circle_members").select("user_id").eq("circle_id", circleId),
      supabase
        .from("notifications")
        .select("data")
        .eq("type", "circle_invitation")
        .filter("data->>circle_id", "eq", circleId)
        .eq("read", false),
    ]).then(([profilesResult, membersResult, notifsResult]) => {
      const existingMemberIds = new Set(
        (membersResult.data ?? []).map((m: any) => m.user_id)
      );
      // Collect already-invited user IDs from pending notifications
      const invitedIds = new Set<string>(
        (notifsResult.data ?? [])
          .map((n: any) => n.data?.invitee_id)
          .filter(Boolean)
      );
      setAlreadyInvited(invitedIds);
      setSelected(new Set(invitedIds));

      // Deduplicate by user_id in case of stale duplicate profile rows
      const seen = new Set<string>();
      const list = (profilesResult.data ?? [] as UserProfile[])
        .filter((p: any) => {
          if (existingMemberIds.has(p.user_id) || p.user_id === user.id) return false;
          if (seen.has(p.user_id)) return false;
          seen.add(p.user_id);
          return true;
        })
        .map((p: any) => ({
          user_id: p.user_id,
          name: p.display_name ?? p.user_id,
        }));
      setCandidates(list);
      setLoading(false);
    });
  }, [visible, user, circleId]);

  function toggle(userId: string) {
    if (alreadyInvited.has(userId)) return; // already invited, cannot deselect
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
    // Only send to newly selected users, not those already invited
    const newlySelected = Array.from(selected).filter((id) => !alreadyInvited.has(id));
    if (newlySelected.length === 0) { setSending(false); onClose(); return; }
    const inserts = newlySelected.map((inviteeId) => ({
      user_id: inviteeId,
      type: "circle_invitation",
      title: `You've been invited to ${circleName}`,
      body: `${inviterName} invited you to join this circle`,
      data: {
        circle_id: circleId,
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
            <Text style={styles.headerTitle}>Invite to Circle</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : candidates.length === 0 ? (
            <Text style={styles.emptyText}>No users available to invite.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {candidates.map((c) => {
                const isSelected = selected.has(c.user_id);
                const isAlreadyInvited = alreadyInvited.has(c.user_id);
                return (
                  <TouchableOpacity
                    key={c.user_id}
                    style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                    onPress={() => toggle(c.user_id)}
                    activeOpacity={isAlreadyInvited ? 1 : 0.75}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(c.name)}</Text>
                    </View>
                    <Text style={[styles.memberName, isSelected && styles.memberNameSelected]}>
                      {c.name}
                    </Text>
                    {isAlreadyInvited ? (
                      <View style={styles.invitedBadge}>
                        <Text style={styles.invitedBadgeText}>INVITED</Text>
                      </View>
                    ) : isSelected ? (
                      <Ionicons name="checkmark" size={16} color={colors.card} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {(() => {
            const newCount = Array.from(selected).filter((id) => !alreadyInvited.has(id)).length;
            const disabled = newCount === 0 || sending;
            return (
              <TouchableOpacity
                style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={disabled}
              >
                <Text style={styles.sendButtonText}>
                  {sending
                    ? "Sending…"
                    : newCount > 0
                    ? `Invite ${newCount} ${newCount === 1 ? "person" : "people"}`
                    : "Select people to invite"}
                </Text>
              </TouchableOpacity>
            );
          })()}
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
  invitedBadge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  invitedBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
});
