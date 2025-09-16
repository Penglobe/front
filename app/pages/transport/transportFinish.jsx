// pages/transport/transportFinish.jsx
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  BackHandler,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Ipa from "@assets/images/character/ipa-face.svg";
import IpaTori from "@assets/images/character/ipa-tori-1.svg";
import Ice from "@assets/icons/ice.svg";

export default function TransportFinish() {
  const router = useRouter();
  const navigation = useNavigation();

  const [showInfo, setShowInfo] = useState(false);
  const [result, setResult] = useState(null);
  const navigatingRef = useRef(false);

  // ✅ 항상 AsyncStorage에서 finishResult 불러오기
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@transport/finishResult");
        if (raw) setResult(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // 불필요한 키 정리
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.multiRemove([
          "@transport/totalDistanceM",
          "@transport/lastCoord",
          "@transport/speedWindow",
          "@transport/inRadiusSince",
          "@transport/jumpStrikes",
          "@transport/stopped",
          "@transport/stopKind",
          "@transport/stopReason",
          "@transport/isActive",
          "@transport/id",
          "@transport/dest",
        ]);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerBackButtonMenuEnabled: false,
    });
  }, [navigation]);

  const goHome = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    router.replace("/(tabs)/home");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = navigation.addListener("beforeRemove", (e) => {
        if (navigatingRef.current) return;
        e.preventDefault();
      });
      return sub;
    }, [navigation])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (navigatingRef.current) return true;
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>결과 불러오는 중...</Text>
      </View>
    );
  }

  const {
    distanceM = 0,
    co2Kg = 0,
    durationM = 0,
    points = 0,
    mode = "WALK",
  } = result;
  const carCo2 = distanceM ? (parseFloat(distanceM) * 0.0002).toFixed(2) : 0;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="이동 결과" showBack onBack={goHome} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <View className="flex-1 px-pageX">
          <View className="flex-row items-center mb-5 mt-5">
            {Number(points) > 0 ? (
              <View className="px-pageX flex-row items-center">
                <Text className="text-h2 font-sf-b text-green-700">
                  {points}
                </Text>
                <Ice width={40} height={40} />
                <Text className="text-h2 font-sf-b text-green-700">
                  {" "}
                  을 얻었습니다!
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ipa width={40} height={40} style={{ marginRight: 8 }} />
                <Text className="text-h2 font-sf-b text-green-700">
                  도착했습니다!
                </Text>
              </View>
            )}
          </View>

          <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-5">
            <Text className="font-sf-md text-lg">총 이동 거리</Text>
            <View className="items-end">
              <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                {distanceM} m
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-5">
            <Text className="font-sf-md text-lg">총 이동 시간</Text>
            <View className="items-end">
              <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                {durationM || 0} 분
                {durationM} 분
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl shadow-md px-6 py-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-sf-md text-lg">탄소 절감량</Text>
              <TouchableOpacity onPress={() => setShowInfo(true)}>
                <Text className="text-gray-400 text-2xl">ⓘ</Text>
              </TouchableOpacity>
            </View>
            <View className="items-end">
              <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                {co2Kg} kg CO₂
              </Text>
            </View>
            <Text className="text-sm mt-3 text-gray-600">
              🚗 자동차로 이동했다면 약 {carCo2} kg CO₂가 배출돼요.
            </Text>
            {mode === "TRANSIT" && (
              <Text className="text-xs mt-1 text-gray-500">
                ※ 대중교통은 절감량의 50%만 인정됩니다.
              </Text>
            )}
          </View>

          <View className="items-center">
            <IpaTori width={260} height={220} />
          </View>
        </View>

        <View className="px-pageX mb-10">
          <MainButton label="홈으로" onPress={goHome} />
        </View>

        <Modal visible={showInfo} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-xl p-5 w-4/5">
              <Text className="text-base font-sf-b mb-2">계산 기준</Text>
              <Text className="text-sm text-gray-600 leading-5">
                • 자동차는 1km당 약 0.2kg CO₂ 배출 {"\n"}• 도보·자전거는 100%
                절감 {"\n"}• 대중교통은 50%만 인정 {"\n"}• 절감 1kg당 100얼음
                지급
              </Text>
              <TouchableOpacity
                className="mt-4 self-end"
                onPress={() => setShowInfo(false)}
              >
                <Text className="text-[#318643] font-sf-md">닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
