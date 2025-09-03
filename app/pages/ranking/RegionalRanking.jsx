import React, { useRef } from "react";
import { View, Text, Dimensions, ScrollView } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import geojson from "@assets/map/krmap.json";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function RegionalRanking({
  selectedRegion,
  setSelectedRegion,
  rankingData,
}) {
  const scrollViewRef = useRef(null);
  const layoutMap = useRef({});

  const handleRegionPress = (title) => {
    setSelectedRegion(title);
    const yPosition = layoutMap.current[title];
    if (yPosition !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yPosition, animated: true });
    }
  };

  // Map calculation logic
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
    <View style={{ flex: 1, flexDirection: "column" }}>
      {/* 2. 지도 흰색 박스 */}
      <View className="bg-white rounded-2xl p-2 shadow" style={{ flex: 1 }}>
        <View style={{ width: "100%", height: "100%" }}>
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
                                  screenHeight / 3 - (y * scale + offsetY)
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
                        onPressIn={() => handleRegionPress(title)}
                      />
                    );
                  })}
                </G>
              );
            })}
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
      <View
        className="bg-deactivateButton/75 rounded-2xl p-4"
        style={{ flex: 1 }}
      >
        <Text className="text-white font-sf-b text-lg mb-2">
          지역별 탄소 절감량 Top 5
        </Text>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {rankingData.map((item) => {
            const isProminent = item.regionName === selectedRegion; // Highlight selected region
            return (
              <View
                key={item.rank}
                onLayout={(event) => {
                  layoutMap.current[item.regionName] =
                    event.nativeEvent.layout.y;
                }}
              >
                <RankingCard item={item} isProminent={isProminent} />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
