// app/admin/products/edit.jsx
import { useEffect, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@services/authService";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import CustomAlert from "@components/CustomAlert";
import MainButton from "@components/MainButton";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig.extra.SERVER_URL;
function toUri(path) {
  if (!path) return null;
  return path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function ProductEdit() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/shop/products/${id}`);
        const json = await res.json();
        setOrigin(json.data ?? json);
        setName(json.data?.name ?? "");
        setDescription(json.data?.description ?? "");
        setPrice(String(json.data?.price ?? ""));
      } catch (e) {
        setAlertTitle("오류");
        setAlertMessage("상품 정보를 불러올 수 없습니다.");
        setAlertMode("fail");
        setAlertVisible(true);
      }
    })();
  }, [id]);

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
      setLoading(true);

      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("price", String(Math.max(0, Number(price))));

      if (asset) {
        fd.append("image", {
          uri: asset.uri,
          name: asset.fileName ?? "image.jpg",
          type: asset.mimeType ?? "image/jpeg",
        });
      }

      const res = await apiFetch(`/shop/products/${id}`, {
        method: "PUT",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "상품 수정 실패");

      setAlertTitle("완료");
      setAlertMessage("상품이 수정되었습니다.");
      setAlertMode("success");
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("수정 실패");
      setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요.");
      setAlertMode("fail");
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (!origin) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  const canSave =
    name.trim().length > 0 &&
    String(price).trim().length > 0 &&
    !Number.isNaN(Number(price));

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BgGradient />
      <HeaderBar title="상품 수정" />

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
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
          />
        </L>

        <L label="이미지">
          {asset ? (
            <Image
              source={{ uri: asset.uri }}
              className="w-full h-48 rounded-xl mb-md"
              resizeMode="cover"
            />
          ) : origin?.img ? (
            <Image
              source={{ uri: toUri(origin.img) }}
              className="w-full h-48 rounded-xl mb-md"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-gray-500">이미지 없음</Text>
          )}

          <View className="flex-row gap-3 mt-sm">
            <Pressable
              onPress={pickImage}
              className="flex-1 py-md bg-green/40 rounded-xl items-center"
            >
              <Text className="text-green font-sf-b">다른 이미지</Text>
            </Pressable>
            {(asset || origin?.img) && (
              <Pressable
                onPress={() => {
                  setAsset(null);
                  setOrigin({ ...origin, img: null });
                }}
                className="flex-1 py-md bg-red/40 rounded-xl items-center"
              >
                <Text className="font-sf-md text-red">삭제</Text>
              </Pressable>
            )}
          </View>
        </L>

        <MainButton
          label={loading ? "저장 중..." : "수정"}
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
            router.replace("/pages/admin/adminMain");
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
