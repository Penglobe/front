import React, { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";
import { router } from "expo-router";
import { logout as authLogout } from "@services/authService";
import CustomAlert from "@components/CustomAlert";
import MainButton from "@components/MainButton";

export default function AdminMain() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null); // "logoutConfirm" | "logoutError"

  const handleLogout = useCallback(() => {
    setAlertTitle("로그아웃");
    setAlertMessage("정말 로그아웃 하시겠습니까?");
    setAlertMode("logoutConfirm");
    setAlertVisible(true);
  }, []);

  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />
      <View className="w-[100%] h-[100px]"></View>
      <View className="px-pageX flex-1">
        {/* 총 탄소 절감량 카드 */}
        <View className="px-xl py-xl bg-white rounded-xl items-start shadow-md mb-2xl">
          <Text className="text-black text-body font-sf-md">
            안녕하세요, 관리자님!{"\n\n"}오늘도 환경을 위한 상품과 기부를
            관리하고, {"\n"}더 나은 지구를 만들어봐요!
          </Text>
        </View>

        {/* 로고 */}
        <View className="items-center mb-4xl">
          <Images.Logo width={240} height={240} />
        </View>

        {/* 상품 등록 버튼 */}
        <View className="flex-row gap-4">
          <Pressable
            className="flex-1 rounded-xl items-center justify-center py-llg bg-green active:bg-emerald-700"
            onPress={() => router.push("/pages/admin/newproducts")}
          >
            <Text className="font-sf-md text-button text-s text-white">
              상품 등록하기
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 rounded-xl items-center justify-center py-llg bg-green active:bg-emerald-700"
            onPress={() => router.push("/pages/admin/newDonation")}
          >
            <Text className="font-sf-md text-button text-s text-white">
              기부 등록하기
            </Text>
          </Pressable>
        </View>

        {/* 관리 버튼 */}
        <MainButton
          label="기부 & 상품 관리하기 (수정/삭제)"
          onPress={() => router.push("/pages/admin/showlist")}
          className="mt-lg bg-green/80"
        />

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center mt-2xl"
        >
          <View className="flex-row items-center">
            <Text className="text-black font-sf-md text-body underline">
              로그아웃
            </Text>
          </View>
        </Pressable>
      </View>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText={alertMode === "logoutConfirm" ? "로그아웃" : "확인"}
        cancelText={alertMode === "logoutConfirm" ? "취소" : undefined}
        onConfirm={async () => {
          if (alertMode === "logoutConfirm") {
            try {
              const res = await authLogout();
              setAlertVisible(false);
              router.replace("/");
            } catch (error) {
              setAlertTitle("오류");
              setAlertMessage("로그아웃 중 오류가 발생했습니다.");
              setAlertMode("logoutError");
              setAlertVisible(true);
            }
          } else {
            setAlertVisible(false);
          }
        }}
        onCancel={() => {
          setAlertVisible(false);
        }}
      />
    </View>
  );
}
