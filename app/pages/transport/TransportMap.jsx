import React, { useState, useRef } from "react";
import { View, Text, Button } from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY } from "@env";
import { transportService } from "@services/transportService";

export default function TransportMap({ navigation, route }) {
  const { userId } = route.params;
  const [selected, setSelected] = useState(null);
  const webViewRef = useRef(null);

  const html = `
    <html><head><meta charset="utf-8" />
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services"></script>
    </head><body style="margin:0">
      <input id="search" placeholder="장소 검색" style="position:absolute;top:10px;left:10px;z-index:999;width:80%"/>
      <div id="map" style="width:100%;height:100%"></div>
      <script>
        var map = new kakao.maps.Map(document.getElementById('map'), {
          center: new kakao.maps.LatLng(37.5665, 126.9780),
          level: 3
        });

        var ps = new kakao.maps.services.Places();
        var markers = [];

        function clearMarkers(){ markers.forEach(m => m.setMap(null)); markers=[]; }

        function searchPlaces(keyword){
          ps.keywordSearch(keyword, function(data, status){
            if (status === kakao.maps.services.Status.OK) {
              clearMarkers();
              var bounds = new kakao.maps.LatLngBounds();
              data.forEach(place => {
                var marker = new kakao.maps.Marker({
                  map: map,
                  position: new kakao.maps.LatLng(place.y, place.x)
                });
                markers.push(marker);
                kakao.maps.event.addListener(marker, "click", function(){
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    name: place.place_name,
                    lat: place.y,
                    lng: place.x
                  }));
                });
                bounds.extend(new kakao.maps.LatLng(place.y, place.x));
              });
              map.setBounds(bounds);
            }
          });
        }

        document.getElementById("search").addEventListener("keydown", e => {
          if(e.key === "Enter") searchPlaces(e.target.value);
        });
      </script>
    </body></html>
  `;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) => setSelected(JSON.parse(event.nativeEvent.data))}
      />

      {selected && (
        <View className="p-4 bg-white">
          <Text>선택: {selected.name}</Text>
          <Button
            title="북마크 저장"
            onPress={async () => {
              await transportService.createBookmark(userId, {
                name: selected.name,
                lat: selected.lat,
                lng: selected.lng,
              });
              alert("북마크 저장 완료!");
            }}
          />
          <Button
            title="다음"
            onPress={() =>
              navigation.navigate("TransportFinish", { destination: selected })
            }
          />
        </View>
      )}
    </View>
  );
}
