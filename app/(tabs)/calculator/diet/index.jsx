import React from "react";
import { View, Text, Pressable } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";
import { fetchTodayCount } from "@services/dietService";
import { useAuth } from "@hooks/useAuth";
import CustomAlert from "@components/CustomAlert";

export default function Diet() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [alertState, setAlertState] = React.useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: undefined,
    onConfirm: undefined,
    onCancel: undefined,
  });
  const openAlert = (opts) =>
    setAlertState((s) => ({ ...s, visible: true, ...opts }));
  const closeAlert = () =>
    setAlertState((s) => ({
      ...s,
      visible: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));

  const handlePress = async () => {
    try {
      // 1) 유저 확인
      let uid = user?.userId;
      if (!uid && typeof refreshUser === "function") {
        await refreshUser();
        uid = (typeof user === "object" && user?.userId) || uid;
      }
      if (!uid) {
        openAlert({
          title: "로그인 필요",
          message: "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
        });
        return;
      }

      // 2) 일일 횟수 제한 확인
      const count = await fetchTodayCount(uid);
      if (count >= 3) {
        openAlert({
          title: "알림",
          message: "오늘은 이미 3번 기록했습니다. \n내일 다시 시도해 주세요.",
        });
        return;
      }

      // 3) 촬영 화면으로 이동
      router.push("/pages/diet/dietTest");
    } catch (e) {
      openAlert({
        title: "오류",
        message: "빙하 식탁 횟수 조회에 실패했습니다. 다시 시도해 주세요.",
      });
      console.error(e);
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="빙하 식탁" />
      <View className="flex-1 px-pageX pt-2xl">
        <Text className="font-sf-b text-green text-h1 leading-[32px]">
          식사 사진을 올리면, {"\n"}이번 한 끼로 탄소를 얼마나{"\n"}절감했는지
          알려드려요!
        </Text>
        <Text className="font-sf-md text-bodySm py-sm">
          ※ 하루 3회까지 기록할 수 있어요.
        </Text>

        <Pressable
          onPress={handlePress}
          className="w-[100%] h-[200px] mt-lg bg-green/40 rounded-[12px] items-center justify-center gap-2 active:bg-green/60"
        >
          <Images.Camera width={40} height={40} />
          <Text className="font-sf-b text-green text-h3">사진 찍으러 가기</Text>
        </Pressable>

        <View className="items-center justify-center">
          <Images.Ipa_Tori_diet width={320} height={260} />
        </View>
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={() => {
          closeAlert();
          alertState.onConfirm?.();
        }}
        onCancel={
          alertState.onCancel
            ? () => {
                closeAlert();
                alertState.onCancel?.();
              }
            : undefined
        }
      />
    </View>
  );
}
