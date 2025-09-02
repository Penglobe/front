import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Images } from "@constants/Images";

/**
 * slot: {
 *   metric, target, progress, rewardPoints,
 *   locked, claimable, claimed
 * }
 */
export default function StepPill({ slot, onClaim }) {
  const { metric, target, progress, rewardPoints, locked, claimable, claimed } =
    slot;

  const blocked = !claimed && !claimable && Number(progress) >= Number(target);
  const statusText = useMemo(() => {
    if (claimed) return "수령 완료";
    if (claimable) return "수령 가능";
    if (blocked) return "수령 가능";
    return "미달성";
  }, [claimed, claimable, blocked]);

  const canPress = claimable && !claimed;

  // 미션별 보상 배경 매핑
  const successBgByMetric = {
    WALK_CO2_KG: Images.SuccessWalk,
    DIET_CO2_KG: Images.SuccessDiet,
  };
  const Bg = claimed
    ? successBgByMetric[metric] || Images.SuccessWalk // claimed이면 보상 받은 배경
    : Images.Target; // 기본 배경

  const BOX = 44;
  const BG = 62;
  const ERASER = 53;
  const dx = 8;
  const dy = 7.5;

  const eraserLeft = (BOX - ERASER) / 2 + dx; // 중앙 + 보정
  const eraserTop = (BOX - ERASER) / 2 + dy;

  const numberColor = locked ? "#c6ccd8ff" : "#000000ff";

  return (
    <View
      className="items-center w-[22%]"
      style={{
        position: "relative",
        zIndex: 2,
        transform: [{ translateY: -9 }],
      }}
    >
      {/* 🎯 아이콘(가장 위 레이어) */}
      <Pressable
        onPress={() => canPress && onClaim(metric, target)}
        disabled={!canPress}
        className="relative items-center justify-center"
        style={({ pressed }) => [
          { width: BOX, height: BOX, borderRadius: BOX / 2, zIndex: 3 },
          locked && { opacity: 0.45 },
          pressed && canPress ? { transform: [{ scale: 0.96 }] } : null,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canPress }}
        accessibilityLabel={
          claimed
            ? "보상 수령 완료"
            : claimable
              ? `목표 ${target} 수령 가능`
              : blocked
                ? `목표 ${target} 수령 가능(이전 단계 먼저)`
                : `목표 ${target} 미달성`
        }
      >
        {/* ⬜️ 흰색 eraser: 선을 가리는 용도 (아이콘 뒤, 라인 앞) */}
        <View
          style={{
            position: "absolute",
            width: ERASER,
            height: ERASER,
            borderRadius: ERASER / 2,
            backgroundColor: "#FFFFFF",
            top: eraserTop,
            left: eraserLeft,
          }}
        />
        <Bg width={BG} height={BG} />
        {!claimed && (
          <Text
            className="absolute font-sf-b text-[14px]"
            style={{ color: numberColor }}
          >
            {target}
          </Text>
        )}
      </Pressable>

      {/* 상태 텍스트 */}
      <Text className="mt-1 text-[11px] font-sf-md text-[#374151]">
        {statusText}
      </Text>

      {/* 보상 표기(수령 완료만) */}
      {claimed && (
        <Text className="mt-1 text-[11px] text-[#6B7280]">+{rewardPoints}</Text>
      )}
    </View>
  );
}
