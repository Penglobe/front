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
    return "진행 중";
  }, [claimed, claimable, blocked]);

  const canPress = claimable && !claimed;

  // ✅ 미션별 성공 배경 매핑
  const successBgByMetric = {
    WALK_CO2_KG: Images.SuccessWalk,
    DIET_CO2_KG: Images.SuccessDiet, // 없으면 Images.SuccessWalk로 대체 가능
  };
  const Bg = claimed
    ? successBgByMetric[metric] || Images.SuccessWalk // claimed이면 성공 배경
    : Images.Target; // 기본 배경

  return (
    <View className="items-center w-[22%]">
      {/* 원형 타겟 배경 */}
      <View className="relative w-[44px] h-[44px] items-center justify-center">
        <Bg width={55} height={55} />
        {!claimed && (
          <Text className="absolute font-sf-b text-[14px] text-black">
            {target}
          </Text>
        )}
      </View>

      {/* 상태 텍스트 */}
      <Text className="mt-1 text-[11px] text-[#374151]">{statusText}</Text>

      {/* 보상 / 버튼 */}
      {claimed ? (
        <Text className="mt-1 text-[11px] text-[#6B7280]">+{rewardPoints}</Text>
      ) : (
        <Pressable
          disabled={!canPress}
          onPress={() => onClaim(metric, target)}
          className={[
            "mt-2 rounded-lg py-2 px-3 items-center",
            canPress ? "bg-[#10B981]" : "bg-[#D1D5DB]",
          ].join(" ")}
        >
          <Text className="text-white font-bold text-xs">받기</Text>
        </Pressable>
      )}
    </View>
  );
}
