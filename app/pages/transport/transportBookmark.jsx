import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { searchAddress, listBookmarks } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Ionicons } from "@expo/vector-icons";
import colors from "@constants/Colors.cjs";
import PlaceCard from "@components/PlaceCard";

export default function TransportBookmark() {
  const { startLat, startLng, mode: rawMode } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT"; // ✅ 기본값 보장

  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const userId = 1; // TODO: 로그인 사용자 ID 가져오기

  // ✅ 북마크 불러오기
  const fetchBookmarks = useCallback(async () => {
    try {
      const data = await listBookmarks(userId);
      setBookmarks(data);
    } catch (err) {
      console.error("북마크 조회 실패:", err);
      Alert.alert("북마크 조회 실패");
    }
  }, [userId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // ✅ 주소 검색
  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      const data = await searchAddress(query);
      setSearchResults(data.documents || []);
    } catch (err) {
      console.error(err);
      Alert.alert("주소 검색 실패", "카카오 API 호출 실패");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 확인 버튼
  const handleConfirm = () => {
    if (!selectedPlace) {
      Alert.alert("목적지를 선택해주세요.");
      return;
    }

    const isBookmark = !!selectedPlace.bookmarkId;

    const goNext = () =>
      router.push({
        pathname: "/pages/transport/transportMap",
        params: {
          startLat,
          startLng,
          endLat: isBookmark ? selectedPlace.lat : selectedPlace.y,
          endLng: isBookmark ? selectedPlace.lng : selectedPlace.x,
          placeName: isBookmark
            ? selectedPlace.bookmarkLabel
            : selectedPlace.place_name,
          mode: mode || "TRANSIT",
        },
      });

    if (isBookmark) {
      goNext();
    } else {
      Alert.alert("북마크 등록", "이 장소를 북마크로 등록하시겠습니까?", [
        {
          text: "예",
          onPress: () =>
            router.push({
              pathname: "/pages/transport/bookmarkSetting",
              params: {
                lat: selectedPlace.y,
                lng: selectedPlace.x,
                placeName: selectedPlace.place_name,
                address: selectedPlace.address_name,
                startLat,
                startLng,
                mode: mode || "TRANSIT",
              },
            }),
        },
        { text: "아니오", style: "cancel", onPress: goNext },
      ]);
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="목적지 선택" className="px-pageX font-sf-b" />

      {/* 🔎 검색창 */}
      <View className="px-pageX mt-5">
        <View className="flex-row items-center bg-white rounded-xl px-3 py-4 shadow-md shadow-black/5">
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.Colors.green}
            className="mr-2"
          />
          <TextInput
            placeholder="목적지를 검색하세요"
            value={query}
            onChangeText={setQuery}
            className="flex-1 font-sf-md text-gray-800"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {/* 검색 결과 */}
      <View className="px-pageX mt-6">
        <Text className="font-sf-b text-xl text-gray-800 mb-3">검색 결과</Text>
        <View className="h-[200px] rounded-xl bg-[#E0F2F1]">
          {loading ? (
            <ActivityIndicator className="mt-3" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(_, idx) => "s-" + idx}
              renderItem={({ item }) => (
                <PlaceCard
                  item={item}
                  isBookmark={false}
                  isSelected={selectedPlace?.id === item.id} // ✅ 선택 여부 전달
                  onSelect={setSelectedPlace} // ✅ 선택 이벤트 전달
                />
              )}
              ListEmptyComponent={
                <Text className="font-sf-md text-gray-400 text-center mt-4">
                  검색 결과가 없습니다.
                </Text>
              }
            />
          )}
        </View>
      </View>

      {/* 북마크 */}
      <View className="px-pageX mt-8 flex-1">
        <Text className="font-sf-b text-xl text-gray-800 mb-3">내 북마크</Text>
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => "b-" + item.bookmarkId}
          renderItem={({ item }) => (
            <PlaceCard
              item={item}
              isBookmark
              isSelected={selectedPlace?.bookmarkId === item.bookmarkId} // ✅ 선택 여부 전달
              onSelect={setSelectedPlace} // ✅ 선택 이벤트 전달
            />
          )}
          ListEmptyComponent={
            <Text className="font-sf-md text-gray-400 mt-4 text-center">
              등록된 북마크가 없습니다.
            </Text>
          }
        />
      </View>

      {/* 확인 버튼 */}
      <View className="px-pageX mb-8">
        <MainButton label="확인" onPress={handleConfirm} />
      </View>
    </View>
  );
}
