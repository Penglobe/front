import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { apiFetch } from "@services/authService";
import Constants from "expo-constants";
import CustomAlert from "@components/CustomAlert";
import MainButton from "@components/MainButton";

const SERVER_URL = Constants.expoConfig?.extra?.SERVER_URL;
const BASE = (SERVER_URL || "").replace(/\/+$/, "");

function toUri(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${rel}`;
}

function ensureFilePart(asset) {
  const uri = asset?.uri || "";
  const extMatch = uri.match(/\.(jpg|jpeg|png|heic|webp)$/i);
  const ext = (extMatch?.[1] || "jpg").toLowerCase();
  const mimeByExt = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    webp: "image/webp",
  };
  const type = asset?.mimeType || mimeByExt[ext] || "image/jpeg";
  const filenameFromUri = uri.split("/").pop();
  const name = asset?.fileName || filenameFromUri || `image.${ext}`;
  return { uri, name, type };
}

export default function ProductEditPage() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [imgUri, setImgUri] = useState(null);

  // 🔔 CustomAlert 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  // 데이터 불러오기
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/shop/products/${id}`);
      const result = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(result?.message || `조회 실패(${res.status})`);

      const data = result?.data ?? result;
      setItem(data);
      setName(data.name || "");
      setPrice(data.price?.toString() || "");
      setDescription(data.description || "");
      setImgUri(toUri(data.img));
    } catch (e) {
      setAlertTitle("오류");
      setAlertMessage(e?.message ?? "상품 정보를 불러올 수 없습니다.");
      setAlertMode("loadError");
      setAlertVisible(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 이미지 선택 (iOS는 압축 + mime 지정)
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;

    let picked = result.assets[0];

    if (Platform.OS === "ios") {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          picked.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        picked = { ...picked, uri: compressed.uri, mimeType: "image/jpeg" };
      } catch (err) {
        console.warn("이미지 압축 실패:", err);
      }
    }

    const filePart = ensureFilePart(picked);
    setImage({ ...picked, ...filePart });
    setImgUri(filePart.uri);
  };

  // 저장
  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("price", price);

      if (image) {
        const { uri, name: fname, type } = ensureFilePart(image);
        formData.append("image", { uri, name: fname, type });
      }

      const res = await apiFetch(`/shop/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "수정 실패");

      setAlertTitle("수정 완료");
      setAlertMessage("기부/상품 정보가 수정되었습니다.");
      setAlertMode("saveSuccess");
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("수정 실패");
      setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요.");
      setAlertMode("saveFail");
      setAlertVisible(true);
    }
  };

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray">불러오는 중...</Text>
        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          confirmText="확인"
          onConfirm={() => {
            setAlertVisible(false);
            if (alertMode === "loadError") router.back();
          }}
        />
      </View>
    );
  }

  const bottomGap = Math.max(insets.bottom, 16) + 76;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="기부/상품 수정" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomGap }}
        className="px-pageX pt-md"
      >
        {/* 이미지 */}
        <Pressable
          className="w-full h-[220px] rounded-2xl mb-md bg-gray items-center justify-center overflow-hidden"
          onPress={pickImage}
        >
          {imgUri ? (
            <Image
              source={{ uri: imgUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-gray">이미지 선택</Text>
          )}
        </Pressable>

        {/* 입력 폼 */}
        <View className="bg-white rounded-2xl px-pageX pt-md pb-llg">
          <Text className="text-h3 font-sf-b mb-sm">상품명</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="상품명을 입력하세요"
            placeholderTextColor="#9CA3AF"
            className="w-full border border-gray rounded-xl px-md py-md mb-lg"
          />

          <Text className="text-h3 font-sf-b mb-sm">가격 (수정 불가)</Text>
          <TextInput
            value={price}
            editable={false}
            selectTextOnFocus={false}
            className="w-full border border-gray rounded-xl px-md py-md mb-lg bg-gray/40 text-black"
          />

          <Text className="text-h3 font-sf-b mb-sm">설명</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상품 설명을 입력하세요"
            placeholderTextColor="#9CA3AF"
            multiline
            className="w-full border border-gray rounded-xl px-md py-md h-28 mb-lg"
          />

          <MainButton
            label="저장"
            onPress={handleSave}
            disabled={false}
            className="mt-lg bg-blue"
          />
        </View>
      </ScrollView>

      {/* ✅ CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText="확인"
        onConfirm={() => {
          setAlertVisible(false);
          if (alertMode === "loadError") router.back();
          if (alertMode === "saveSuccess") router.push("/pages/admin/showlist");
        }}
      />
    </View>
  );
}
