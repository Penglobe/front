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
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";

export default function newDonation() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSave = name.trim().length > 0 && asset;

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
      fd.append("image", {
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });

      // ⚠️ apiFetch가 FormData면 Content-Type 자동 처리
      const res = await apiFetch("/shop/products/donation", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "기부 등록 실패");

      Alert.alert("완료", "기부이 생성되었습니다.");
      router.replace("/pages/admin/showlist");
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
      <BgGradient />
      {/* 헤더 */}
      <HeaderBar title="기부 등록" />

      <ScrollView
        className="flex-1 px-pageX py-4"
        keyboardShouldPersistTaps="handled"
      >
        <L label="기부명">
          <TextInput
            value={name}
            onChangeText={setName}
            className="bg-white rounded-2xl px-lg py-md border border-gray-200"
            autoCapitalize="none"
          />
        </L>

        <L label="모금 소개">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명"
            className="bg-white rounded-2xl px-lg py-md border border-gray-200"
            multiline
          />
        </L>

        <L label="이미지">
          {asset ? (
            <View className="items-start">
              <Image
                source={{ uri: asset.uri }}
                className="w-40 h-40 rounded-xl mb-md"
              />
              <View className="flex-row">
                <Pressable
                  onPress={pickImage}
                  className="px-md py-sm bg-emerald-600 rounded-xl mr-sm"
                >
                  <Text className="text-white font-sf-b">다른 이미지</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAsset(null)}
                  className="px-md py-sm bg-gray-200 rounded-xl"
                >
                  <Text className="font-sf-md text-gray-700">삭제</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              className="px-lg py-md bg-emerald-600 rounded-2xl items-center"
            >
              <Text className="text-white font-sf-b">이미지 선택</Text>
            </Pressable>
          )}
        </L>

        {canSave && !loading && (
          <Pressable
            onPress={onSubmit}
            className="mt-xl rounded-2xl py-md items-center bg-emerald-600"
          >
            <Text className="text-white font-sf-b">생성</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function L({ label, children }) {
  return (
    <View className="mb-md">
      <Text className="text-gray-700 mb-sm font-sf-md">{label}</Text>
      {children}
    </View>
  );
}
