import React, { useRef, useState } from "react";
import { View, Text, Button, FlatList, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY } from "@env";
import { transportService } from "@services/transportService";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";

export default function TransportBookmark() {
  const router = useRouter();
  const webViewRef = useRef(null);

  const { startLat, startLng } = useLocalSearchParams();

  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState(null);

  // ✅ 북마크 저장
  const saveBookmark = async () => {
    if (!selected) return;
    await transportService.createBookmark(1, {
      name: selected.name,
      lat: selected.lat,
      lng: selected.lng,
    });
    alert("북마크 저장 완료!");
  };

  // ✅ Kakao Map HTML
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services"></script>
      </head>
      <body style="margin:0">
        <div id="map" style="width:100%;height:100%"></div>
        <script>
          var map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(${startLat}, ${startLng}),
            level: 4
          });

          // ✅ 출발지 마커
          var startMarker = new kakao.maps.Marker({
            map: map,
            position: new kakao.maps.LatLng(${startLat}, ${startLng}),
            title: "출발지"
          });

          var ps = new kakao.maps.services.Places();
          var markers = [];

          function clearMarkers() {
            markers.forEach(m => m.setMap(null));
            markers = [];
          }

          // ✅ 장소 검색
          function searchPlaces(keyword) {
            ps.keywordSearch(keyword, function(data, status) {
              if (status === kakao.maps.services.Status.OK) {
                clearMarkers();
                var bounds = new kakao.maps.LatLngBounds();
                var results = [];

                data.forEach(place => {
                  var marker = new kakao.maps.Marker({
                    map: map,
                    position: new kakao.maps.LatLng(place.y, place.x)
                  });
                  markers.push(marker);

                  // ✅ 마커 클릭 → RN으로 장소 전달
                  kakao.maps.event.addListener(marker, "click", function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: "select",
                      place: { 
                        id: place.id,
                        name: place.place_name, 
                        address: place.road_address_name || place.address_name,
                        lat: place.y, 
                        lng: place.x 
                      }
                    }));
                  });

                  bounds.extend(new kakao.maps.LatLng(place.y, place.x));

                  results.push({
                    id: place.id,
                    name: place.place_name,
                    address: place.road_address_name || place.address_name,
                    lat: place.y,
                    lng: place.x
                  });
                });

                map.setBounds(bounds);

                // ✅ 검색 결과 RN으로 전달
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "results",
                  results: results
                }));
              }
            });
          }

          // ✅ RN → WebView 메세지
          document.addEventListener("message", function(event) {
            var msg = JSON.parse(event.data);
            if (msg.type === "search") {
              searchPlaces(msg.keyword);
            }
          });
        </script>
      </body>
    </html>
  `;

  // ✅ WebView → RN 메시지 핸들링
  const handleMessage = (event) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === "results") {
      setSearchResults(msg.results);
    } else if (msg.type === "select") {
      setSelected(msg.place);
    }
  };

  // ✅ RN → WebView 검색 요청
  const handleSearch = (keyword) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "search", keyword })
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <BgGradient />

      {/* ✅ 상단 헤더 */}
      <View className="flex-row items-center justify-between p-3 border-b mt-2">
        <Button title="← 뒤로가기" onPress={() => router.back()} />
        <Text className="text-lg font-bold">도착지 설정</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* ✅ 지도 */}
      <View className="flex-1 mt-2 mx-3 rounded-xl overflow-hidden shadow">
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={handleMessage}
        />
      </View>

      {/* ✅ 검색 결과 리스트 */}
      <View className="h-1/3 bg-white border-t p-3 mt-2 rounded-t-xl shadow">
        <Text className="text-lg font-bold mb-2">검색 결과</Text>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              className={`p-2 border-b ${
                selected?.id === item.id ? "bg-green-200" : ""
              }`}
            >
              <Text className="font-semibold">{item.name}</Text>
              <Text className="text-gray-500 text-sm">{item.address}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ✅ 선택한 도착지 */}
      {selected && (
        <View className="p-4 bg-white border-t mt-2 rounded-t-xl shadow">
          <Text className="mb-2">도착지: {selected.name}</Text>
          <Button title="북마크 저장" onPress={saveBookmark} />
          <Button
            title="다음"
            onPress={() =>
              router.push({
                pathname: "/pages/transport/TransportFinish",
                params: {
                  startLat,
                  startLng,
                  dest: JSON.stringify(selected),
                },
              })
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
