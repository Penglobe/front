import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import geojson from "@assets/map/krmap.json";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const tabs = [
  { key: "regions", label: "지역 랭킹" },
  { key: "weekly", label: "주간 랭킹" },
  { key: "global", label: "전체 랭킹" },
];

function RankingContent({ activeTab }) {
  switch (activeTab) {
    case "weekly":
      return <Text>주간 랭킹 페이지입니다.</Text>;
    case "global":
      return <Text>전체 랭킹 페이지입니다.</Text>;
    default:
      return null;
  }
}

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("regions");
  const [selectedRegion, setSelectedRegion] = useState(null);

  // 지도 좌표 범위 계산
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  geojson.features.forEach((f) => {
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
    polys.forEach((polygon) =>
      polygon.forEach((ring) =>
        ring.forEach(([x, y]) => {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        })
      )
    );
  });

  const mapWidth = maxX - minX;
  const mapHeight = maxY - minY;
  const scaleX = (screenWidth - 40) / mapWidth;
  const scaleY = (screenHeight / 3 - 40) / mapHeight;
  const zoomFactor = 1.2;
  const scale = Math.min(scaleX, scaleY) * zoomFactor;

  const offsetX = (screenWidth - mapWidth * scale) / 2 - minX * scale - 30;
  const offsetY = (screenHeight / 3 - mapHeight * scale) / 2 - minY * scale;

  // 각 지역의 중심 좌표를 미리 계산
  const centerCoords = geojson.features.reduce((acc, feature) => {
    const title = feature.properties.title;
    let fminX = Infinity,
      fmaxX = -Infinity,
      fminY = Infinity,
      fmaxY = -Infinity;

    const polys =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

    polys.forEach((polygon) =>
      polygon.forEach((ring) =>
        ring.forEach(([x, y]) => {
          if (x < fminX) fminX = x;
          if (x > fmaxX) fmaxX = x;
          if (y < fminY) fminY = y;
          if (y > fmaxY) fmaxY = y;
        })
      )
    );

    const centerX = (fminX + fmaxX) / 2;
    const centerY = (fminY + fmaxY) / 2;

    acc[title] = {
      x: centerX * scale + offsetX,
      y: screenHeight / 3 - (centerY * scale + offsetY),
    };
    return acc;
  }, {});

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

          {activeTab === "regions" ? (
            <>
              {/* 2. 지도 흰색 박스 */}
              <View className="bg-white rounded-2xl p-2 shadow">
                <View style={{ width: "100%", height: screenHeight / 3 }}>
                  <Svg width="100%" height="100%">
                    {geojson.features.map((feature, idx) => {
                      const coords =
                        feature.geometry.type === "Polygon"
                          ? [feature.geometry.coordinates]
                          : feature.geometry.coordinates;

                      const title = feature.properties.title;
                      const isSelected = selectedRegion === title;

                      return (
                        <G key={idx}>
                          {coords.map((polygon, p_idx) => {
                            const d = polygon
                              .map(
                                (ring) =>
                                  "M" +
                                  ring
                                    .map(
                                      ([x, y]) =>
                                        `${x * scale + offsetX},${
                                          screenHeight / 3 -
                                          (y * scale + offsetY) // Note: This will be fixed next
                                        }`
                                    )
                                    .join("L") +
                                  "Z"
                              )
                              .join(" ");

                            return (
                              <Path
                                key={p_idx}
                                d={d}
                                fill={isSelected ? "#4CAF50" : "#BDBDBD"}
                                stroke="#333"
                                strokeWidth={0.5}
                                onPressIn={() => setSelectedRegion(title)}
                              />
                            );
                          })}
                        </G>
                      );
                    })}
                    {/* 선택된 지역 이름 표시 */}
                    {selectedRegion && centerCoords[selectedRegion] && (
                      <SvgText
                        x={centerCoords[selectedRegion].x}
                        y={centerCoords[selectedRegion].y}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill="white"
                        stroke="black"
                        strokeWidth={0.5}
                      >
                        {selectedRegion}
                      </SvgText>
                    )}
                  </Svg>
                </View>
              </View>

              {/* 3. 랭킹 리스트 박스 */}
              <View className="flex-1 bg-deactivateButton/75 rounded-2xl p-4 mt-4">
                <Text className="text-white font-sf-b text-lg mb-2">
                  지역별 탄소 절감량 Top 5
                </Text>
                <View>
                  <Text className="text-white font-sf-r text-base">
                    1. 서울특별시
                  </Text>
                  <Text className="text-white font-sf-r text-base">
                    2. 경기도
                  </Text>
                  <Text className="text-white font-sf-r text-base">
                    3. 부산광역시
                  </Text>
                  <Text className="text-white font-sf-r text-base">
                    4. 인천광역시
                  </Text>
                  <Text className="text-white font-sf-r text-base">
                    5. 경상남도
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <RankingContent activeTab={activeTab} />
          )}
        </View>
      </View>
    </View>
  );
}
