// app/admin/donations/new.jsx
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

export default function NewDonation() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSave = name.trim().length > 0 && asset;

  // 🔔 CustomAlert 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  // 안전한 mime 추출 함수
  const getMimeType = (file) => {
    if (file.mimeType) return file.mimeType;
    const ext = (file.fileName || file.uri).split(".").pop().toLowerCase();
    if (ext === "png") return "image/png";
    if (ext === "heic" || ext === "heif") return "image/heic";
    return "image/jpeg"; // fallback
  };

  // 이미지 선택
  const pickImage = async () => {
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.status !== "limited") {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!perm.granted && perm.status !== "limited") {
      setAlertTitle("권한 필요");
      setAlertMessage("갤러리 접근 권한을 허용해주세요.");
      setAlertMode("permError");
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

  // 등록 API
  const onSubmit = async () => {
    try {
      if (!canSave) {
        setAlertTitle("확인");
        setAlertMessage("필수 항목을 입력/선택하세요.");
        setAlertMode("inputError");
        setAlertVisible(true);
        return;
      }

      setLoading(true);

      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("image", {
        uri: asset.uri,
        name: asset.fileName ?? "upload.jpg",
        type: getMimeType(asset),
      });

      const res = await apiFetch("/shop/products/donation", {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("❌ Donation API error:", {
          status: res.status,
          body: json,
        });
        throw new Error(
          json?.message || `기부 등록 실패 (status ${res.status})`
        );
      }

      setAlertTitle("완료");
      setAlertMessage("기부가 생성되었습니다.");
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
      <HeaderBar title="기부 등록" />

      <ScrollView
        className="flex-1 px-pageX py-lg"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <L label="기부명">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예) 지구를 위한 나무심기"
            placeholderTextColor="#9CA3AF"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
            autoCapitalize="none"
          />
        </L>

        <L label="모금 소개">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명"
            placeholderTextColor="#9CA3AF"
            className="w-full bg-white text-black py-md px-md text-md font-sf-md rounded-xl border border-gray"
            multiline
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
          label={loading ? "등록 중..." : "기부 등록"}
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
