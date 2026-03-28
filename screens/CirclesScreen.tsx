import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUser } from "@clerk/clerk-expo";
import { RootStackParamList } from "../types";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { TextBlock } from "../src/components/blocks/TextBlock";
import { CircleCard } from "../src/components/cards/CircleCard";
import { CreateCircleModal, NewCircleData } from "../src/components/modals/CreateCircleModal";
import { colors } from "../src/theme/colors";
import { useLanguage } from "../src/i18n/LanguageContext";
import { supabase, Circle } from "../lib/supabase";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MemberStatusMap = Record<string, "owner" | "active" | "requested">;
type PendingRequestsMap = Record<string, number>;

export default function CirclesScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { user } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [circles, setCircles] = useState<(Circle & { member_count: number })[]>([]);
  const [memberStatusMap, setMemberStatusMap] = useState<MemberStatusMap>({});
  const [pendingRequestsMap, setPendingRequestsMap] = useState<PendingRequestsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchCircles = useCallback(async () => {
    setLoading(true);

    const [circlesResult, membershipsResult] = await Promise.all([
      supabase
        .from("circles")
        .select("*, circle_members(count)")
        .order("created_at", { ascending: false }),
      user
        ? supabase
            .from("circle_members")
            .select("circle_id, role, status")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Build membership map first so we can filter private circles
    const map: MemberStatusMap = {};
    if (!membershipsResult.error && membershipsResult.data) {
      for (const m of membershipsResult.data as any[]) {
        map[m.circle_id] = m.role === "owner" ? "owner" : m.status;
      }
      setMemberStatusMap(map);
    }

    if (!circlesResult.error && circlesResult.data) {
      const mapped = circlesResult.data
        .map((row: any) => ({
          ...row,
          member_count: row.circle_members?.[0]?.count ?? 0,
        }))
        // Hide private circles unless the user is already a member/owner
        .filter((circle: any) =>
          circle.visibility !== "private" || map[circle.id] != null
        );
      setCircles(mapped);
    }

    if (!membershipsResult.error && membershipsResult.data) {

      // Fetch pending request counts for circles the current user owns
      const ownedIds = Object.entries(map).filter(([, v]) => v === "owner").map(([k]) => k);
      if (ownedIds.length > 0) {
        const { data: pending } = await supabase
          .from("circle_members")
          .select("circle_id")
          .in("circle_id", ownedIds)
          .eq("status", "requested");
        if (pending) {
          const reqMap: PendingRequestsMap = {};
          for (const row of pending as any[]) {
            reqMap[row.circle_id] = (reqMap[row.circle_id] ?? 0) + 1;
          }
          setPendingRequestsMap(reqMap);
        }
      } else {
        setPendingRequestsMap({});
      }
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchCircles();
      // Keep this user's profile up to date so others can see their name
      if (user) {
        const displayName = user.fullName ?? user.firstName ?? null;
        if (displayName) {
          supabase.from("user_profiles").upsert(
            { user_id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          ).then(() => {});
        }
      }
    }, [fetchCircles, user])
  );

  async function handleSave(data: NewCircleData) {
    if (!user) throw new Error("Not signed in.");
    const { data: inserted, error } = await supabase
      .from("circles")
      .insert({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        visibility: data.visibility,
        location: data.location || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const memberPayload: any = {
      circle_id: inserted.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    };

    // Try with display_name first; fall back without it if the column doesn't exist yet
    const { error: memberError } = await supabase.from("circle_members").insert({
      ...memberPayload,
      display_name: user.fullName ?? user.firstName ?? user.username ?? null,
    });

    if (memberError) {
      await supabase.from("circle_members").insert(memberPayload);
    }

    setModalVisible(false);
    fetchCircles();
  }

  return (
    <>
      <ScreenLayout
        header={
          <NavbarTitle
            title={t.nav.circles}
            rightElement={
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={16} color={colors.card} />
              </TouchableOpacity>
            }
          />
        }
      >
        <TextBlock subtitle={t.circles.subtitle} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : (
          circles.map((circle) => (
            <CircleCard
              key={circle.id}
              name={circle.name}
              description={circle.description}
              category={circle.category}
              visibility={circle.visibility}
              memberCount={circle.member_count}
              memberStatus={memberStatusMap[circle.id] ?? null}
              pendingRequests={pendingRequestsMap[circle.id] ?? 0}
              onPress={() =>
                navigation.navigate("CircleDetail", {
                  id: circle.id,
                  name: circle.name,
                  description: circle.description,
                  visibility: circle.visibility,
                  owner_id: circle.owner_id,
                  member_count: circle.member_count,
                })
              }
            />
          ))
        )}
      </ScreenLayout>

      <CreateCircleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: colors.iconbBg,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    paddingVertical: 12,
    alignItems: "center",
  },
});
