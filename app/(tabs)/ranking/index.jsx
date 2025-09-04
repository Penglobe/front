import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import RegionRanking from "@pages/ranking/RegionRanking";
import WeeklyRanking from "@pages/ranking/WeeklyRanking";
import GlobalRanking from "@pages/ranking/GlobalRanking";
import { getAccessToken } from "@services/authService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const tabs = [
  { key: "regions", label: "지역 랭킹" },
  { key: "weekly", label: "주간 랭킹" },
  { key: "global", label: "전체 랭킹" },
];

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("regions");
  const [selectedRegion, setSelectedRegion] = useState("서울특별시"); // Revert to hardcoded default
  const [rankingData, setRankingData] = useState([]);

  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        const token = await getAccessToken(); // ✅ 토큰 가져오기
        if (!token) {
          console.warn("로그인 필요");
          return;
        }

        const updateResponse = await fetch(
          "http://192.168.0.79:8080/rankings/update-all",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`update-all 에러: ${updateResponse.status}`);
        }

        const response = await fetch(
          "http://192.168.0.79:8080/rankings/regions",
          {
            headers: {
              Authorization: `Bearer ${token}`, // ✅ JWT 붙이기
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`서버 응답 에러: ${response.status}`);
        }

        const data = await response.json();
        setRankingData(data);
      } catch (error) {
        console.error("Error fetching region ranking:", error);
      }
    };

    fetchRankingData();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <BgGradient />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 100,
        }}
      >
        <HeaderBar title="랭킹" />

        {/* 1. 전체 반투명 박스 */}
        <View className="flex-1 bg-deactivateButton/50 rounded-3xl p-4 shadow mx-4 my-4">
          {/* 탭 메뉴 */}
          <View>
            <View className="flex-row justify-center mb-4 gap-5">
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`px-5 py-2 rounded-full ${
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
          {activeTab === "weekly" && <WeeklyRanking />}
          {activeTab === "global" && <GlobalRanking />}
        </View>
      </View>
    </View>
  );
}
