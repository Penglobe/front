// MissionSection.jsx
import React from "react";
import { View, Text } from "react-native";
import StepPill from "./StepPill";

export default function MissionSection({
  title,
  icon,
  slots,
  onClaim,
  unit = "kg",
  accent = "default",
  simpleBar = false,
}) {
  // ✅ 구간 기반 진행도(0~1) 계산: 각 타겟 사이 비율까지 반영
  const calcProgressPct = (slots) => {
    if (!slots || slots.length === 0) return 0;

    const progress = Number(slots[0]?.progress ?? 0);
    const targets = slots.map((s) => Number(s.target)).sort((a, b) => a - b);

    // 타겟이 1개면(출석 카드 같은) 단순 비교
    if (targets.length === 1) {
      return progress >= targets[0]
        ? 1
        : Math.max(0, progress / Math.max(1, targets[0]));
    }

    const first = targets[0];
    const last = targets[targets.length - 1];

    if (progress <= first) return 0;
    if (progress >= last) return 1;

    // progress가 속한 구간 찾기
    let i = 0;
    for (; i < targets.length - 1; i++) {
      if (progress < targets[i + 1]) break;
    }
    // 구간 내 비율
    const segStart = targets[i];
    const segEnd = targets[i + 1];
    const segRatio = (progress - segStart) / (segEnd - segStart);

    // 전체 비율 = (이전 구간 개수 + 현재 구간 내 비율) / 전체 구간 개수
    const segCount = targets.length - 1; // 4칸이면 3개 구간
    return (i + segRatio) / segCount;
  };

  const progressPct = calcProgressPct(slots); // 0~1

  const PILL = 44; // StepPill 아이콘 박스 높이
  const LINE_H = 8; // h-2 = 8px
  const LINE_TOP = PILL / 2 - LINE_H / 2;

  return (
    <View
      className="bg-white rounded-2xl px-4 py-4 mt-4 shadow-md"
      style={{ elevation: 4 }}
    >
      {/* 타이틀 */}
      <View className="flex-row items-center mb-3">
        <View className="mr-1">{icon}</View>
        <Text className="text-xl font-sf-b text-black">{title}</Text>
        {unit === "kg" && <Text className="text-[#D1D5DB] ml-1">(kg)</Text>}
      </View>

      {/* 바 모드(출석) */}
      {simpleBar ? (
        <View className="w-full mt-1">
          <View className="h-4 bg-[#D1D5DB] rounded-full overflow-hidden">
            <View
              className="h-4 bg-[#065A93] rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (Number(slots?.[0]?.progress ?? 0) /
                    Math.max(
                      1,
                      Number(slots?.[slots.length - 1]?.target ?? 0)
                    )) *
                    100
                )}%`,
              }}
            />
          </View>
          <Text className="mt-2 text-[#0C092A] font-bold">
            {Number(slots?.[0]?.progress ?? 0)}/
            {Number(slots?.[slots?.length - 1]?.target ?? 0)}
          </Text>
        </View>
      ) : (
        // 스텝 4칸
        <View className="mt-1 relative">
          {/* 연결 라인: 원형 중심까지만 그리기 (양쪽 32px 잘라내기) */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: LINE_TOP,
              zIndex: 0,
            }}
          >
            {/* 회색 베이스 라인 */}
            <View className="h-2 bg-[#E5E7EB] rounded-full mx-8" />
            {/* 진행 라인 (구간 기반 퍼센트 반영) */}
            <View
              className="h-2 rounded-full mx-8 -mt-2"
              style={{
                width: `${Math.max(0, Math.min(1, progressPct)) * 100}%`,
                backgroundColor: accent === "yellow" ? "#FDE68A" : "#A7F3D0",
              }}
            />
          </View>

          {/* 스텝(아이콘/버튼) */}
          <View className="flex-row justify-between" style={{ zIndex: 2 }}>
            {slots?.map((slot, idx) => (
              <StepPill key={idx} slot={slot} onClaim={onClaim} unit={unit} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
