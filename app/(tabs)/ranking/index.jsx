import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import RegionRanking from "@pages/ranking/RegionRanking";
import WeeklyRanking from "@pages/ranking/WeeklyRanking";
import GlobalRanking from "@pages/ranking/GlobalRanking";
import { getAccessToken, me } from "@services/authService";
import Constants from "expo-constants";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const BASE_URL = Constants.expoConfig.extra.SERVER_URL;

const tabs = [
  { key: "regions", label: "지역 랭킹" },
  { key: "weekly", label: "주간 랭킹" },
  { key: "global", label: "전체 랭킹" },
];

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("regions");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [rankingData, setRankingData] = useState([]);

  // 1. Fetch user's region on mount
  useEffect(() => {
    const fetchUserRegion = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn("Not logged in, defaulting to Seoul.");
          setSelectedRegion("서울특별시");
          return;
        }
        const response = await fetch(`${BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user info: ${response.status}`);
        }

        const apiResponse = await response.json();
        const userInfo = apiResponse.data;

        console.log("Ranking index.jsx - User Info for Region:", userInfo);
        if (userInfo && userInfo.regionName) {
          setSelectedRegion(userInfo.regionName);
        } else {
          console.warn("User region not found, defaulting to Seoul.");
          setSelectedRegion("서울특별시"); // Default if not found
        }
      } catch (error) {
        console.error("Error fetching user info, defaulting to Seoul:", error);
        setSelectedRegion("서울특별시"); // Default on error
      }
    };
    fetchUserRegion();
  }, []);

  // 2. Fetch ranking data when tab or region changes
  const fetchRegionRankingData = useCallback(async () => {
    if (!selectedRegion) return; // Do not fetch if region is not set

    try {
      const token = await getAccessToken();
      if (!token) {
        console.warn("Not logged in, cannot fetch ranking data.");
        return;
      }

      const response = await fetch(`${BASE_URL}/rankings/regions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Server response error: ${response.status}`);
      }

      const data = await response.json();
      setRankingData(data);
    } catch (error) {
      console.error("Error fetching region ranking:", error);
    }
  }, [selectedRegion]); // Dependency on selectedRegion

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
          bottom: 0,
          paddingBottom: 100,
        }}
      >
        <HeaderBar title="랭킹" />

        {/* 1. 전체 반투명 박스 */}
        <View className="flex-1 bg-deactivateButton/50 rounded-3xl shadow px-4">
          {/* 탭 메뉴 */}
          <View>
            <View className="flex-row justify-center mb-4 gap-5">
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`px-4 py-1 rounded-full ${
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
    </View>
  );
}