import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Button,
  Text,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY } from "@env";
import * as Location from "expo-location";
import useTransport from "./useTransport";

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const { mode, setMode, activityId, startTransport, stopTransport } =
    useTransport();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const html = `
    <html><head><meta charset="utf-8" />
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}"></script>
    </head><body style="margin:0"><div id="map" style="width:100%;height:100%"></div>
    <script>
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${location.latitude}, ${location.longitude}), level: 3
      });
      var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${location.latitude}, ${location.longitude})
      });
      marker.setMap(map);
    </script></body></html>
  `;

  return (
    <View style={styles.container}>
      <WebView originWhitelist={["*"]} source={{ html }} style={{ flex: 1 }} />

      <View style={styles.modeContainer}>
        {["WALK", "BIKE", "TRANSIT"].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.selected]}
            onPress={() => setMode(m)}
            disabled={!!activityId}
          >
            <Text style={{ color: mode === m ? "#fff" : "#000" }}>
              {m === "WALK" ? "도보" : m === "BIKE" ? "자전거" : "대중교통"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.controlContainer}>
        {!activityId ? (
          <Button title="이동 시작" onPress={startTransport} />
        ) : (
          <Button title="이동 종료" onPress={stopTransport} color="red" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#eee",
  },
  modeButton: { padding: 10, borderRadius: 5, backgroundColor: "#ccc" },
  selected: { backgroundColor: "#4CAF50" },
  controlContainer: { padding: 10, backgroundColor: "#fff" },
});
