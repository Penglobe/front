import React, {
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import { View, Text, ScrollView, FlatList } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import Svg, { Path, G, Text as SvgText, Rect } from "react-native-svg";
import geojson from "@assets/map/krmap.json";

export default function RegionRanking({
  selectedRegion,
  setSelectedRegion,
  rankingData,
}) {
  const scrollViewRef = useRef(null);
  const setScrollViewRef = useCallback((node) => {
    // This log is crucial to see if the ScrollView is mounting
    console.log(
      "[setScrollViewRef] Callback fired. Node:",
      node ? "EXISTS" : "NULL"
    );
    if (node) {
      scrollViewRef.current = node;
      console.log("[setScrollViewRef] scrollViewRef.current has been SET.");
    } else {
      console.log(
        "[setScrollViewRef] scrollViewRef.current has been UNSET (component unmounted)."
      );
    }
  }, []);
  const [mapLayout, setMapLayout] = useState(null);
  const scrollViewHeight = useRef(0);
  const ITEM_HEIGHT = 72.66668701171875; // Exact item height

  // 지도 데이터 계산

  // 지도 데이터 계산
  const mapData = useMemo(() => {
    if (!mapLayout) return null;

    const mainlandFeatures = geojson.features.filter(
      (f) => f.properties.title !== "제주특별자치도"
    );
    const jejuFeature = geojson.features.find(
      (f) => f.properties.title === "제주특별자치도"
    );
    if (!jejuFeature) return null;

    const getBBox = (features) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      features.forEach((feature) => {
        const polys =
          feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        polys.forEach((poly) =>
          poly.forEach((ring) =>
            ring.forEach(([x, y]) => {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            })
          )
        );
      });
      return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    };

    const mainlandBBox = getBBox(mainlandFeatures);
    const { width: mapContainerWidth, height: mapContainerHeight } = mapLayout;

    const mainScale = Math.min(
      (mapContainerWidth - 40) / mainlandBBox.width,
      (mapContainerHeight - 40) / mainlandBBox.height
    );
    const mainOffsetX =
      (mapContainerWidth - mainlandBBox.width * mainScale) / 2 -
      mainlandBBox.minX * mainScale;
    const mainOffsetY =
      (mapContainerHeight - mainlandBBox.height * mainScale) / 2 -
      mainlandBBox.minY * mainScale;

    // 제주도 인셋
    const jejuBBox = getBBox([jejuFeature]);
    const insetWidth = 60,
      insetHeight = 80,
      insetPadding = 20;
    const insetX = insetPadding,
      insetY = mapContainerHeight - insetHeight - insetPadding;
    const jejuScale = Math.min(
      (insetWidth - 30) / jejuBBox.width,
      (insetHeight - 30) / jejuBBox.height
    );
    const jejuOffsetX =
      insetX +
      (insetWidth - jejuBBox.width * jejuScale) / 2 -
      jejuBBox.minX * jejuScale;
    const jejuOffsetY =
      insetY +
      (insetHeight - jejuBBox.height * jejuScale) / 2 +
      jejuBBox.maxY * jejuScale;

    // 중심 좌표
    const centerCoords = geojson.features.reduce((acc, feature) => {
      const title = feature.properties.title;
      const isJeju = title === "제주특별자치도";
      const bbox = getBBox([feature]);
      let centerX = bbox.minX + bbox.width / 2;
      let centerY = bbox.minY + bbox.height / 2;

      switch (title) {
        case "경상북도":
          centerX -= 25000;
          break;
        case "전라남도":
          centerX += 15000;
          break;
      }

      acc[title] = isJeju
        ? {
            x: centerX * jejuScale + jejuOffsetX,
            y: jejuOffsetY - centerY * jejuScale,
          }
        : {
            x: centerX * mainScale + mainOffsetX,
            y: mapContainerHeight - (centerY * mainScale + mainOffsetY),
          };

      return acc;
    }, {});

    return {
      mainlandFeatures,
      jejuFeature,
      mainScale,
      mainOffsetX,
      mainOffsetY,
      jejuScale,
      jejuOffsetX,
      jejuOffsetY,
      insetRect: {
        x: insetX,
        y: insetY,
        width: insetWidth,
        height: insetHeight,
      },
      centerCoords,
      mapContainerHeight,
    };
  }, [mapLayout]);

  // 카드로 스크롤
  const scrollToRegion = (regionName) => {
    if (!scrollViewRef.current) {
      console.log("[scrollToRegion] ScrollView ref not ready yet.");
      return;
    }

    const index = rankingData.findIndex((item) => item.regionName === regionName);

    if (index !== -1) {
      const listHeight = scrollViewHeight.current;
      if (listHeight === 0) {
        console.log("[scrollToRegion] ScrollView height is not ready, retrying...");
        setTimeout(() => scrollToRegion(regionName), 100);
        return;
      }

      // Calculate offset to center the item
      const itemY = index * ITEM_HEIGHT;
      const scrollY = Math.max(0, itemY - listHeight / 2 + ITEM_HEIGHT / 2);

      console.log(
        `[scrollToRegion] Scrolling to offset ${scrollY} for index ${index}`
      );
      scrollViewRef.current.scrollToOffset({ offset: scrollY, animated: false });
    } else {
      console.log(`[scrollToRegion] Could not find index for ${regionName}`);
    }
  };

  const handleRegionPress = (title) => {
    console.log("handleRegionPress:", title);
    setSelectedRegion(title);
    scrollToRegion(title);
  };

  // 초기 선택 지역 자동 스크롤
  useEffect(() => {
    if (selectedRegion) scrollToRegion(selectedRegion);
  }, [selectedRegion, rankingData]);

  return (
    <View style={{ flex: 1 }}>
      {/* 지도 */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setMapLayout(e.nativeEvent.layout)}
      >
        {mapData && (
          <Svg width="100%" height="100%">
            <G>
              {mapData.mainlandFeatures.map((feature) => {
                const title = feature.properties.title;
                const isSelected = selectedRegion === title;
                const polygons =
                  feature.geometry.type === "Polygon"
                    ? [feature.geometry.coordinates]
                    : feature.geometry.coordinates;

                return (
                  <G key={feature.properties.id}>
                    {polygons.map((polygon, p_idx) => {
                      const d =
                        "M" +
                        polygon[0]
                          .map(
                            ([x, y]) =>
                              `${x * mapData.mainScale + mapData.mainOffsetX},${mapData.mapContainerHeight - (y * mapData.mainScale + mapData.mainOffsetY)}`
                          )
                          .join("L") +
                        "Z";
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
            </G>

            {/* 제주도 인셋 */}
            <G>
              <Rect
                x={mapData.insetRect.x}
                y={mapData.insetRect.y}
                width={mapData.insetRect.width}
                height={mapData.insetRect.height}
                fill="#f0f0f0"
                stroke="#999"
                strokeWidth={1}
              />
              {(() => {
                const feature = mapData.jejuFeature;
                const polygons =
                  feature.geometry.type === "Polygon"
                    ? [feature.geometry.coordinates]
                    : feature.geometry.coordinates;
                return polygons.map((polygon, p_idx) => {
                  const title = feature.properties.title;
                  const isSelected = selectedRegion === title;
                  const d =
                    "M" +
                    polygon[0]
                      .map(
                        ([x, y]) =>
                          `${x * mapData.jejuScale + mapData.jejuOffsetX},${mapData.jejuOffsetY - y * mapData.jejuScale}`
                      )
                      .join("L") +
                    "Z";
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
                });
              })()}
            </G>

            {/* 라벨 */}
            {selectedRegion && mapData.centerCoords[selectedRegion] && (
              <SvgText
                x={mapData.centerCoords[selectedRegion].x}
                y={mapData.centerCoords[selectedRegion].y}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={16}
                fontWeight="bold"
                fill="white"
                stroke="black"
                strokeWidth={0.5}
              >
                {selectedRegion}
              </SvgText>
            )}
          </Svg>
        )}
      </View>

      {/* 카드 리스트 */}
      <View style={{ flex: 1, paddingHorizontal: 10, marginTop: 10 }}>
        <Text
          style={{
            textAlign: "center",
            color: "#4CAF50",
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          지역별 탄소 절감량 랭킹
        </Text>
        <FlatList
          style={{ flex: 1 }}
          ref={setScrollViewRef}
          data={rankingData}
          keyExtractor={(item) => item.rank + item.regionName}
          getItemLayout={(data, index) => ({
            length: 72.66668701171875, // Exact height
            offset: 72.66668701171875 * index,
            index,
          })}
          onLayout={(e) =>
            (scrollViewHeight.current = e.nativeEvent.layout.height)
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isProminent = item.regionName === selectedRegion;
            return (
              <View>
                <RankingCard
                  item={{
                    rank: item.rank,
                    nickname: item.regionName,
                    score: item.totalCo2,
                  }}
                  isProminent={isProminent}
                  onPress={() => handleRegionPress(item.regionName)}
                />
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}
