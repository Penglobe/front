import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import RegionRanking from "@pages/ranking/RegionRanking";
import WeeklyRanking from "@pages/ranking/WeeklyRanking";
import GlobalRanking from "@pages/ranking/GlobalRanking";
import { apiFetch, me } from "@services/authService";
import Constants from "expo-constants";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const tabs = [
  { key: "regions", label: "지역 랭킹" },
  { key: "weekly", label: "주간 랭킹" },
  { key: "global", label: "전체 랭킹" },
];

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("regions");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [rankingData, setRankingData] = useState([]);

  // 1. 마운트 시 사용자 지역 가져오기
  useEffect(() => {
    const fetchUserRegion = async () => {
      try {
        const userInfo = await me();

        if (userInfo && userInfo.regionName) {
          setSelectedRegion(userInfo.regionName);
        } else {
          console.warn("User region not found, defaulting to Seoul.");
          setSelectedRegion("서울특별시"); // 찾을 수 없을 경우 기본값
        }
      } catch (error) {
        console.error("Error fetching user info, defaulting to Seoul:", error);
        setSelectedRegion("서울특별시"); // 오류 발생 시 기본값
      }
    };
    fetchUserRegion();
  }, []);

  // 2. 탭 또는 지역 변경 시 랭킹 데이터 가져오기
  const fetchRegionRankingData = useCallback(async () => {
    if (!selectedRegion) return; // 지역이 설정되지 않은 경우 가져오지 않음

    try {
      const response = await apiFetch("/rankings/regions");

      if (!response.ok) {
        throw new Error(`Server response error: ${response.status}`);
      }

      const data = await response.json();
      setRankingData(data);
    } catch (error) {
      console.error("Error fetching region ranking:", error);
    }
  }, [selectedRegion]); // selectedRegion에 대한 의존성

  useEffect(() => {
    if (activeTab === "regions") {
      fetchRegionRankingData();
    }
  }, [activeTab, fetchRegionRankingData]);

  return (
    <View style={{ flex: 1 }}>
      <BgGradient />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 35,
        }}
      >
        <HeaderBar title="랭킹" />
        {/* 탭 메뉴 */}
        <View className="px-pageX mt-4">
          <View className="flex-row justify-center mb-4 gap-5">
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-lg py-xs rounded-full ${
                  activeTab === tab.key ? "bg-green" : "bg-deactivateButton"
                }`}
              >
                <Text
                  className={
                    activeTab === tab.key
                      ? "text-white font-bold text-[18px]"
                      : "text-green font-bold text-[18px]"
                  }
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 탭 내용 */}
        {activeTab === "regions" && (
          <RegionRanking
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            rankingData={rankingData}
          />
        )}
        {activeTab === "weekly" && (
          <WeeklyRanking fetchRegionRankingData={fetchRegionRankingData} />
        )}
        {activeTab === "global" && <GlobalRanking />}
      </View>
    </View>
  );
}
