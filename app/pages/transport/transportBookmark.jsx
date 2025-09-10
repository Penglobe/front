import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { searchAddress, listBookmarks } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Ionicons } from "@expo/vector-icons";
import colors from "@constants/Colors.cjs";
import PlaceCard from "@components/PlaceCard";

export default function TransportBookmark() {
  const { startLat, startLng, mode: rawMode } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT";

  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // ✅ 북마크 불러오기
  const fetchBookmarks = useCallback(async () => {
    try {
      const data = await listBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("북마크 조회 실패:", err);
      Alert.alert("북마크 조회 실패", "잠시 후 다시 시도해주세요.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [fetchBookmarks])
  );

  // ✅ 주소 검색
  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      const data = await searchAddress(query);
      setSearchResults(data.documents || []);
    } catch (err) {
      console.error("주소 검색 실패:", err);
      Alert.alert("주소 검색 실패", "카카오 API 호출에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 출발 버튼
  const handleConfirm = () => {
    if (!selectedPlace) {
      Alert.alert("목적지를 선택해주세요.");
      return;
    }

    const isBookmark = !!selectedPlace.bookmarkId;

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
        mode,
      },
    });
  };

  // ✅ 북마크 추가 버튼
  const handleAddBookmark = (place) => {
    router.push({
      pathname: "/pages/transport/bookmarkSetting",
      params: {
        lat: place.y,
        lng: place.x,
        placeName: place.place_name,
        address: place.address_name,
        startLat,
        startLng,
        mode,
      },
    });
  };

  // ✅ 북마크 상세보기 버튼
  const handleDetail = (bookmark) => {
    router.push({
      pathname: "/pages/transport/bookmarkDetail",
      params: {
        bookmarkId: bookmark.bookmarkId,
        bookmarkLabel: bookmark.bookmarkLabel,
        address: bookmark.address,
        currentLat: bookmark.lat,
        currentLng: bookmark.lng,
      },
    });
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

      {/* 🔎 검색 결과 */}
      {query.trim().length > 0 && (
        <View className="px-pageX mt-6">
          <Text className="font-sf-b text-xl text-gray-800 mb-3">
            검색 결과
          </Text>
          <View className="h-[200px] rounded-xl bg-[#E0F2F1]">
            {loading ? (
              <ActivityIndicator className="mt-3" />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item, idx) =>
                  item.id || `s-${item.x}-${item.y}-${idx}`
                }
                renderItem={({ item }) => (
                  <PlaceCard
                    item={item}
                    isBookmark={false}
                    isSelected={
                      !selectedPlace?.bookmarkId &&
                      selectedPlace?.x === item.x &&
                      selectedPlace?.y === item.y
                    }
                    onSelect={setSelectedPlace}
                    onAdd={handleAddBookmark}
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
      )}

      {/* 북마크 */}
      <View className="px-pageX mt-8 flex-1">
        <View className="flex-row justify-between items-center mt-2 mb-3">
          <Text className="font-sf-b text-xl text-gray-800">내 북마크</Text>
        </View>

        <FlatList
          data={bookmarks}
          keyExtractor={(item) => "b-" + item.bookmarkId}
          renderItem={({ item }) => (
            <PlaceCard
              item={item}
              isBookmark
              isSelected={selectedPlace?.bookmarkId === item.bookmarkId}
              onSelect={setSelectedPlace}
              onDetail={handleDetail}
            />
          )}
          ListEmptyComponent={
            <Text className="font-sf-md text-gray-400 mt-4 text-center">
              등록된 북마크가 없습니다.
            </Text>
          }
        />
      </View>

      {/* ✅ 공통 출발 버튼 */}
      <View className="px-pageX mb-10">
        <MainButton label="출발" onPress={handleConfirm} />
      </View>
    </View>
  );
}
