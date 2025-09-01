import React from "react";
import { View, Text } from "react-native";
import StepPill from "./StepPill";

/**
 * props:
 * - title: 섹션 타이틀
 * - icon:  아이콘 JSX
 * - slots: MissionSlotDTO[] (4칸)
 * - onClaim(metric, target)
 * - unit: "kg" | "일" (문구 표시용)
 * - accent: "default" | "yellow" (라인 색감 변경용, 선택)
 * - simpleBar: true면 아래 바 모드로 대체적 표현(출석용)
 */
export default function MissionSection({
  title,
  icon,
  slots,
  onClaim,
  unit = "kg",
  accent = "default",
  simpleBar = false,
}) {
  const progress = Number(slots?.[0]?.progress ?? 0);
  const firstTarget = Number(slots?.[0]?.target ?? 0);
  const lastTarget = Number(slots?.[slots?.length - 1]?.target ?? 0);
  const range = Math.max(1, lastTarget - firstTarget);
  // 첫 타겟부터 마지막 타겟 사이에서의 진행 비율 (0~1로 클램프)
  const progressPct = Math.max(
    0,
    Math.min(1, (progress - firstTarget) / range)
  );

  return (
    <View
      className="bg-white rounded-2xl px-4 py-4 mt-4 shadow-md"
      style={{ elevation: 4 }}
    >
      {/* 타이틀 */}
      <View className="flex-row items-center mb-3">
        <View className="mr-2">{icon}</View>
        <Text className="text-xl font-extrabold text-black">{title}</Text>
        {unit === "kg" && <Text className="text-[#D1D5DB] ml-1">(kg)</Text>}
      </View>

      {/* 바 모드(출석) */}
      {simpleBar ? (
        <View className="w-full mt-1">
          <View className="h-4 bg-[#D1D5DB] rounded-full overflow-hidden">
            <View
              className="h-4 bg-[#065A93] rounded-full"
              style={{
                width: `${Math.min(100, (progress / lastTarget) * 100)}%`,
              }}
            />
          </View>
          <Text className="mt-2 text-[#0C092A] font-bold">
            {progress}/{lastTarget}
          </Text>
        </View>
      ) : (
        // 스텝 4칸
        <View className="mt-1">
          {/* 연결 라인: 원형 중심까지만 그리기 (양쪽 32px 잘라내기) */}
          <View className="absolute left-0 right-0 top-5">
            {/* 회색 베이스 라인 */}
            <View className="h-2 bg-[#E5E7EB] rounded-full mx-8" />
            {/* 진행 라인 */}
            <View
              className="h-2 rounded-full mx-8 -mt-2"
              style={{
                width: `${progressPct * 100}%`,
                backgroundColor: accent === "yellow" ? "#FDE68A" : "#A7F3D0",
              }}
            />
          </View>
          <View className="flex-row justify-between">
            {slots?.map((slot, idx) => (
              <StepPill key={idx} slot={slot} onClaim={onClaim} unit={unit} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
