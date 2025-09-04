import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import RegionRanking from "@pages/ranking/RegionRanking";
import WeeklyRanking from "@pages/ranking/WeeklyRanking";
import GlobalRanking from "@pages/ranking/GlobalRanking"; // Import the new component

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const tabs = [
  { key: "regions", label: "지역 랭킹" },
  { key: "weekly", label: "주간 랭킹" },
  { key: "global", label: "전체 랭킹" },
];

// RankingContent is no longer needed as we'll render components directly
// function RankingContent({ activeTab }) {
//   switch (activeTab) {
//     case "weekly":
//       return <Text>주간 랭킹 페이지입니다.</Text>;
//     case "global":
//       return <Text>전체 랭킹 페이지입니다.</Text>;
//     default:
//       return null;
//   }
// }

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("regions");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [rankingData, setRankingData] = useState([]);

  // 컴포넌트가 처음 로드될 때 한 번만 실행됩니다.
  useEffect(() => {
    // TODO: 추후 실제 사용자 정보로 지역을 설정하는 로직으로 교체해야 합니다.
    // 예시:
    // const { user } = useAuth();
    // if (user) {
    //   const profile = await getUserProfile();
    //   setSelectedRegion(profile.region);
    // }

    const dummyUserRegion = "서울특별시"; // 임시 데이터로 서울특별시를 기본 선택
    setSelectedRegion(dummyUserRegion);
  }, []); // 빈 배열은 첫 렌더링 시 한 번만 실행됨을 의미합니다.

  useEffect(() => {
    const fetchRankingData = async () => {
      // TODO: 백엔드 API가 구현되면 실제 함수로 교체해야 합니다.
      // const data = await getRegionalRankings();
      // setRankingData(data);

      // 임시 데이터
      const dummyRanking = [
        { regionName: "서울특별시", rank: 1, totalCo2: 10000 },
        { regionName: "경기도", rank: 2, totalCo2: 9500 },
        { regionName: "부산광역시", rank: 3, totalCo2: 9000 },
        { regionName: "인천광역시", rank: 4, totalCo2: 8500 },
        { regionName: "대구광역시", rank: 5, totalCo2: 8000 },
        { regionName: "광주광역시", rank: 6, totalCo2: 7500 },
        { regionName: "대전광역시", rank: 7, totalCo2: 7000 },
        { regionName: "울산광역시", rank: 8, totalCo2: 6500 },
        { regionName: "세종특별자치시", rank: 9, totalCo2: 6000 },
        { regionName: "강원도", rank: 10, totalCo2: 5500 },
        { regionName: "충청북도", rank: 11, totalCo2: 5000 },
        { regionName: "충청남도", rank: 12, totalCo2: 4500 },
        { regionName: "전라북도", rank: 13, totalCo2: 4000 },
        { regionName: "전라남도", rank: 14, totalCo2: 3500 },
        { regionName: "경상북도", rank: 15, totalCo2: 3000 },
        { regionName: "경상남도", rank: 16, totalCo2: 2500 },
        { regionName: "제주특별자치도", rank: 17, totalCo2: 2000 },
      ];
      setRankingData(dummyRanking);
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
