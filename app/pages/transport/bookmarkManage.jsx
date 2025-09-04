import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { listBookmarks, deleteBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import PlaceCard from "@components/PlaceCard";
import { Feather } from "@expo/vector-icons";
import Colors from "@constants/Colors.cjs";

export default function BookmarkManage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const userId = 1; // TODO: 로그인된 유저 ID 가져오기

  const fetchData = async () => {
    try {
      const data = await listBookmarks(userId);
      setBookmarks(data);
    } catch (err) {
      console.error("북마크 조회 실패:", err);
      Alert.alert("북마크 조회 실패");
    }
  };

  // ✅ 화면 focus될 때마다 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleDelete = async (id) => {
    try {
      await deleteBookmark(id);
      Alert.alert("삭제 성공", "북마크가 삭제되었습니다.");
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert("삭제 실패", "서버 오류가 발생했습니다.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="북마크 관리" />

      <View className="px-pageX flex-1 mt-4">
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => "m-" + item.bookmarkId}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between mb-3">
              {/* 왼쪽: 장소 정보 */}
              <View className="flex-1 mr-3">
                <PlaceCard item={item} isBookmark readOnly />
              </View>

              {/* 오른쪽: 버튼 묶음 (수직 배치) */}
              <View className="flex-col items-stretch w-[80px]">
                {/* ✅ 수정 버튼 (파란색 배경 + 아이콘) */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/pages/transport/bookmarkEdit", // ✅ 수정 전용 페이지 이동
                      params: {
                        bookmarkId: item.bookmarkId,
                        lat: item.lat,
                        lng: item.lng,
                        placeName: item.bookmarkLabel,
                        address: item.address,
                      },
                    })
                  }
                  className="py-2 bg-green rounded-lg mb-2 flex-row items-center justify-center"
                >
                  <Feather name="edit-3" size={16} color="white" />
                  <Text className="text-white font-sf-md ml-1">수정</Text>
                </TouchableOpacity>

                {/* ✅ 삭제 버튼 (빨간색 배경 + 아이콘) */}
                <TouchableOpacity
                  onPress={() => handleDelete(item.bookmarkId)}
                  className="py-2 bg-darkGray rounded-lg flex-row items-center justify-center"
                >
                  <Feather name="trash" size={16} color="white" />
                  <Text className="text-white font-sf-md ml-1">삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="font-sf-md text-gray-400 mt-10 text-center">
              등록된 북마크가 없습니다.
            </Text>
          }
        />
      </View>

      <View className="px-pageX mb-8">
        <MainButton label="뒤로가기" onPress={() => router.back()} />
      </View>
    </View>
  );
}
