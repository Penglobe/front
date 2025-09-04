// app/signup.jsx
import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { signupLocal } from "@services/authService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Keyboard } from "react-native";

const INPUT_H = 56;
const BTN_H = 56;
const FONT = 16;

export default function Signup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [nickname, setNickname] = useState("");
  const [regionId, setRegionId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(false);

  // 포커스 이동용 ref
  const pwRef = useRef(null);
  const pw2Ref = useRef(null);
  const nickRef = useRef(null);
  const regionRef = useRef(null);
  const profileRef = useRef(null);

  const canSubmit =
    email.trim().length > 0 &&
    nickname.trim().length > 0 &&
    password.trim().length >= 8 &&
    password === password2;

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("확인", "입력값을 다시 확인해주세요.");
      return;
    }
    try {
      setLoading(true);
      const { message } = await signupLocal({
        email: email.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
        regionId: regionId ? Number(regionId) : null,
        profileId: profileId ? Number(profileId) : null,
      });
      Alert.alert("성공", message || "회원가입 완료");
      // 로그인 화면으로 이동 + 이메일 자동 채우기
      router.replace(`/?email=${encodeURIComponent(email.trim())}`);
    } catch (e) {
      Alert.alert("회원가입 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          className="px-pageX"
        >
          {/* 상단 헤더 */}
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-2xl font-sf-b">회원가입</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text className="text-[#2563EB] font-sf-b">취소</Text>
            </Pressable>
          </View>

          {/* 스크롤 가능한 폼 */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Labeled label="이메일">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor="gray"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType={Platform.select({
                  ios: "emailAddress",
                  android: "email",
                })}
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
              />
            </Labeled>

            <Labeled label="비밀번호">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="8자 이상"
                placeholderTextColor="gray"
                secureTextEntry={true} // ← 마스킹만
                keyboardType="default" // ← 일반 키보드
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="next"
                onSubmitEditing={() => pw2Ref.current?.focus()}
              />
            </Labeled>

            <Labeled label="비밀번호 확인">
              <TextInput
                value={password2}
                onChangeText={setPassword2}
                placeholder="한 번 더 입력"
                placeholderTextColor="gray"
                secureTextEntry={true} // ← 마스킹만
                keyboardType="default" // ← 일반 키보드
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="next"
                onSubmitEditing={() => nickRef.current?.focus()}
              />
            </Labeled>

            <Labeled label="닉네임">
              <TextInput
                ref={nickRef}
                value={nickname}
                onChangeText={setNickname}
                placeholder="표시할 이름"
                placeholderTextColor="gray"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="next"
                onSubmitEditing={() => regionRef.current?.focus()}
              />
            </Labeled>

            <Labeled label="지역 ID">
              <TextInput
                ref={regionRef}
                value={regionId}
                onChangeText={setRegionId}
                placeholder="숫자 ID"
                placeholderTextColor="gray"
                keyboardType="number-pad"
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="next"
                onSubmitEditing={() => profileRef.current?.focus()}
              />
            </Labeled>

            <Labeled label="프로필 ID">
              <TextInput
                ref={profileRef}
                value={profileId}
                onChangeText={setProfileId}
                placeholder="숫자 ID"
                placeholderTextColor="gray"
                keyboardType="number-pad"
                className="bg-white rounded-2xl px-4 text-black font-sf-md"
                style={[
                  styles.inputShadow,
                  { height: INPUT_H, fontSize: FONT },
                ]}
                returnKeyType="done"
                blurOnSubmit={true} // ✅ 엔터 시 포커스만 해제
                onSubmitEditing={() => {
                  profileRef.current?.blur(); // ✅ 포커스 해제
                  Keyboard.dismiss(); // ✅ 키보드만 닫기 (선택)
                }}
              />
            </Labeled>
          </ScrollView>

          {/* 하단 버튼 */}
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loading}
            className="mt-2 rounded-2xl items-center justify-center"
            style={[
              styles.loginBtnShadow,
              {
                height: BTN_H,
                backgroundColor: canSubmit ? "#10B981" : "#E5E7EB",
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            <Text
              className={`font-sf-b text-[18px] ${canSubmit ? "text-white" : "text-[#9CA3AF]"}`}
            >
              {loading ? "처리 중..." : "가입하기"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Labeled({ label, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text className="text-gray-700 mb-2 font-sf-md">{label}</Text>
      {children}
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
});
