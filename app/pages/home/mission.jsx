import { useRouter } from "expo-router";
import MainButton from "@components/MainButton";
import HeaderBar from "@components/HeaderBar";
import React, { useCallback, useEffect, useState } from "react";
import { Text, ScrollView, RefreshControl, Alert } from "react-native";
import { Images } from "@constants/Images";
import MissionSection from "./MissionSection";


// TODO: 실제 호스트로 교체
const API_BASE = "http://192.168.0.149:8080";

const USER_ID = 1; // 임시. 로그인 붙으면 토큰(or secure store)에서 주입

export default function MissionScreen() {
  const [windows, setWindows] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/missions/windows`, {
        headers: { "X-User-Id": String(USER_ID) },
      });
      const json = await res.json();
      if (res.ok && json?.data) setWindows(json.data);
      else throw new Error(json?.message || "로드 실패");
    } catch (e) {
      Alert.alert("불러오기 실패", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onClaim = async (metric, target) => {
    try {
      const res = await fetch(
        `${API_BASE}/missions/claim?metric=${metric}&target=${target}`,
        { method: "POST", headers: { "X-User-Id": String(USER_ID) } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "수령 실패");
      await load(); // 수령 후 새로고침
    } catch (e) {
      Alert.alert("수령 실패", e.message);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <HeaderBar title="환경 미션"/>
      <ScrollView
        className="flex-1 px-pageX"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* 안내 카드 */}
        <View
          className="bg-white rounded-2xl px-4 py-4 shadow-md"
          style={{ elevation: 4 }}
        >
          <Text className="text-black font-extrabold">탄소 절감량 미션</Text>
          <Text className="text-[#858494] mt-1">누적된 탄소 절감량이다</Text>
        </View>

        {/* 환경걸음 */}
        {windows?.WALK_CO2_KG && (
          <MissionSection
            title="환경걸음 탄소절감량"
            icon={<Images.Walk width={40} height={40} />}
            slots={windows.WALK_CO2_KG}
            onClaim={onClaim}
          />
        )}

        {/* 식단 */}
        {windows?.DIET_CO2_KG && (
          <MissionSection
            title="식단 탄소절감량"
            icon={<Images.Diet width={40} height={40} />}
            slots={windows.DIET_CO2_KG}
            onClaim={onClaim}
            accent="yellow"
          />
        )}

        {/* 한달 출석 (현재 윈도우 형태 그대로 표시) */}
        {windows?.ATTEND_MONTH_DAYS && (
          <MissionSection
            title="출석일"
            icon={<Images.Snow width={40} height={40} />}
            slots={windows.ATTEND_MONTH_DAYS}
            onClaim={onClaim}
            unit="일"
            simpleBar // 하단바 형태로 렌더(옵션)
          />
        )}
      </ScrollView>
    </View>
  );
}
