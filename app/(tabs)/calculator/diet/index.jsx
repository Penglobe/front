import { View, Text, Pressable, Alert } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";
import { fetchTodayCount } from "@services/dietService"; 
import { useAuth } from "@hooks/useAuth";

export default function Diet() {
  const router = useRouter();
 const { user, refreshUser } = useAuth(); 

 const pickUserId = (u) => u?.userId ?? u?.id ?? u?.uid ?? null;

  const handlePress = async () => {
    try {
  
     let uid = pickUserId(user);
     if (!uid && typeof refreshUser === "function") {
       await refreshUser();
       uid = pickUserId(user); 
     }
     // 2) 그래도 없으면 안내 후 종료
     if (!uid) {
       Alert.alert("로그인 필요", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
       return;
     }

     const count = await fetchTodayCount(uid);
      if (count >= 3) {
        Alert.alert("알림", "오늘은 이미 3번까지 기록했습니다. 내일 다시 시도해 주세요.");
        return; 
      }

     router.push("/pages/diet/dietTest");
    } catch (e) {
      Alert.alert("오류", "식단 횟수 조회에 실패했습니다.");
      console.error(e);
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="식단 측정" />
        <View className="flex-1 px-pageX pt-3xl gap-llg">
          <Text className="font-sf-b text-green text-h1 leading-[34px]">
            식사 사진을 올리면, {"\n"}이번 한 끼로 얼마나 탄소를 {"\n"}아꼈는지
            알려드려요.
          </Text>
          <Pressable
            onPress={handlePress}
            className="w-[100%] h-[180px] bg-green/40 rounded-[20px] items-center justify-center gap-2 active:bg-green/60"
          >
            <Images.Camera width={36} height={36} />
            <Text className="font-sf-b text-green text-h4">사진 추가</Text>
          </Pressable>
        </View>
        <View className="items-center justify-center pb-sm">
          <Images.IpaTori1 width={300} height={260} />
        </View>
      </View>
    </View>
  );
}
