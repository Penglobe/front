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

export default function ProductEdit() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState(null); // 새 이미지
  const [origin, setOrigin] = useState(null); // 기존 데이터
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  // 🔹 상품 불러오기
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

  // 🔹 이미지 선택 + 압축
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

  // 🔹 수정 API
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
        method: "PUT", // 또는 PATCH (백엔드 맞춰주세요)
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BgGradient />
      <HeaderBar title="상품 수정" />

      <ScrollView className="flex-1 px-pageX py-4">
        <L label="상품명">
          <TextInput
            value={name}
            onChangeText={setName}
            className="bg-white rounded-2xl px-lg py-md border border-gray-200"
          />
        </L>

        <L label="설명">
          <TextInput
            value={description}
            onChangeText={setDescription}
            className="bg-white rounded-2xl px-lg py-md border border-gray-200"
            multiline
          />
        </L>

        <L label="가격(얼음)">
          <TextInput
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^\d]/g, ""))}
            className="bg-white rounded-2xl px-lg py-md border border-gray-200"
          />
        </L>

        <L label="이미지">
          {asset ? (
            <Image source={{ uri: asset.uri }} className="w-40 h-40 mb-md" />
          ) : origin?.img ? (
            <Image source={{ uri: origin.img }} className="w-40 h-40 mb-md" />
          ) : (
            <Text className="text-gray-500">이미지 없음</Text>
          )}
          <Pressable
            onPress={pickImage}
            className="px-md py-sm bg-emerald-600 rounded-xl mt-sm"
          >
            <Text className="text-white font-sf-b">이미지 변경</Text>
          </Pressable>
        </L>

        <Pressable
          className="flex-1 py-4 rounded-xl bg-blue items-center justify-center opacity-90 mt-lg"
          onPress={onSubmit}
          disabled={loading}
        >
          <Text className="text-white font-sf-b text-h4 text-center">
            {loading ? "저장 중..." : "수정"}
          </Text>
        </Pressable>
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
    <View className="mb-md">
      <Text className="text-gray-700 mb-sm font-sf-md">{label}</Text>
      {children}
    </View>
  );
}
