import React, { useRef, useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import Svg, { Path, G, Text as SvgText, Rect } from "react-native-svg";
import geojson from "@assets/map/krmap.json";

export default function RegionRanking({
  selectedRegion,
  setSelectedRegion,
  rankingData,
}) {
  const scrollViewRef = useRef(null);
  const layoutMap = useRef({});
  const [mapLayout, setMapLayout] = useState(null);
  const scrollViewHeight = useRef(0);

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

    // 1. Mainland Map Calculation
    const mainlandBBox = getBBox(mainlandFeatures);
    const mapContainerWidth = mapLayout.width;
    const mapContainerHeight = mapLayout.height;

    const mainScaleX = (mapContainerWidth - 40) / mainlandBBox.width;
    const mainScaleY = (mapContainerHeight - 40) / mainlandBBox.height;
    const mainScale = Math.min(mainScaleX, mainScaleY);

    const mainOffsetX =
      (mapContainerWidth - mainlandBBox.width * mainScale) / 2 -
      mainlandBBox.minX * mainScale;
    const mainOffsetY =
      (mapContainerHeight - mainlandBBox.height * mainScale) / 2 -
      mainlandBBox.minY * mainScale;

    // 2. Jeju Inset Map Calculation
    const jejuBBox = getBBox([jejuFeature]);
    const insetWidth = 60;
    const insetHeight = 80;
    const insetPadding = 20;
    const insetX = insetPadding;
    const insetY = mapContainerHeight - insetHeight - insetPadding;

    const jejuInternalPadding = 15;
    const jejuScaleX = (insetWidth - jejuInternalPadding * 2) / jejuBBox.width;
    const jejuScaleY =
      (insetHeight - jejuInternalPadding * 2) / jejuBBox.height;
    const jejuScale = Math.min(jejuScaleX, jejuScaleY);

    const jejuOffsetX =
      insetX +
      (insetWidth - jejuBBox.width * jejuScale) / 2 -
      jejuBBox.minX * jejuScale;
    const jejuOffsetY =
      insetY +
      (insetHeight - jejuBBox.height * jejuScale) / 2 +
      jejuBBox.maxY * jejuScale;

    // 3. Center Coords for Labels
    const centerCoords = geojson.features.reduce((acc, feature) => {
      const title = feature.properties.title;
      const isJeju = title === "제주특별자치도";
      const bbox = getBBox([feature]);
      let centerX = bbox.minX + bbox.width / 2;
      let centerY = bbox.minY + bbox.height / 2;

      // Manual label position adjustments for specific regions
      switch (title) {
        case "경상북도":
          centerX -= 25000;
          break;
        case "전라남도":
          centerX += 15000;
          break;
      }

      if (isJeju) {
        acc[title] = {
          x: centerX * jejuScale + jejuOffsetX,
          y: jejuOffsetY - centerY * jejuScale,
        };
      } else {
        acc[title] = {
          x: centerX * mainScale + mainOffsetX,
          y: mapContainerHeight - (centerY * mainScale + mainOffsetY),
        };
      }
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

  const handleRegionPress = (title) => {
    setSelectedRegion(title);
    const cardLayout = layoutMap.current[title];
    if (cardLayout && scrollViewRef.current && scrollViewHeight.current > 0) {
      const yPosition = cardLayout.y;
      const cardHeight = cardLayout.height;
      const svHeight = scrollViewHeight.current;

      const scrollToY = yPosition - svHeight / 2 + cardHeight / 2;
      const finalY = Math.max(0, scrollToY);

      scrollViewRef.current.scrollTo({ y: finalY, animated: true });
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View
        className="bg-white rounded-2xl p-2 shadow"
        style={{ flex: 1 }}
        onLayout={(event) => setMapLayout(event.nativeEvent.layout)}
      >
        {mapData && (
          <Svg width="100%" height="100%">
            {/* Mainland */}
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
                              `${x * mapData.mainScale + mapData.mainOffsetX},${
                                mapData.mapContainerHeight -
                                (y * mapData.mainScale + mapData.mainOffsetY)
                              }`
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

            {/* Jeju Inset */}
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
                          `${x * mapData.jejuScale + mapData.jejuOffsetX},${
                            mapData.jejuOffsetY - y * mapData.jejuScale
                          }`
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

            {/* Labels */}
            {selectedRegion && mapData.centerCoords[selectedRegion] && (
              <SvgText
                x={mapData.centerCoords[selectedRegion].x}
                y={mapData.centerCoords[selectedRegion].y}
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
        )}
      </View>

      <View
        className="bg-deactivateButton/75 rounded-2xl p-4"
        style={{ flex: 1 }}
      >
        <Text className="text-white font-sf-b text-lg mb-2">
          지역별 탄소 절감량 랭킹
        </Text>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          onLayout={(event) => {
            scrollViewHeight.current = event.nativeEvent.layout.height;
          }}
        >
          {rankingData.map((item) => {
            const isProminent = item.regionName === selectedRegion;
            return (
              <View
                key={item.rank}
                onLayout={(event) => {
                  layoutMap.current[item.regionName] = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <RankingCard
                  item={item}
                  isProminent={isProminent}
                  onPress={() => handleRegionPress(item.regionName)}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
