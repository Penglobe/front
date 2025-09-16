import HeaderBar from "@components/HeaderBar";
import React, { use, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Images } from "@constants/Images";
import MissionSection from "@pages/home/MissionSection";
import Modal from "@components/Modal";
import MainButton from "@components/MainButton";
import { useRouter } from "expo-router";
import { apiFetch, logout } from "@services/authService";
import CustomAlert from "@components/CustomAlert";

export default function MissionScreen() {
  const [windows, setWindows] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [claimInfo, setClaimInfo] = useState(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/missions/windows");

      const json = await res.json();
      if (res.ok && json?.data) setWindows(json.data);
      else throw new Error(json?.message || "로드 실패");
    } catch (e) {
      setAlertTitle("불러오기 실패");
      setAlertMessage(e?.message ?? "다시 시도해주세요.");
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onClaim = async (metric, target, rewardPointsFromSlot) => {
    try {
      const res = await apiFetch(
        `/missions/claim?metric=${metric}&target=${target}`,
        { method: "POST" }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "수령 실패");

      const reward =
        rewardPointsFromSlot ??
        windows?.[metric]?.find?.((s) => Number(s.target) === Number(target))
          ?.rewardPoints ??
        target * 10;

      setClaimInfo({ metric, target, rewardPoints: reward });
      await load();
      setOpen(true);
    } catch (e) {
      setAlertTitle("수령 실패");
      setAlertMessage(e?.message ?? "다시 시도해주세요.");
      setAlertVisible(true);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* 배경 */}
      <Images.BgQuiz
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* 규정: 페이지 맨 위 헤더 */}
      <HeaderBar title="환경 미션" />

      {/* 규정: 헤더 아래는 px-pageX 래퍼로 감싸기 */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="px-pageX py-md">
          {/* 안내 카드 */}
          <View
            className="bg-[#D9D9D9] rounded-2xl px-md py-lg shadow-md"
            style={{ elevation: 4 }}
          >
            <View className="flex-row items-start">
              <Images.Notice width={18} height={20} />

              <View className="flex-1 pl-sm">
                <Text className="text-black font-sf-b text-h3 leading-[20px]">
                  누적 탄소 절감량을 확인하세요.
                </Text>
                <Text className="text-black font-sf-b text-caption leading-[20px] mt-xs">
                  출석 미션은 매달 새로 시작됩니다.{"\n"}
                  이전 보상을 수령해야 다음 보상이 수령가능합니다.
                </Text>
              </View>
            </View>
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

          {/* 한달 출석 */}
          {windows?.ATTEND_MONTH_DAYS && (
            <MissionSection
              title="출석일"
              icon={<Images.Snow width={40} height={40} />}
              slots={windows.ATTEND_MONTH_DAYS}
              onClaim={onClaim}
              unit="일"
              simpleBar
            />
          )}
        </View>
      </ScrollView>

      {/* ✅ 모달: 수령 포인트 안내 */}
      <Modal
        visible={open}
        onClose={async () => {
          setOpen(false);
          setClaimInfo(null);
        }}
      >
        <Text className="text-black text-h2 font-sf-b mb-xs text-center">
          보상 지급 완료!
        </Text>
        <View className="w-full flex-row items-center justify-center">
          <Text className="text-green font-sf-b text-h2">
            {claimInfo?.rewardPoints ?? 0}
          </Text>

          <Images.Ice width={28} height={28} />

          <Text className="text-black font-sf-b text-h2">을 받았어요.</Text>
        </View>
        <View className="items-center my-3">
          <Images.Ipa2 width={150} height={150} />
        </View>
        <MainButton label="확인" onPress={() => setOpen(false)} />
      </Modal>

      {/* 하단 고정 버튼들 */}
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
        }}
      ></View>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}
