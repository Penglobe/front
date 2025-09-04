// app/index.jsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Images } from "@constants/Images";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { login, getAccessToken } from "@services/authService";
import { useAuth } from "@hooks/useAuth";
import { useKakaoLogin } from "@hooks/useKakaoLogin";

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

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const canLogin = email.trim().length > 0 && pw.trim().length > 0;

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
      await login(email.trim(), pw.trim());
      await refreshUser();
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("로그인 실패", e.message ?? "다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  const onKakaoLogin = async () => {
    try {
      if (!isReady) {
        Alert.alert("잠시만요", "로그인 준비중입니다. 1초 후 다시 눌러주세요.");
        return;
      }
      const result = await loginWithKakao();
      await refreshUser();
      // TODO: result 또는 사용자 정보에서 profileCompleted 여부 확인 후 분기
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("카카오 로그인 실패", e.message ?? "다시 시도해주세요");
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
      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: "18%" }}
      >
        <Images.Logo width={240} height={240} />
      </View>

      {/* 입력 + 버튼 영역 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: (insets?.bottom ?? 0) + BLOCK_BOTTOM,
        }}
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
              className="bg-white rounded-2xl px-4 text-black font-sf-md"
              style={[
                styles.inputShadow,
                {
                  height: INPUT_H,
                  paddingVertical: 14,
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
              className="bg-white rounded-2xl px-4 text-black font-sf-md"
              style={[
                styles.inputShadow,
                {
                  height: INPUT_H,
                  paddingVertical: 14,
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
              className={`font-sf-b text-[18px] ${canLogin ? "text-white" : "text-[#9CA3AF]"}`}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Text>
          </Pressable>

          {/* 회원가입 페이지로 이동 */}
          <View className="mt-3 flex-row justify-center">
            <Pressable onPress={() => router.push("/pages/signup")}>
              <Text className="font-sf-b text-black text-[15px] mr-2">
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
      </KeyboardAvoidingView>
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
