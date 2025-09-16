// 루트 엔트리: UI가 뜨지 않아도 항상 로드됨 (Headless에서도!)
import "./tasks/transportTrackingTask"; // ✅ 전역 BG 태스크 등록
import "expo-router/entry";                 // ✅ Router 엔트리
