import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { apiFetch } from "@services/authService";
import Constants from "expo-constants";
import CustomAlert from "@components/CustomAlert";

const SERVER_URL = Constants.expoConfig.extra.SERVER_URL;
const BASE = (SERVER_URL || "").replace(/\/+$/, "");

function toUri(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${rel}`;
}

export default function ProductEditPage() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null); // 로컬 이미지 객체
  const [imgUri, setImgUri] = useState(null); // 미리보기용

  // 🔔 커스텀 알럿 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);
  // "loadError" | "saveSuccess" | "saveFail"

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/shop/products/${id}`);
      const result = await res.json();

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
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
      setImgUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (description) formData.append("description", description);
      if (image) {
        formData.append("image", {
          uri: image.uri,
          type: "image/jpeg",
          name: "upload.jpg",
        });
      }

      const res = await apiFetch(`/shop/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "수정 실패");
      }

      // 성공
      setAlertTitle("수정 완료");
      setAlertMessage("상품 정보가 수정되었습니다.");
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
        <Text className="text-gray-500">불러오는 중...</Text>
        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          confirmText="확인"
          onConfirm={() => {
            setAlertVisible(false);
            if (alertMode === "loadError") {
              router.back();
            }
          }}
        />
      </View>
    );
  }

  const bottomGap = Math.max(insets.bottom, 16) + 76;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="관리자 페이지 > 상품 수정" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomGap }}
        className="px-pageX pt-md"
      >
        {/* 이미지 */}
        <Pressable
          className="w-full h-[220px] rounded-2xl mt-xs mb-sm bg-gray items-center justify-center overflow-hidden"
          onPress={pickImage}
        >
          {imgUri ? (
            <Image
              source={{ uri: imgUri }}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-gray-400">이미지 선택</Text>
          )}
        </Pressable>

        {/* 상품 정보 입력 */}
        <View className="bg-white rounded-2xl px-pageX pt-md pb-llg">
          <Text className="text-h3 font-sf-b mb-md">상품명</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="상품명을 입력하세요"
            className="border border-gray-300 rounded-md p-2 mb-md"
          />

          <Text className="text-h3 font-sf-b mb-md">가격 (수정불가)</Text>
          <TextInput
            value={price?.toString()}
            editable={false}
            selectTextOnFocus={false}
            className="border border-gray-300 rounded-md p-2 mb-md bg-gray-100 text-gray-700"
          />

          <Text className="text-h3 font-sf-b mb-md">설명</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상품 설명을 입력하세요"
            multiline
            className="border border-gray-300 rounded-md p-2 mb-md h-24"
          />

          <Pressable
            onPress={handleSave}
            className="mt-lg py-4 bg-blue rounded-xl items-center justify-center opacity-90"
          >
            <Text className="text-white font-sf-b text-h4">저장</Text>
          </Pressable>
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
          if (alertMode === "loadError") {
            router.back();
          }
          if (alertMode === "saveSuccess") {
            router.push("/pages/admin/showlist");
          }
        }}
      />
    </View>
  );
}
