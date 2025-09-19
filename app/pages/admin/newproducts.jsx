// app/admin/products/new.jsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { apiFetch } from "@services/authService";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import CustomAlert from "@components/CustomAlert";
import MainButton from "@components/MainButton";

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

  // 🔔 CustomAlert 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  const pickImage = async () => {
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.status !== "limited") {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!perm.granted && perm.status !== "limited") {
      setAlertTitle("권한 필요");
      setAlertMessage("갤러리 접근 권한을 허용해주세요.");
      setAlertMode("perm");
      setAlertVisible(true);
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!r.canceled) {
      let picked = r.assets[0];

      if (Platform.OS === "ios") {
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            picked.uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          picked = { ...picked, uri: compressed.uri };
        } catch (e) {
          console.warn("이미지 압축 실패:", e);
        }
      }

      setAsset(picked);
    }
  };

  const onSubmit = async () => {
    try {
      if (!canSave) {
        setAlertTitle("확인");
        setAlertMessage("필수 항목을 입력/선택하세요.");
        setAlertMode("input");
        setAlertVisible(true);
        return;
      }

      setLoading(true);
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("price", String(Math.max(0, Number(price))));
      fd.append("image", {
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });

      const res = await apiFetch("/shop/products", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "상품 생성 실패");

      setAlertTitle("완료");
      setAlertMessage("상품이 생성되었습니다.");
      setAlertMode("success");
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("오류");
      setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요.");
      setAlertMode("fail");
      setAlertVisible(true);
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
      <HeaderBar title="상품 등록" />

      <ScrollView
        className="flex-1 px-pageX py-lg"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <L label="상품명">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="에코 텀블러"
            placeholderTextColor="#9CA3AF"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
            autoCapitalize="none"
          />
        </L>

        <L label="설명">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명"
            placeholderTextColor="#9CA3AF"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
            multiline
          />
        </L>

        <L label="가격(얼음)">
          <TextInput
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ""))}
            placeholder="예) 3000"
            keyboardType="number-pad"
            placeholderTextColor="#9CA3AF"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
          />
        </L>

        <L label="이미지">
          {asset ? (
            <View>
              <Image
                source={{ uri: asset.uri }}
                className="w-full h-48 rounded-xl mb-md"
                resizeMode="cover"
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={pickImage}
                  className="flex-1 py-md bg-green/40 rounded-xl items-center"
                >
                  <Text className="text-green font-sf-b">다른 이미지</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAsset(null)}
                  className="flex-1 py-md bg-red/40 rounded-xl items-center"
                >
                  <Text className="font-sf-md text-red">삭제</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              className="w-full py-llg bg-green rounded-xl items-center"
            >
              <Text className="text-white font-sf-b">이미지 선택</Text>
            </Pressable>
          )}
        </L>

        <MainButton
          label={loading ? "등록 중..." : "상품 등록"}
          onPress={onSubmit}
          disabled={!canSave || loading}
          className="mt-xl"
        />
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText="확인"
        onConfirm={() => {
          setAlertVisible(false);
          if (alertMode === "success") {
            router.replace("/pages/admin/showlist");
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

function L({ label, children }) {
  return (
    <View className="mb-lg">
      <Text className="text-black mb-sm font-sf-md">{label}</Text>
      {children}
    </View>
  );
}
