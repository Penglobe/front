// app/admin/products/new.jsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { apiFetch } from "@services/authService";

export default function ProductNew() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSave =
    name.trim().length > 0 &&
    String(price).trim().length > 0 &&
    !Number.isNaN(Number(price)) &&
    asset;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "갤러리 접근 권한을 허용해주세요.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!r.canceled) setAsset(r.assets[0]);
  };

  const onSubmit = async () => {
    try {
      if (!canSave) return Alert.alert("확인", "필수 항목을 입력/선택하세요.");

      setLoading(true);
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("price", String(Math.max(0, Number(price)))); // 음수 방지
      fd.append("image", {
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });

      // ⚠️ apiFetch가 FormData면 Content-Type 자동 처리
      const res = await apiFetch("/shop/products", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "상품 생성 실패");

      Alert.alert("완료", "상품이 생성되었습니다.");
      router.replace("/(tabs)/store");
    } catch (e) {
      Alert.alert("오류", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 px-pageX py-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-sf-b">상품 생성</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-[#2563EB] font-sf-b">취소</Text>
          </Pressable>
        </View>

        <L label="상품명">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="에코 텀블러"
            className="bg-white rounded-2xl px-4 py-3 border border-gray-200"
            autoCapitalize="none"
          />
        </L>

        <L label="설명">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명"
            className="bg-white rounded-2xl px-4 py-3 border border-gray-200"
            multiline
          />
        </L>

        <L label="가격(포인트)">
          <TextInput
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ""))}
            placeholder="3000"
            keyboardType="number-pad"
            className="bg-white rounded-2xl px-4 py-3 border border-gray-200"
          />
        </L>

        <L label="이미지">
          {asset ? (
            <View className="items-start">
              <Image
                source={{ uri: asset.uri }}
                className="w-40 h-40 rounded-xl mb-3"
              />
              <View className="flex-row">
                <Pressable
                  onPress={pickImage}
                  className="px-3 py-2 bg-emerald-600 rounded-xl mr-2"
                >
                  <Text className="text-white font-sf-b">다른 이미지</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAsset(null)}
                  className="px-3 py-2 bg-gray-200 rounded-xl"
                >
                  <Text className="font-sf-md text-gray-700">삭제</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              className="px-4 py-3 bg-emerald-600 rounded-2xl items-center"
            >
              <Text className="text-white font-sf-b">이미지 선택</Text>
            </Pressable>
          )}
        </L>

        <Pressable
          onPress={onSubmit}
          disabled={!canSave || loading}
          className={`mt-6 rounded-2xl py-3 items-center ${
            canSave && !loading ? "bg-emerald-600" : "bg-gray-300"
          }`}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-sf-b">생성</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function L({ label, children }) {
  return (
    <View className="mb-3">
      <Text className="text-gray-700 mb-2 font-sf-md">{label}</Text>
      {children}
    </View>
  );
}
