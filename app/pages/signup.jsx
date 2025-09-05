// app/signup.jsx
import { useCallback, useEffect, useRef, useState } from "react";
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
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { signupLocal, apiFetch } from "@services/authService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Images } from "@constants/Images"; // 아바타 컴포넌트

const INPUT_H = 56;
const BTN_H = 56;
const FONT = 16;

// 앱에서 지원하는 아바타 목록
const AVATARS = [
  { key: "ToriFace", label: "토리", Render: Images.ToriFace },
  { key: "IpaFace", label: "이파", Render: Images.IpaFace },
];

export default function Signup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [nickname, setNickname] = useState("");
  const [regionId, setRegionId] = useState("");
  const [loading, setLoading] = useState(false);

  // 지역 선택용
  const [regionLabel, setRegionLabel] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [regions, setRegions] = useState([]);

  // 프로필 선택용
  const [profile, setProfile] = useState(""); // 서버에 보낼 키
  const [profileLabel, setProfileLabel] = useState(""); // 표시용 라벨
  const [profileOpen, setProfileOpen] = useState(false);

  // 포커스 이동용 ref
  const pwRef = useRef(null);
  const pw2Ref = useRef(null);
  const nickRef = useRef(null);

  const canSubmit =
    email.trim().length > 0 &&
    nickname.trim().length > 0 &&
    password.trim().length >= 8 &&
    password === password2 &&
    !!regionId &&
    !!profile; // 프로필 선택 필수

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
        profile, // "ToriFace" | "IpaFace"
      });
      Alert.alert("성공", message || "회원가입 완료");
      router.replace(`/?email=${encodeURIComponent(email.trim())}`);
    } catch (e) {
      Alert.alert("회원가입 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 지역 목록 불러오기
  const loadRegions = useCallback(async () => {
    try {
      const res = await apiFetch("/rankings/regions");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "지역 목록 조회 실패");

      const raw = (json?.data ?? json) || [];
      const mapped = raw
        .map((r) => ({
          id: r.regionId ?? r.region_id ?? r.id,
          name: r.regionName ?? r.region_name ?? r.name,
        }))
        .filter((r) => r.id && r.name);

      mapped.sort((a, b) =>
        a.name.localeCompare(b.name, "ko", { sensitivity: "base" })
      );
      setRegions(mapped);
    } catch (e) {
      Alert.alert("오류", e?.message ?? "지역 목록을 불러올 수 없습니다.");
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  // 현재 선택된 아바타 (오른쪽 미니 썸네일 표시용)
  const selectedAvatar = AVATARS.find((a) => a.key === profile) || null;

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
            onScrollBeginDrag={() => {
              setRegionOpen(false);
              setProfileOpen(false);
            }}
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

            <Labeled label="비밀번호(8자 이상)">
              <TextInput
                ref={pwRef}
                value={password}
                onChangeText={setPassword}
                placeholder="8자 이상"
                placeholderTextColor="gray"
                secureTextEntry
                keyboardType="default"
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
                ref={pw2Ref}
                value={password2}
                onChangeText={setPassword2}
                placeholder="한 번 더 입력"
                placeholderTextColor="gray"
                secureTextEntry
                keyboardType="default"
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
                onSubmitEditing={() => {
                  setRegionOpen(true);
                  Keyboard.dismiss();
                }}
              />
            </Labeled>

            {/* 지역 선택 드롭다운 */}
            <Labeled label="지역">
              <Pressable
                onPress={() => {
                  setRegionOpen((v) => !v);
                  Keyboard.dismiss();
                }}
                className="bg-white justify-center"
                style={[styles.inputShadow, { height: INPUT_H }]}
              >
                <View pointerEvents="none">
                  <TextInput
                    value={regionLabel}
                    editable={false}
                    placeholder="시/도를 선택하세요"
                    placeholderTextColor="gray"
                    className="bg-white rounded-2xl px-4 text-black font-sf-md text-[16px]"
                  />
                </View>
              </Pressable>

              {regionOpen && (
                <View className="mt-2 rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  <ScrollView
                    style={{ maxHeight: 240 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {regions.map((r) => {
                      const selected = String(regionId) === String(r.id);
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => {
                            setRegionId(String(r.id));
                            setRegionLabel(r.name);
                            setRegionOpen(false);
                          }}
                          className={`px-4 py-3 border-b border-gray-100 ${
                            selected ? "bg-emerald-50" : "bg-white"
                          }`}
                        >
                          <Text
                            className={`font-sf-md ${
                              selected ? "text-emerald-700" : "text-gray-800"
                            }`}
                          >
                            {r.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </Labeled>

            {/* 프로필 선택 드롭다운 */}
            <Labeled label="프로필">
              {/* 표시용 필드(placeholder처럼 보이는 읽기전용 TextInput) + 오른쪽 미니 썸네일 */}
              <Pressable
                onPress={() => {
                  setProfileOpen((v) => !v);
                  Keyboard.dismiss();
                }}
                className="bg-white justify-center rounded-2xl"
                style={[
                  styles.inputShadow,
                  { height: 56, position: "relative" },
                ]}
              >
                <View pointerEvents="none">
                  <TextInput
                    value={profileLabel} // 선택되면 왼쪽에 이름 표시
                    editable={false}
                    placeholder="프로필을 선택하세요"
                    placeholderTextColor="gray"
                    className="bg-white rounded-2xl px-4 text-black font-sf-md text-[16px]"
                    style={{ paddingRight: 48 }} // 오른쪽 썸네일 공간 확보
                  />
                </View>

                {/* 오른쪽 미니 썸네일 (선택된 경우만 노출) */}
                {selectedAvatar && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      right: 25,
                      top: 15,
                      bottom: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      width: 24,
                      height: 24,
                    }}
                  >
                    {selectedAvatar.Render ? (
                      <selectedAvatar.Render width={35} height={35} />
                    ) : null}
                  </View>
                )}
              </Pressable>

              {/* 펼쳐지는 선택창 */}
              {profileOpen && (
                <View className="mt-2 rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingHorizontal: 8,
                      paddingVertical: 10,
                    }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {AVATARS.map(({ key, label, Render }) => {
                      const selected = profile === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => {
                            setProfile(key);
                            setProfileLabel(label);
                            setProfileOpen(false); // 선택 후 닫기
                          }}
                          className={`items-center justify-center mr-3 rounded-2xl p-3 ${
                            selected
                              ? "border-2 border-emerald-500 bg-white"
                              : "border border-black/10 bg-white/90"
                          }`}
                          android_ripple={{ color: "#00000010" }}
                          style={{ width: 120 }}
                        >
                          <Render width={72} height={72} />
                          <Text
                            className={`mt-2 font-sf-md ${
                              selected ? "text-emerald-600" : "text-gray-700"
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
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
              className={`font-sf-b text-[18px] ${
                canSubmit ? "text-white" : "text-[#9CA3AF]"
              }`}
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
