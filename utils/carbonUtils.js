// utils/scoreUtils.js

// 총 탄소 절감량 계산
export function getTotalScore(user, counters) {
  const val =
    user?.totalScore ??
    user?.total_score ??
    counters?.totalScore ??
    counters?.total_score;

  if (val != null) return Number(val);

  const distance = Number(
    counters?.totalDistanceCo2Kg ?? counters?.total_distance_co2_kg ?? 0
  );
  const diet = Number(
    counters?.totalDietCo2Kg ?? counters?.total_diet_co2_kg ?? 0
  );
  const survey = Number(
    counters?.totalSurveyCo2Kg ?? counters?.total_survey_co2_kg ?? 0
  );

  return distance + diet + survey;
}
