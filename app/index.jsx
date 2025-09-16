// app/index.jsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Images } from "@constants/Images";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { login, getAccessToken } from "@services/authService";
import { useAuth } from "@hooks/useAuth";
import { useKakaoLogin } from "@hooks/useKakaoLogin";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import CustomAlert from "@components/CustomAlert";

const INPUT_H = 56; // 입력칸 높이
const BTN_H = 56; // 버튼 높이
const FONT = 16; // 입력칸 글자 크기
const BLOCK_BOTTOM = 60;

export default function Index() {
  const { refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { loginWithKakao, isReady } = useKakaoLogin();

  const { width: SCREEN_W } = Dimensions.get("window");
  const LOGO_SIZE = Math.min(240, Math.max(160, SCREEN_W * 0.5));

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const canLogin = email.trim().length > 0 && pw.trim().length > 7;

  useEffect(() => {
    (async () => {
      const at = await getAccessToken();
      if (at) router.replace("/(tabs)/home"); // ✅ 토큰 있으면 홈으로
    })();
  }, [router]);

  // 회원가입 완료 후 돌아올 때 ?email=... 로 자동 채움
  useEffect(() => {
    if (params?.email && typeof params.email === "string") {
      setEmail(params.email);
    }
  }, [params?.email]);

  const onLogin = async () => {
    try {
      setLoading(true);
      const res = await login(email.trim(), pw.trim());

      if (res.type?.toUpperCase() === "ADMIN") {
        router.replace("/pages/admin/adminMain"); // 관리자 페이지
      } else {
        router.replace("/(tabs)/home"); // 일반 유저 홈
      }
    } catch (e) {
      setAlertTitle("로그인 실패");
      setAlertMessage(e?.message ?? "다시 시도해주세요");
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onKakaoLogin = async () => {
    try {
      if (!isReady) {
        setAlertTitle("잠시만요");
        setAlertMessage("로그인 준비중입니다. 1초 후 다시 눌러주세요.");
        setAlertVisible(true);
        return;
      }
      const result = await loginWithKakao();
      await refreshUser();
      // TODO: result 또는 사용자 정보에서 profileCompleted 여부 확인 후 분기

      router.replace("/(tabs)/home");
    } catch (e) {
      setAlertTitle("카카오 로그인 실패");
      setAlertMessage(e?.message ?? "다시 시도해주세요");
      setAlertVisible(true);
    }
  };

  return (
    <View className="flex-1">
      <Images.BgQuiz
        width="100%"
        height="130%"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* 로고 */}
      <View className="items-center mt-[40%] mb-[6%]">
        <Images.Logo width={LOGO_SIZE} height={LOGO_SIZE} />
      </View>

      {/* 입력 + 버튼 영역 */}
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingBottom: (insets?.bottom ?? 0) + BLOCK_BOTTOM,
        }}
        enableOnAndroid={true}
        enableAutomaticScroll={Platform.OS === "ios"}
        extraScrollHeight={20} // 입력칸 위로 살짝 더 올려줌
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-pageX">
          {/* 아이디 / 비밀번호 */}
          <View className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="아이디 (이메일)"
              placeholderTextColor="darkGray"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white rounded-2xl px-lg text-black font-sf-md"
              style={[
                styles.inputShadow,
                {
                  height: INPUT_H,
                  fontSize: FONT,
                  textAlignVertical: "center",
                },
              ]}
              returnKeyType="next"
            />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="비밀번호"
              placeholderTextColor="darkGray"
              secureTextEntry
              className="bg-white rounded-2xl px-lg text-black font-sf-md"
              style={[
                styles.inputShadow,
                {
                  height: INPUT_H,
                  fontSize: FONT,
                  textAlignVertical: "center",
                },
              ]}
              returnKeyType="done"
            />
          </View>

          {/* 로그인 버튼 */}
          <Pressable
            onPress={onLogin}
            disabled={!canLogin}
            className="mt-4 rounded-2xl items-center justify-center"
            style={[
              styles.loginBtnShadow,
              {
                height: BTN_H,
                backgroundColor: canLogin ? "green" : "#E5E7EB",
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            <Text
              className={`font-sf-b text-h3 ${
                canLogin ? "text-white" : "text-[#9CA3AF]"
              }`}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Text>
          </Pressable>

          {/* 회원가입 페이지로 이동 */}
          <View className="mt-3 flex-row justify-center">
            <Pressable onPress={() => router.push("/pages/signup")}>
              <Text className="font-sf-b text-black text-h4 mr-sm underline">
                회원가입
              </Text>
            </Pressable>
          </View>

          {/* 카카오 원형 버튼 */}
          <Pressable
            onPress={onKakaoLogin}
            disabled={!isReady || loading}
            className="mt-10 self-center rounded-full items-center justify-center"
            style={[
              styles.kakaoBtnShadow,
              { width: 58, height: 58, backgroundColor: "#FEE500" },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Images.Kakao width={30} height={30} />
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  loginBtnShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  kakaoBtnShadow: {
    shadowColor: "#FBBF24",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
